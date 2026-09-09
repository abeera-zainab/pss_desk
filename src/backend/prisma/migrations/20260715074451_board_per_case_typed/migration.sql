-- CreateEnum
CREATE TYPE "BoardItemType" AS ENUM ('FILE', 'LINK', 'NOTE');

-- AlterTable
ALTER TABLE "BoardItem" ADD COLUMN     "label" TEXT,
ADD COLUMN     "type" "BoardItemType" NOT NULL DEFAULT 'FILE',
ADD COLUMN     "url" TEXT,
ALTER COLUMN "fileId" DROP NOT NULL;
