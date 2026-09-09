/*
  Warnings:

  - You are about to drop the column `label` on the `BoardItem` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `BoardItem` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `BoardItem` table. All the data in the column will be lost.
  - Made the column `fileId` on table `BoardItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BoardItem" DROP COLUMN "label",
DROP COLUMN "type",
DROP COLUMN "url",
ALTER COLUMN "fileId" SET NOT NULL;
