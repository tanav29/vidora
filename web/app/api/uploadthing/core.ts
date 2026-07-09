import { createUploadthing, type FileRouter, UTFiles } from "uploadthing/server";
import { auth } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  videoUploader: f(
    {
      video: {
        maxFileSize: "512MB",
        maxFileCount: 1,
      },
    },
    {
      awaitServerData: true,
    },
  )
    .middleware(async ({ files, req }) => {
      const h = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) h.set(key, Array.isArray(value) ? value.join(", ") : value);
      }

      const session = await auth.api.getSession({ headers: h });

      if (!session?.user?.id) throw new Error("Unauthorized");

      const videoId = h.get("x-video-id");
      if (!videoId) throw new Error("Missing video id");

      const ext = files[0].name.split(".").pop();
      const overrides = files.map((f) => ({
        ...f,
        customId: `tmp/${videoId}.${ext}`,
      }));

      return { videoId, [UTFiles]: overrides };
    })
    .onUploadComplete(({ file, metadata }) => {
      return { key: file.key, videoId: metadata.videoId };
    }),

  thumbnailUploader: f(
    {
      image: {
        maxFileSize: "4MB",
        maxFileCount: 1,
      },
    },
    {
      awaitServerData: true,
    },
  )
    .middleware(async ({ files, req }) => {
      const h = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) h.set(key, Array.isArray(value) ? value.join(", ") : value);
      }

      const session = await auth.api.getSession({ headers: h });

      if (!session?.user?.id) throw new Error("Unauthorized");

      const videoId = h.get("x-video-id");
      if (!videoId) throw new Error("Missing video id");

      const overrides = files.map((f) => ({
        ...f,
        customId: `thumbnails/${videoId}.jpg`,
      }));

      return { videoId, [UTFiles]: overrides };
    })
    .onUploadComplete(({ file, metadata }) => {
      return { url: file.ufsUrl, videoId: metadata.videoId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
