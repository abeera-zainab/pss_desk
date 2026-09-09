-- AlterTable
ALTER TABLE "User" ADD COLUMN     "domains" "TaskType"[] DEFAULT ARRAY[]::"TaskType"[];
