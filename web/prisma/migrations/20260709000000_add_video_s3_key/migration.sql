-- Store the S3 object key for each uploaded video
ALTER TABLE "Video"
ADD COLUMN "s3Key" TEXT;

CREATE UNIQUE INDEX "Video_s3Key_key" ON "Video"("s3Key");
