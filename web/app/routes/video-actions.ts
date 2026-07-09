import { Hono } from "hono";

import db from "@/lib/db";
import { getPlaybackUrl } from "@/lib/video-urls";

const videoActions = new Hono();

videoActions.post("/:id/like", async (c) => {
  const id = c.req.param("id");

  const video = await db.video.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!video) {
    return c.json({ error: "Not found" }, 404);
  }

  const updated = await db.video.update({
    where: { id },
    data: { likes: { increment: 1 } },
    select: { likes: true },
  });

  return c.json({ likes: updated.likes });
});

videoActions.post("/:id/view", async (c) => {
  const id = c.req.param("id");

  const video = await db.video.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!video) {
    return c.json({ error: "Not found" }, 404);
  }

  await db.video.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  return c.json({ ok: true });
});

videoActions.get("/:id/share", async (c) => {
  const id = c.req.param("id");

  const video = await db.video.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!video) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    watchUrl: `/w/${id}`,
    streamUrl: video.status === "done" ? getPlaybackUrl(id) : "",
  });
});

export default videoActions;
