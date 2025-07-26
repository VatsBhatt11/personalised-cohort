/*
  Warnings:

  - You are about to drop the column `resourceId` on the `Quiz` table. All the data in the column will be lost.
  - Added the required column `cohortId` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weekNumber` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_resourceId_fkey";

-- DropIndex
DROP INDEX "Quiz_resourceId_key";

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "resourceId",
ADD COLUMN     "cohortId" TEXT NOT NULL,
ADD COLUMN     "weekNumber" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
