-- Step 1: Add new columns to Template (without FK constraint first)
ALTER TABLE "Template" ADD COLUMN "baseSlug" TEXT;
ALTER TABLE "Template" ADD COLUMN "locale" TEXT DEFAULT 'en';
ALTER TABLE "Template" ADD COLUMN "status" TEXT DEFAULT 'draft';
ALTER TABLE "Template" ADD COLUMN "currentVersionId" TEXT;

-- Step 2: Backfill baseSlug from existing slug values
UPDATE "Template" SET "baseSlug" = "slug";

-- Step 3: Create TemplateVersion table
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "htmlTemplate" TEXT NOT NULL,
    "designJson" JSONB NOT NULL,
    "subject" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT NOT NULL,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- Step 4: Add foreign key constraints for TemplateVersion
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Create unique constraint on templateId + version
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_version_key" UNIQUE ("templateId", "version");

-- Step 6: Create unique constraint on baseSlug + locale for Template
ALTER TABLE "Template" ADD CONSTRAINT "Template_baseSlug_locale_key" UNIQUE ("baseSlug", "locale");

-- Step 7: Add foreign key constraint for currentVersionId (now that TemplateVersion exists)
ALTER TABLE "Template" ADD CONSTRAINT "Template_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "TemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
