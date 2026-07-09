import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { publishJob } from "@/lib/queue";
import { getUploadQuota } from "@/lib/upload-quota";
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

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body;
  try {
    const json = await req.json();
    body = uploadSchema.parse(json);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request", issues: error },
      { status: 400 },
    );
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

      // check
      const thityDaysLater = new Date();
      thityDaysLater.setDate(thityDaysLater.getDate() + 30);

      const current = new Date();

      const userLimits = user.plan == "plus" ? 10 : 3;

      if (current >= thityDaysLater) {
        // today is beyond the users cycle
        // start the month cycle and upload count
        await tx.user.update({
          where: {
            id: session.user.id,
          },
          data: {
            uploadWindowStart: current,
            monthlyUploadCount: 1,
          },
        });
      } else {
        // today is inside user cycle
        if (user.monthlyUploadCount < userLimits) {
          // do
          // increase the monthly count
          await tx.user.update({
            where: {
              id: session.user.id,
            },
            data: {
              monthlyUploadCount: {
                increment: 1,
              },
            },
          });
        } else {
          return NextResponse.json(
            {
              error: "Monthly upload limit reached",
              plan: user.plan,
              limit: userLimits,
              used: user.monthlyUploadCount,
            },
            { status: 429 },
          );
        }
      }

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
    return NextResponse.json(
      { error: "Failed to create video record" },
      { status: 500 },
    );
  }

  try {
    // TODO: add configs
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
