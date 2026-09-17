-- AlterTable
ALTER TABLE "User" ADD COLUMN "loginNo" TEXT;

WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS n
  FROM "User"
)
UPDATE "User" u
SET "loginNo" = 'PSS-' || lpad(numbered.n::text, 4, '0')
FROM numbered
WHERE u.id = numbered.id AND u."loginNo" IS NULL;

INSERT INTO "Counter" ("key", "value")
SELECT 'user_login_no', COUNT(*)::int FROM "User"
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

ALTER TABLE "User" ALTER COLUMN "loginNo" SET NOT NULL;
CREATE UNIQUE INDEX "User_loginNo_key" ON "User"("loginNo");
