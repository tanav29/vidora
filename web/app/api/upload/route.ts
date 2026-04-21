import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { redis } from "@/lib/redis";
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
    await db.video.create({
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
  } catch (error) {
    console.error("Database error:", error);
  }

  try {
    await redis.rpush(
      "video-queue",
      JSON.stringify({ name: id, ext: extension, attempts: 0 }),
    );
  } catch (error) {
    console.error("Redis error:", error);
  }

  return new NextResponse("ok");
}
