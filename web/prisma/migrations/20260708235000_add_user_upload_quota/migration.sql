-- Add monthly upload quota fields to users
ALTER TABLE "User"
ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "monthlyUploadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "uploadWindowStart" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW();
