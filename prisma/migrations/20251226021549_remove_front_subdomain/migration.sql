-- DropIndex
DROP INDEX IF EXISTS "condominio_frontSubdomain_idx";

-- DropIndex
DROP INDEX IF EXISTS "condominio_frontSubdomain_key";

-- AlterTable
ALTER TABLE "condominio" DROP COLUMN IF EXISTS "frontSubdomain";
