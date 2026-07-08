import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { publishJob } from "@/lib/queue";
import { getCurrentMonthStart, getUploadQuota } from "@/lib/upload-quota";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const uploadSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(10_000).optional().default(""),
  id: z.string().trim().min(1),
  extension: z.enum(["mp4", "mov", "avi", "mkv", "webm"]),
  thumbnailUrl: z.string().url().optional().nullable(),
});

type UploadInput = z.infer<typeof uploadSchema>;

class UploadQuotaError extends Error {
  quota: {
    plan: "free" | "premium";
    limit: number;
    used: number;
    remaining: number;
    resetAt: Date;
  };

  constructor(quota: UploadQuotaError["quota"]) {
    super("Monthly upload limit reached");
    this.quota = quota;
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: UploadInput;
  try {
    const json = await req.json();
    body = uploadSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, id, extension } = body;

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: {
          plan: true,
          monthlyUploadCount: true,
          uploadWindowStart: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const monthStart = getCurrentMonthStart();
      const effectiveWindowStart =
        user.uploadWindowStart < monthStart ? monthStart : user.uploadWindowStart;
      const effectiveUsed =
        user.uploadWindowStart < monthStart ? 0 : user.monthlyUploadCount;
      const quota = getUploadQuota({
        plan: user.plan,
        monthlyUploadCount: effectiveUsed,
        uploadWindowStart: effectiveWindowStart,
      });

      if (quota.remaining <= 0) {
        throw new UploadQuotaError(quota);
      }

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          monthlyUploadCount: effectiveUsed + 1,
          uploadWindowStart: effectiveWindowStart,
        },
      });

      await tx.video.create({
        data: {
          id,
          title,
          description,
          extension,
          likes: 0,
          thumbnail: "https://picsum.photos/720/1280",
          userId: session.user.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof UploadQuotaError) {
      return NextResponse.json(
        {
          error: "Monthly upload limit reached",
          plan: error.quota.plan,
          limit: error.quota.limit,
          used: error.quota.used,
          remaining: error.quota.remaining,
        },
        { status: 429 },
      );
    }

    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to create video record" },
      { status: 500 },
    );
  }

  try {
    await publishJob({ name: id, ext: extension });
  } catch (error) {
    console.error("Queue publish error:", error);

    await db.video.update({
      where: { id },
      data: {
        status: "failed",
      },
    });

    return NextResponse.json(
      { error: "Upload saved, but transcoding could not be queued" },
      { status: 503 },
    );
  }

  return new NextResponse("ok");
}
