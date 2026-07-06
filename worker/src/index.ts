import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import axios from "axios";
import { pipeline } from "stream/promises";
import { UTApi } from "uploadthing/server";
import { MAX_RETRIES, drainDueRetries, popJob, scheduleRetry } from "./queue.js";

dotenv.config();

const utapi = new UTApi();

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const tmpDir = "tmp";

interface Resolution {
  name: string;
  height: number;
  bitrate: string;
}

const resolutions: Resolution[] = [
  { name: "240p", height: 240, bitrate: "400k" },
  { name: "480p", height: 480, bitrate: "800k" },
  { name: "720p", height: 720, bitrate: "1400k" },
  { name: "1080p", height: 1080, bitrate: "2800k" },
];

async function encodeResolution(
  inputPath: string,
  outputDir: string,
  resolution: Resolution,
) {
  return new Promise<void>((resolve, reject) => {
    const playlistPath = path.join(outputDir, `${resolution.name}.m3u8`);
    const segmentPattern = path.join(outputDir, `${resolution.name}_%03d.ts`);

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vf",
      `scale=-2:${resolution.height}`,
      "-c:v",
      "libx264",
      "-b:v",
      resolution.bitrate,
      "-maxrate",
      resolution.bitrate,
      "-bufsize",
      `${parseInt(resolution.bitrate) * 2}k`,
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-hls_time",
      "10",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_filename",
      segmentPattern,
      "-start_number",
      "0",
      playlistPath,
    ]);

    ffmpeg.on("error", (err) => reject(new Error(`ffmpeg exited with error: ${err}`)));
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function generateThumbnail(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vf",
      "select=eq(n\\,0)",
      "-q:v",
      "3",
      "-frames:v",
      "1",
      outputPath,
    ]);

    ffmpeg.on("error", (err) => reject(new Error(`ffmpeg thumbnail error: ${err}`)));
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg thumbnail exited with code ${code}`));
    });
  });
}

const SPRITE_THUMB_WIDTH = 160;
const SPRITE_THUMB_INTERVAL = 5;
const SPRITE_COLUMNS = 10;

function getVideoDuration(inputPath: string): number {
  const result = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
    { encoding: "utf-8" },
  ).trim();
  return parseFloat(result);
}

async function generateThumbnailSprites(
  inputPath: string,
  outputDir: string,
): Promise<{ vttPath: string; spritePaths: string[] }> {
  const duration = getVideoDuration(inputPath);
  const totalFrames = Math.ceil(duration / SPRITE_THUMB_INTERVAL);
  const rows = Math.ceil(totalFrames / SPRITE_COLUMNS);
  const thumbHeight = Math.round(SPRITE_THUMB_WIDTH * (9 / 16));

  console.log(
    `> Generating ${totalFrames} thumbnails (${SPRITE_COLUMNS}x${rows} grid, ${SPRITE_THUMB_WIDTH}x${thumbHeight}px each)...`,
  );

  const spriteDir = path.join(outputDir, "sprites");
  fs.mkdirSync(spriteDir, { recursive: true });

  const spritePaths: string[] = [];

  for (let sheetIndex = 0; sheetIndex < rows; sheetIndex++) {
    const spriteFile = `sprite_${String(sheetIndex).padStart(3, "0")}.jpg`;
    const spritePath = path.join(spriteDir, spriteFile);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-vf",
        `fps=1/${SPRITE_THUMB_INTERVAL},scale=${SPRITE_THUMB_WIDTH}:${thumbHeight}:force_original_aspect_ratio=decrease,pad=${SPRITE_THUMB_WIDTH}:${thumbHeight}:(ow-iw)/2:(oh-ih)/2,tile=${SPRITE_COLUMNS}x1`,
        "-q:v",
        "5",
        "-frames:v",
        "1",
        spritePath,
      ]);

      ffmpeg.on("error", (err) => reject(new Error(`ffmpeg sprite error: ${err}`)));
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg sprite exited with code ${code}`));
      });
    });

    spritePaths.push(spritePath);
  }

  const vttLines = ["WEBVTT", ""];
  for (let i = 0; i < totalFrames; i++) {
    const sheetIndex = Math.floor(i / SPRITE_COLUMNS);
    const col = i % SPRITE_COLUMNS;
    const startTime = i * SPRITE_THUMB_INTERVAL;
    const endTime = Math.min(startTime + SPRITE_THUMB_INTERVAL, duration);

    const startStr = formatVttTime(startTime);
    const endStr = formatVttTime(endTime);
    const x = col * SPRITE_THUMB_WIDTH;
    const spriteFile = `sprite_${String(sheetIndex).padStart(3, "0")}.jpg`;

    vttLines.push(`${startStr} --> ${endStr}`);
    vttLines.push(`${spriteFile}#xywh=${x},0,${SPRITE_THUMB_WIDTH},${thumbHeight}`);
    vttLines.push("");
  }

  const vttPath = path.join(outputDir, "thumbnails.vtt");
  fs.writeFileSync(vttPath, vttLines.join("\n"));

  return { vttPath, spritePaths };
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0") +
    "." +
    String(ms).padStart(3, "0")
  );
}

function createMasterPlaylist(outputDir: string) {
  const masterPath = path.join(outputDir, "index.m3u8");
  let content = "#EXTM3U\n#EXT-X-VERSION:3\n";

  resolutions.forEach((res) => {
    const bandwidth = parseInt(res.bitrate) * 1000;
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=1920x${res.height}\n`;
    content += `${res.name}.m3u8\n`;
  });

  fs.writeFileSync(masterPath, content);
}

export async function downloadUploadThing(url: string, outPath: string) {
  console.log("> Downloading video...");

  const tempPath = `${outPath}.tmp`;

  let response;
  try {
    response = await axios.get(url, {
      responseType: "stream",
      timeout: 30_000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
      headers: {
        "User-Agent": "node-worker",
        Accept: "*/*",
      },
    });
  } catch (err: any) {
    throw new Error(`Download request failed: ${err.message}`);
  }

  const contentType = response.headers["content-type"] || "";
  if (contentType.includes("text/html")) {
    throw new Error("Download failed: received HTML instead of file");
  }

  try {
    await pipeline(response.data, fs.createWriteStream(tempPath));
  } catch (err: any) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw new Error(`Stream write failed: ${err.message}`);
  }

  if (!fs.existsSync(tempPath)) {
    throw new Error("Download failed: file not created");
  }

  const stats = fs.statSync(tempPath);
  if (stats.size === 0) {
    fs.unlinkSync(tempPath);
    throw new Error("Downloaded file is empty");
  }

  fs.renameSync(tempPath, outPath);
  console.log(`> Downloaded video ${stats.size} bytes to ${outPath}`);
}

async function uploadToR2(
  filePath: string,
  key: string,
  contentType: string,
  retries = 3,
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fileStream = fs.createReadStream(filePath);
      await r2.send(
        new PutObjectCommand({
          Bucket: "yux-videos",
          Key: key,
          Body: fileStream,
          ContentType: contentType,
        }),
      );
      return;
    } catch (error) {
      console.error(`Upload attempt ${attempt}/${retries} failed for ${key}:`, error);
      if (attempt === retries) {
        throw new Error(`Failed to upload ${key} after ${retries} attempts`);
      }
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
}

function cleanup(paths: string[]) {
  console.log("> Cleaning up temporary files...");
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          fs.rmSync(p, { recursive: true });
        } else {
          fs.unlinkSync(p);
        }
      }
    } catch (err) {
      console.error(`Cleanup failed for ${p}:`, err);
    }
  }
}

interface Job {
  name: string;
  ext: string;
  attempts?: number;
}

async function reportStatus(
  jobId: string,
  status: JobStatus,
  progress?: number,
) {
  const nextProgress =
    progress ?? (status === "done" ? 100 : status === "pending" ? 0 : undefined);

  try {
    const headers = process.env.WORKER_SHARED_SECRET
      ? { "x-worker-secret": process.env.WORKER_SHARED_SECRET }
      : undefined;

    await axios.post(
      `${process.env.BACKEND_URL}/api/status/${jobId}`,
      { status, progress: nextProgress },
      headers ? { headers } : undefined,
    );
  } catch (error) {
    console.error("> Error posting status:", error);
  }
}

type JobStatus = "pending" | "processing" | "done" | "failed";

function parseJob(raw: string): Job | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "name" in parsed &&
      "ext" in parsed &&
      typeof parsed.name === "string" &&
      typeof parsed.ext === "string"
    ) {
      return {
        name: parsed.name,
        ext: parsed.ext,
        attempts:
          typeof (parsed as { attempts?: unknown }).attempts === "number" &&
          Number.isFinite((parsed as { attempts?: number }).attempts ?? NaN)
            ? (parsed as { attempts: number }).attempts
            : 0,
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function processJob(job: Job) {
  const { name, ext } = job;

  const url = `https://odr537djvh.ufs.sh/f/tmp/${name}.${ext}`;
  const inputPath = path.join(tmpDir, `${name}.${ext}`);
  const outputDir = path.join(tmpDir, name);
  const thumbnailPath = path.join(tmpDir, `${name}_thumb.jpg`);

  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    await downloadUploadThing(url, inputPath);
    await reportStatus(name, "processing", 10);

    console.log("> Generating thumbnail...");
    await generateThumbnail(inputPath, thumbnailPath);
    await reportStatus(name, "processing", 15);

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    fs.mkdirSync(outputDir, { recursive: true });

    for (const resolution of resolutions) {
      console.log(`> Encoding ${resolution.name}...`);
      await encodeResolution(inputPath, outputDir, resolution);
      const nextProgress = Math.min(
        75,
        15 +
          resolutions.findIndex((item) => item.name === resolution.name) * 15 +
          15,
      );
      await reportStatus(name, "processing", nextProgress);
    }

    createMasterPlaylist(outputDir);
    await reportStatus(name, "processing", 78);

    console.log("> Generating thumbnail sprites...");
    const { vttPath, spritePaths } = await generateThumbnailSprites(
      inputPath,
      outputDir,
    );
    await reportStatus(name, "processing", 85);

    fs.unlinkSync(inputPath);

    console.log("> Uploading to R2...");
    try {
      const files = fs.readdirSync(outputDir).filter((f) => !f.startsWith("sprites"));
      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const contentType = file.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : file.endsWith(".vtt")
            ? "text/vtt"
            : "video/mp2t";

        await uploadToR2(filePath, `${name}/${file}`, contentType);
      }

      for (const spritePath of spritePaths) {
        const spriteFile = path.basename(spritePath);
        await uploadToR2(spritePath, `${name}/sprites/${spriteFile}`, "image/jpeg");
      }

      await uploadToR2(thumbnailPath, `${name}/thumb.jpg`, "image/jpeg");
      fs.unlinkSync(thumbnailPath);
      fs.rmSync(outputDir, { recursive: true });
      await reportStatus(name, "done", 100);
      await utapi.deleteFiles(`tmp/${name}.${ext}`);
    } catch (error) {
      console.error(`Error uploading to R2:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error processing ${name}:`, error);
    const spriteDir = path.join(outputDir, "sprites");
    cleanup([inputPath, outputDir, thumbnailPath, spriteDir]);
    throw error;
  }
}

async function startWorker() {
  console.log("Worker waiting for jobs...");

  while (true) {
    await drainDueRetries();

    const raw = await popJob();
    if (!raw) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    const job = parseJob(raw);
    if (!job) {
      continue;
    }

    console.log("Received:", job.name);

    try {
      await processJob(job);
      console.log("Job processed:", job.name);
    } catch (err) {
      const attempts = job.attempts ?? 0;
      console.error(
        `Job ${job.name} failed (attempt ${attempts + 1}/${MAX_RETRIES}):`,
        err,
      );

      if (attempts < MAX_RETRIES) {
        await scheduleRetry({ ...job, attempts: attempts + 1 });
      } else {
        await reportStatus(job.name, "failed");
        console.error(`Job ${job.name} exhausted retries.`);
      }
    }
  }
}

startWorker();
