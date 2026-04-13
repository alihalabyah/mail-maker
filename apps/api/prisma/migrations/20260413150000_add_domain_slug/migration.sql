-- Add slug column to Domain with a default derived from name for existing rows
ALTER TABLE "Domain" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- Backfill slug from name for existing rows
UPDATE "Domain" SET "slug" = LOWER(REPLACE(REPLACE(name, ' ', '-'), '_', '-')) WHERE "slug" = '';

-- Drop the default
ALTER TABLE "Domain" ALTER COLUMN "slug" DROP DEFAULT;

-- Add unique constraint
CREATE UNIQUE INDEX "Domain_slug_key" ON "Domain"("slug");
