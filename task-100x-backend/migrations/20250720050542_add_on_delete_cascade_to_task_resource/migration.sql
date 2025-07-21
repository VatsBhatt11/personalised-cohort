-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_resourceId_fkey";

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
