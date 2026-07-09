/*
  Warnings:

  - You are about to drop the column `extension` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `Video` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Video_s3Key_key";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "extension",
DROP COLUMN "thumbnail";
