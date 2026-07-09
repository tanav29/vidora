import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import db from "@/lib/db";
import { redis } from "@/lib/redis";
import { authMiddleware, requireAuth } from "@/lib/hono-auth";
import type { AuthVariables } from "@/lib/hono-auth";

const workerStatusSchema = z.object({
  status: z.enum(["pending", "processing", "done", "failed"]),
  progress: z.number().int().min(0).max(100).optional(),
});

function isWorkerAuthorized(req: Request) {
  const secret = process.env.WORKER_SHARED_SECRET;
  if (!secret) return true;
  return req.headers.get("x-worker-secret") === secret;
}

const statusRoutes = new Hono<{ Variables: AuthVariables }>();

statusRoutes.get(
  "/:id",
  authMiddleware,
  requireAuth,
  async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");

    const video = await db.video.findFirst({
      where: { id, userId: user.id },
      select: { progress: true, status: true },
    });

    if (!video) {
      return c.json({ error: "Not found" }, 404);
    }

    const redisProgress = Number(await redis.get(`status:${id}`));
    const percent =
      Number.isFinite(redisProgress) && redisProgress > 0
        ? redisProgress
        : video.progress;

    return c.json({ percent, status: video.status });
  },
);

statusRoutes.post(
  "/:id",
  zValidator("json", workerStatusSchema),
  async (c) => {
    if (!isWorkerAuthorized(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const body = c.req.valid("json");

    const video = await db.video.findUnique({ where: { id } });
    if (!video) {
      return c.json({ error: "Not found" }, 404);
    }

    const progress =
      body.progress ??
      (body.status === "done" ? 100 : body.status === "failed" ? video.progress : 0);

    await db.video.update({
      where: { id },
      data: { status: body.status, progress },
    });

    await redis.set(`status:${id}`, progress, { ex: 60 * 60 * 24 });

    return c.json({ ok: true });
  },
);

export default statusRoutes;
