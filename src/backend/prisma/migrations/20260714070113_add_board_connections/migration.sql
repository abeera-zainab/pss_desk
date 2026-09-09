-- CreateTable
CREATE TABLE "BoardConnection" (
    "id" TEXT NOT NULL,
    "fromItemId" TEXT NOT NULL,
    "toItemId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardConnection_fromItemId_idx" ON "BoardConnection"("fromItemId");

-- CreateIndex
CREATE INDEX "BoardConnection_toItemId_idx" ON "BoardConnection"("toItemId");

-- AddForeignKey
ALTER TABLE "BoardConnection" ADD CONSTRAINT "BoardConnection_fromItemId_fkey" FOREIGN KEY ("fromItemId") REFERENCES "BoardItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardConnection" ADD CONSTRAINT "BoardConnection_toItemId_fkey" FOREIGN KEY ("toItemId") REFERENCES "BoardItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
