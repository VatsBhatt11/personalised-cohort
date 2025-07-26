-- DropForeignKey
ALTER TABLE "QuizAnswer" DROP CONSTRAINT "QuizAnswer_selectedOptionId_fkey";

-- AlterTable
ALTER TABLE "QuizAnswer" ADD COLUMN     "answerText" TEXT,
ALTER COLUMN "selectedOptionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;
