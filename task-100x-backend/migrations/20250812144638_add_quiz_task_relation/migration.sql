-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'QUIZ';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "quizId" TEXT,
ALTER COLUMN "resourceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
