import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import axios from "axios";
import { execSync } from "child_process";
import { pipeline } from "stream/promises";

const tmpDir = "tmp";
const outputDir = "output";

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
  encodeOutputDir: string,
  resolution: Resolution,
) {
  return new Promise<void>((resolve, reject) => {
    const playlistPath = path.join(encodeOutputDir, `${resolution.name}.m3u8`);
    const segmentPattern = path.join(
      encodeOutputDir,
      `${resolution.name}_%03d.ts`,
    );

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

async function generateThumbnail(inputPath: string, thumbPath: string) {
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
      thumbPath,
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

      ffmpeg.on("error", (err) =>
        reject(new Error(`ffmpeg sprite error: ${err}`)),
      );
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

function createMasterPlaylist(dir: string) {
  const masterPath = path.join(dir, "index.m3u8");
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

function saveToOutput(
  name: string,
  encodeDir: string,
  thumbnailPath: string,
  spritePaths: string[],
) {
  const dest = path.join(outputDir, name);
  fs.mkdirSync(dest, { recursive: true });

  // Copy all HLS files
  const files = fs.readdirSync(encodeDir).filter((f) => !f.startsWith("sprites"));
  for (const file of files) {
    const src = path.join(encodeDir, file);
    fs.copyFileSync(src, path.join(dest, file));
    console.log(`> Saved ${file} -> ${path.join(dest, file)}`);
  }

  // Copy thumbnail sprites
  if (spritePaths.length > 0) {
    const spriteDest = path.join(dest, "sprites");
    fs.mkdirSync(spriteDest, { recursive: true });
    for (const spritePath of spritePaths) {
      const spriteFile = path.basename(spritePath);
      fs.copyFileSync(spritePath, path.join(spriteDest, spriteFile));
      console.log(`> Saved ${spriteFile} -> ${path.join(spriteDest, spriteFile)}`);
    }
  }

  // Copy thumbnail
  if (fs.existsSync(thumbnailPath)) {
    fs.copyFileSync(thumbnailPath, path.join(dest, "thumb.jpg"));
    console.log(`> Saved thumbnail -> ${path.join(dest, "thumb.jpg")}`);
  }

  console.log(`> All files saved to ${dest}`);
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

async function reportStatus(
  jobId: string,
  status: JobStatus,
  progress?: number,
) {
  const nextProgress =
    progress ??
    (status === "done" ? 100 : status === "pending" ? 0 : undefined);

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

async function processJob(job: Job) {
  const { name, ext } = job;

  const url = `https://odr537djvh.ufs.sh/f/tmp/${name}.${ext}`;
  const inputPath = path.join(tmpDir, `${name}.${ext}`);
  const encodeDir = path.join(tmpDir, name);
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

    // Create encode output directory
    fs.mkdirSync(encodeDir, { recursive: true });

    // Encode all resolutions
    for (const resolution of resolutions) {
      console.log(`> Encoding ${resolution.name}...`);
      await encodeResolution(inputPath, encodeDir, resolution);
      const nextProgress = Math.min(
        75,
        15 +
          resolutions.findIndex((item) => item.name === resolution.name) * 15 +
          15,
      );
      await reportStatus(name, "processing", nextProgress);
    }

    // Create master playlist
    createMasterPlaylist(encodeDir);
    await reportStatus(name, "processing", 78);

    // Generate thumbnail sprites for timeline preview
    console.log("> Generating thumbnail sprites...");
    const { vttPath, spritePaths } = await generateThumbnailSprites(
      inputPath,
      encodeDir,
    );
    await reportStatus(name, "processing", 85);

    // Delete input file after encoding
    fs.unlinkSync(inputPath);

    // Save all output files to the output folder
    console.log("> Saving files to output folder...");
    saveToOutput(name, encodeDir, thumbnailPath, spritePaths);

    // Clean up tmp encode dir and thumbnail
    const spriteDir = path.join(encodeDir, "sprites");
    cleanup([encodeDir, thumbnailPath, spriteDir]);

    await reportStatus(name, "done", 100);
    console.log(`> Done! Files available at ${path.join(outputDir, name)}`);
  } catch (error) {
    console.error(`Error processing ${name}:`, error);
    const spriteDir = path.join(encodeDir, "sprites");
    cleanup([inputPath, encodeDir, thumbnailPath, spriteDir]);
    throw error;
  }
}

async function main() {
  const {
    name,
    ext,
    attempts = 0,
  } = {
    name: "JmOcdb16ANfWazEO",
    ext: "mp4",
    attempts: 0,
  };

  try {
    if (!name || !ext) {
      return;
    }

    console.log("> Job found in queue:", name);
    console.log(`> Processing video: ${name}.${ext}`);
    await reportStatus(name, "processing", 0);
    await processJob({ name, ext, attempts });
    console.log("> Job processed", name);
  } catch (error) {
    console.log(`> Error processing ${name}:`, error);
  }
}

main();
