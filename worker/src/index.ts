import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";
import { S3Client } from "@aws-sdk/client-s3";
import { pipeline } from "stream/promises";
import { UTApi } from "uploadthing/server";

dotenv.config();

const redis = Redis.fromEnv();

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
  resolution: Resolution
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

    ffmpeg.on("error", (err) => {
      reject(new Error(`ffmpeg exited with error: ${err}`));
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
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
      outputPath
    ]);

    ffmpeg.on("error", (err) => {
      reject(new Error(`ffmpeg thumbnail error: ${err}`));
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg thumbnail exited with code ${code}`));
      }
    });
  });
}

function createMasterPlaylist(outputDir: string) {
  const masterPath = path.join(outputDir, "index.m3u8");
  let content = "#EXTM3U\n#EXT-X-VERSION:3\n";

  resolutions.forEach((res) => {
    const bandwidth = parseInt(res.bitrate) * 1000;
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=1920x${res.height}\n`;
    content += `${res.name}.m3u8\n`;
  });

  fs.writeFileSync(masterPath, content); // write to name/index.m3u8
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
  retries = 3
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
        })
      );
      // console.log(`Uploaded ${key}`);
      return;
    } catch (error) {
      console.error(
        `Upload attempt ${attempt}/${retries} failed for ${key}:`,
        error
      );
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

const STATUS_TTL_SECONDS = 60 * 60 * 24;
const MAX_ATTEMPTS = 3;

async function reportStatus(jobId: string, status: JobStatus, progress?: number) {
  const nextProgress = progress ?? (
    status === "done" ? 100 : status === "pending" ? 0 : undefined
  );

  if (nextProgress !== undefined) {
    await redis.set(`status:${jobId}`, nextProgress, {
      ex: STATUS_TTL_SECONDS,
    });
  }

  try {
    const headers = process.env.WORKER_SHARED_SECRET
      ? {
          "x-worker-secret": process.env.WORKER_SHARED_SECRET,
        }
      : undefined;

    await axios.post(
      `${process.env.BACKEND_URL}/api/status/${jobId}`,
      {
        status,
        progress: nextProgress,
      },
      headers ? { headers } : undefined
    );
  } catch (error) {
    console.error("> Error posting status:", error);
  }
}

type JobStatus = "pending" | "processing" | "done" | "failed";

function parseJob(rawJob: unknown): Job | null {
  if (!rawJob) {
    return null;
  }

  try {
    const parsed = typeof rawJob === "string" ? JSON.parse(rawJob) : rawJob;
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
          "attempts" in parsed && typeof parsed.attempts === "number"
            ? parsed.attempts
            : 0,
      };
    }
  } catch (error) {
    console.error("> Failed to parse job payload:", error);
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
    // Ensure tmp directory exists
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Download the video
    await downloadUploadThing(url, inputPath);
    await reportStatus(name, "processing", 10);

    // Generate thumbnail
    console.log("> Generating thumbnail...");
    await generateThumbnail(inputPath, thumbnailPath);
    await reportStatus(name, "processing", 15);

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // Encode all resolutions
    for (const resolution of resolutions) {
      console.log(`> Encoding ${resolution.name}...`);
      await encodeResolution(inputPath, outputDir, resolution);
      const nextProgress = Math.min(
        75,
        15 + resolutions.findIndex((item) => item.name === resolution.name) * 15 + 15
      );
      await reportStatus(name, "processing", nextProgress);
    }

    // Create master playlist
    createMasterPlaylist(outputDir);
    await reportStatus(name, "processing", 80);

    // Delete input file after encoding
    fs.unlinkSync(inputPath);

    console.log("> Uploading to R2...");
    try {
      // Upload the :name: folder to R2
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const contentType = file.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : "video/mp2t";

        await uploadToR2(filePath, `${name}/${file}`, contentType);
      }
      // Upload thumbnail
      await uploadToR2(thumbnailPath, `${name}/thumb.jpg`, "image/jpeg");
      // Delete local thumbnail
      fs.unlinkSync(thumbnailPath);
      // Delete the output folder
      fs.rmSync(outputDir, { recursive: true });
      await reportStatus(name, "done", 100);
      // Delete original from uploadthing
      await utapi.deleteFiles(`tmp/${name}.${ext}`);
    } catch (error) {
      console.error(`Error uploading to R2:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error processing ${name}:`, error);
    cleanup([inputPath, outputDir, thumbnailPath]);
    throw error;
  }
}

async function claimNextJob(): Promise<{ job: Job; index: number } | null> {
  const queueLen = await redis.llen("video-queue");
  if (queueLen === 0) return null;

  for (let i = 0; i < queueLen; i++) {
    const rawJob = await redis.lindex("video-queue", i);
    const job = parseJob(rawJob);
    if (job && (job.attempts ?? 0) < MAX_ATTEMPTS) {
      return { job, index: i };
    }
  }

  return null;
}

async function removeJob(index: number) {
  await redis.lrem("video-queue", 1, await redis.lindex("video-queue", index));
}

async function main() {
  const claimed = await claimNextJob();
  if (!claimed) {
    return;
  }

  const { job, index } = claimed;
  const { name, ext, attempts = 0 } = job;

  try {
    if (!name || !ext) {
      return;
    }

    console.log("> Job found in queue:", job);
    console.log(`> Processing video: ${name}.${ext}`);
    await reportStatus(name, "processing", 0);
    await processJob({ name, ext, attempts });
    await removeJob(index);
    console.log("> Job processed", job);
  } catch (error) {
    console.error("> Error processing job:", error);

    if (attempts + 1 < MAX_ATTEMPTS) {
      const nextAttemptJob = JSON.stringify({
        name,
        ext,
        attempts: attempts + 1,
      });
      await redis.rpush("video-queue", nextAttemptJob);
      await removeJob(index);
      await reportStatus(name, "pending", 0);
      console.log(`> Requeued ${name}.${ext} for retry ${attempts + 1}/${MAX_ATTEMPTS - 1}`);
      return;
    }

    await removeJob(index);
    await reportStatus(name, "failed");
  }
}

let running = false;

setInterval(async () => {
  if (running) {
    return;
  }
  const hasJobs = await redis.exists("video-queue");
  if (!hasJobs) return;

  running = true;
  try {
    await main();
  } catch (e) {
    console.error(e);
  } finally {
    running = false;
  }
}, 5_000);
