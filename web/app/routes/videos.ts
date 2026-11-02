import { Hono } from "hono";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import S3 from "@/lib/s3";
import { R2_BUCKET } from "@/lib/r2";
import { publishJob } from "@/lib/queue";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import db from "@/lib/db";
import { redis } from "@/lib/redis";
import { deleteRawVideo, deleteVideoAssets } from "@/lib/r2";
import { authMiddleware, requireAuth } from "@/lib/hono-auth";
import type { AuthVariables } from "@/lib/hono-auth";

const videos = new Hono<{ Variables: AuthVariables }>();

videos.use("*", authMiddleware);
videos.use("*", requireAuth);

videos.get("/", async (c) => {
  const user = c.get("user")!;

  const statusParam = c.req.query("status");
  const statuses = statusParam
    ? statusParam.split(",").map((v) => v.trim()).filter(Boolean)
    : [];

  const where = {
    userId: user.id,
    ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
  };

  const videos = await db.video.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return c.json(videos, {
    headers: { "Cache-Control": "private, no-store" },
  });
});

// The dashboard includes completed jobs so past failures remain visible.
videos.get("/jobs", async (c) => {
  const user = c.get("user")!;
  const jobs = await db.video.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, progress: true, createdAt: true,
      jobEvents: { orderBy: { createdAt: "desc" }, select: { id: true, kind: true, attempt: true, reason: true, createdAt: true } } },
  });
  return c.json(jobs, { headers: { "Cache-Control": "private, no-store" } });
});

videos.post("/:id/retry", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const video = await db.video.findFirst({ where: { id, userId: user.id } });
  if (!video) return c.json({ error: "Not found" }, 404);
  if (video.status !== "failed") return c.json({ error: "Only failed jobs can be retried" }, 409);
  const match = video.s3Key?.match(/^raw_videos\/([^/]+)\.(mp4|mov|avi|mkv|webm)$/i);
  if (!match || match[1] !== id) return c.json({ error: "The source file is unavailable for retry" }, 409);
  try {
    await S3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: video.s3Key! }));
  } catch (error) {
    console.error("Source check failed:", error);
    return c.json({ error: "Could not access the source file. Check storage and try again." }, 409);
  }
  // Claim before publishing so concurrent operator requests cannot queue duplicates.
  const claim = await db.video.updateMany({ where: { id, userId: user.id, status: "failed" }, data: { status: "pending", progress: 0 } });
  if (!claim.count) return c.json({ error: "This job is already being retried" }, 409);
  try {
    await redis.set(`status:${id}`, 0, { ex: 60 * 60 * 24 });
    await publishJob({ name: id, ext: match[2].toLowerCase(), resolutions: video.resolutions, attempts: 0, runId: crypto.randomUUID() });
  } catch (error) {
    console.error("Retry publish failed:", error);
    await db.video.updateMany({ where: { id, status: "pending" }, data: { status: "failed" } });
    return c.json({ error: "Could not queue the retry. Try again." }, 503);
  }
  await db.jobEvent.create({ data: { id: crypto.randomUUID(), videoId: id, kind: "retry" } });
  return c.json({ ok: true });
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(10_000).optional(),
});

videos.patch(
  "/:id",
  zValidator("json", updateSchema),
  async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const video = await db.video.findFirst({
      where: { id, userId: user.id },
    });

    if (!video) {
      return c.json({ error: "Not found" }, 404);
    }

    if (!body.title && body.description === undefined) {
      return c.json({ error: "No changes provided" }, 400);
    }

    const updated = await db.video.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
    });

    return c.json(updated);
  },
);

videos.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const video = await db.video.findFirst({
    where: { id, userId: user.id },
  });

  if (!video) {
    return c.json({ error: "Not found" }, 404);
  }

  await db.video.delete({ where: { id } });
  await redis.del(`status:${id}`);
  await deleteVideoAssets(id);
  await deleteRawVideo(video.s3Key);

  return c.json({ ok: true });
});

export default videos;
