import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import db from "@/lib/db";
import { publishJob } from "@/lib/queue";
import { authMiddleware, requireAuth } from "@/lib/hono-auth";
import type { AuthVariables } from "@/lib/hono-auth";

const upload = new Hono<{ Variables: AuthVariables }>();

upload.use("*", authMiddleware);
upload.use("*", requireAuth);

const uploadSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(10_000).optional().default(""),
  id: z.string().trim().min(1),
  extension: z.enum(["mp4", "mov", "avi", "mkv", "webm"]),
  s3Key: z.string().trim().min(1),
  thumbnailUrl: z.string().url().optional().nullable(),
});

upload.post(
  "/",
  zValidator("json", uploadSchema),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");
    const { title, description, id, extension, s3Key } = body;

    try {
      await db.$transaction(async (tx) => {
        const dbUser = await tx.user.findUnique({
          where: { id: user.id },
          select: {
            plan: true,
            monthlyUploadCount: true,
            uploadWindowStart: true,
          },
        });

        if (!dbUser) {
          throw new Error("User not found");
        }

        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const current = new Date();
        const userLimits = dbUser.plan == "plus" ? 10 : 3;

        if (current >= thirtyDaysLater) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              uploadWindowStart: current,
              monthlyUploadCount: 1,
            },
          });
        } else {
          if (dbUser.monthlyUploadCount < userLimits) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                monthlyUploadCount: { increment: 1 },
              },
            });
          } else {
            return c.json(
              {
                error: "Monthly upload limit reached",
                plan: dbUser.plan,
                limit: userLimits,
                used: dbUser.monthlyUploadCount,
              },
              429,
            );
          }
        }

        await tx.video.create({
          data: {
            id,
            title,
            description,
            s3Key,
            likes: 0,
            userId: user.id,
          },
        });
      });
    } catch (error) {
      return c.json({ error: "Failed to create video record" }, 500);
    }

    try {
      await publishJob({ name: id, ext: extension });
    } catch (error) {
      console.error("Queue publish error:", error);

      await db.video.update({
        where: { id },
        data: { status: "failed" },
      });

      return c.json(
        { error: "Upload saved, but transcoding could not be queued" },
        503,
      );
    }

    return c.text("ok");
  },
);

export default upload;
