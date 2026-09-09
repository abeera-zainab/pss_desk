/*
  Warnings:

  - Added the required column `caseId` to the `BoardItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BoardItem" ADD COLUMN     "caseId" TEXT NOT NULL,
ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE INDEX "BoardItem_caseId_idx" ON "BoardItem"("caseId");

-- AddForeignKey
ALTER TABLE "BoardItem" ADD CONSTRAINT "BoardItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
