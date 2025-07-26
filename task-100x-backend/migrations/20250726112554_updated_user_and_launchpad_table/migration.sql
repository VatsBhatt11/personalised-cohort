/*
  Warnings:

  - You are about to drop the column `email` on the `Launchpad` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Launchpad` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `Launchpad` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Launchpad" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phoneNumber";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdFrom" TEXT NOT NULL DEFAULT 'platform',
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phoneNumber" TEXT;
