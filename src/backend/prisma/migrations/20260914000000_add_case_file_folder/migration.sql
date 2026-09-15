-- CreateEnum
CREATE TYPE "CaseFileFolder" AS ENUM ('INITIAL_OSINT', 'LOCATION_ANALYSIS', 'THREAT_ALERT');

-- AlterTable
ALTER TABLE "File" ADD COLUMN "folder" "CaseFileFolder";

-- CreateIndex
CREATE INDEX "File_folder_idx" ON "File"("folder");
