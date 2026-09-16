-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = lower(split_part("email", '@', 1))
WHERE "username" IS NULL;

WITH ranked AS (
  SELECT id, "username", row_number() OVER (PARTITION BY "username" ORDER BY "createdAt") AS rn
  FROM "User"
)
UPDATE "User" u
SET "username" = ranked."username" || '_' || substr(replace(u.id::text, '-', ''), 1, 6)
FROM ranked
WHERE u.id = ranked.id AND ranked.rn > 1;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
