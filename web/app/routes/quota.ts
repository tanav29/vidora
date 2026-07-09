import { Hono } from "hono";

import db from "@/lib/db";
import { authMiddleware, requireAuth } from "@/lib/hono-auth";
import type { AuthVariables } from "@/lib/hono-auth";

const quota = new Hono<{ Variables: AuthVariables }>();

quota.use("*", authMiddleware);
quota.use("*", requireAuth);

quota.get("/", async (c) => {
  const user = c.get("user")!;

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      plan: true,
      monthlyUploadCount: true,
      uploadWindowStart: true,
    },
  });

  if (!dbUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const userLimits = dbUser.plan == "plus" ? 10 : 3;

  return c.json({
    cycleStart: dbUser.uploadWindowStart,
    uploads: dbUser.monthlyUploadCount,
    limit: userLimits,
    plan: dbUser.plan,
  });
});

export default quota;
