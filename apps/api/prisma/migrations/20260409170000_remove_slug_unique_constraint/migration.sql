-- Drop unique constraint on Template.slug if it exists
DO $$ BEGIN
    ALTER TABLE "Template" DROP CONSTRAINT "Template_slug_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
