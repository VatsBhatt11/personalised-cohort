/*
  Warnings:

  - Added the required column `status` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "lectureNumber" INTEGER NOT NULL DEFAULT 1;
