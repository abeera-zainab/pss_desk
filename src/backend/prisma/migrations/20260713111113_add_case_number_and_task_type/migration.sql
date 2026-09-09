/*
  Warnings:

  - A unique constraint covering the columns `[caseNumber]` on the table `Case` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referenceId]` on the table `Task` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `caseNumber` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referenceId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taskType` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FR', 'GEO_LOCATION', 'CYBER_INT');

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "caseNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "referenceId" TEXT NOT NULL,
ADD COLUMN     "taskType" "TaskType" NOT NULL;

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TaskLink" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskLink_taskId_idx" ON "TaskLink"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Task_referenceId_key" ON "Task"("referenceId");

-- CreateIndex
CREATE INDEX "Task_taskType_idx" ON "Task"("taskType");

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
