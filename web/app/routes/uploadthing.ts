import { Hono } from "hono";
import { createRouteHandler } from "uploadthing/server";

import { ourFileRouter } from "@/app/api/uploadthing/core";

const handlers = createRouteHandler({
  router: ourFileRouter,
});

const uploadthingRoutes = new Hono();

uploadthingRoutes.all("/*", (c) => {
  return handlers(c.req.raw);
});

export default uploadthingRoutes;
