CREATE TABLE "JobEvent" (
  "id" TEXT NOT NULL, "videoId" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "attempt" INTEGER, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobEvent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "JobEvent_videoId_createdAt_idx" ON "JobEvent"("videoId", "createdAt");
