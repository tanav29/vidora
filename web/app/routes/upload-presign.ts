import { Hono } from "hono";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

async function buildPresignResponse(c: any, id: string, extension: string | null) {
  const parsedExtension = extensionSchema.safeParse(
    typeof extension === "string" ? extension.toLowerCase() : extension,
  );

  if (!parsedExtension.success) {
    return c.json(
      {
        error: "Missing or invalid extension. Use one of mp4, mov, avi, mkv, or webm.",
      },
      400,
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

  return c.json({ putUrl, key, contentType });
}

const uploadPresign = new Hono();

uploadPresign.get("/:id", async (c) => {
  const id = c.req.param("id");
  const extension = c.req.query("extension") ?? null;
  return buildPresignResponse(c, id, extension);
});

uploadPresign.post("/:id", async (c) => {
  const id = c.req.param("id");

  let extension: string | null = null;
  try {
    const body = await c.req.json<{ extension?: unknown }>();
    if (typeof body.extension === "string") {
      extension = body.extension;
    }
  } catch {
    // Ignore malformed bodies
  }

  return buildPresignResponse(c, id, extension);
});

export default uploadPresign;
