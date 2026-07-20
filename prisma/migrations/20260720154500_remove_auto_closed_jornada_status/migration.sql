/*
  Removes the never-written AUTO_CLOSED value from JornadaStatus.
  No code path ever set it; any stray row (manual edits) is folded into
  CLOSED before the enum is rebuilt, since Postgres cannot drop a value
  from an existing enum type in place.
*/

-- Safety net: fold any stray AUTO_CLOSED rows into CLOSED.
UPDATE "jornada" SET "status" = 'CLOSED' WHERE "status" = 'AUTO_CLOSED';

BEGIN;

CREATE TYPE "JornadaStatus_new" AS ENUM ('OPEN', 'CLOSED');
ALTER TABLE "jornada" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "jornada" ALTER COLUMN "status" TYPE "JornadaStatus_new" USING ("status"::text::"JornadaStatus_new");
ALTER TYPE "JornadaStatus" RENAME TO "JornadaStatus_old";
ALTER TYPE "JornadaStatus_new" RENAME TO "JornadaStatus";
DROP TYPE "JornadaStatus_old";
ALTER TABLE "jornada" ALTER COLUMN "status" SET DEFAULT 'OPEN';

COMMIT;
