-- AlterTable
ALTER TABLE "Streak" ADD COLUMN     "weeklyStreak" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assignedDate" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3);
