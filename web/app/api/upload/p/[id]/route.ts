import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";

import S3 from "@/lib/s3";

const extensionSchema = z.enum(["mp4", "mov", "avi", "mkv", "webm"]);

const CONTENT_TYPES: Record<z.infer<typeof extensionSchema>, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  webm: "video/webm",
};

async function buildPresignResponse(id: string, extension: string | null) {
  const parsedExtension = extensionSchema.safeParse(
    typeof extension === "string" ? extension.toLowerCase() : extension,
  );

  if (!parsedExtension.success) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid extension. Use one of mp4, mov, avi, mkv, or webm.",
      },
      { status: 400 },
    );
  }

  const key = `raw/${id}.${parsedExtension.data}`;
  const contentType = CONTENT_TYPES[parsedExtension.data];
  const putUrl = await getSignedUrl(
    S3,
    new PutObjectCommand({
      Bucket: "yux-videos",
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 5 * 3600 },
  );

  return NextResponse.json({
    putUrl,
    key,
    contentType,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  return buildPresignResponse(id, url.searchParams.get("extension"));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let extension: string | null = null;

  try {
    const body = (await request.json()) as { extension?: unknown };
    if (typeof body.extension === "string") {
      extension = body.extension;
    }
  } catch {
    // Ignore malformed bodies and fall back to validation below.
  }

  return buildPresignResponse(id, extension);
}
