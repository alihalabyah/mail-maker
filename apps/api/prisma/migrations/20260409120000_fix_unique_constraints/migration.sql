-- Drop old unique constraint on Template (baseSlug, locale)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Template_baseSlug_locale_key'
    ) THEN
        ALTER TABLE "Template" DROP CONSTRAINT "Template_baseSlug_locale_key";
    END IF;
END $$;

-- Create new unique constraint on Template (baseSlug, locale, domainId)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Template_baseSlug_locale_domainId_key'
    ) THEN
        ALTER TABLE "Template" ADD CONSTRAINT "Template_baseSlug_locale_domainId_key" UNIQUE ("baseSlug", "locale", "domainId");
    END IF;
END $$;

-- Drop old unique constraint on Component (slug) if it exists without domainId
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Component_slug_key'
        AND conrelid = '"Component"'::regclass
    ) THEN
        -- Check if this constraint doesn't include domainId
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'Component_slug_domainId_key'
        ) THEN
            ALTER TABLE "Component" DROP CONSTRAINT "Component_slug_key";
            ALTER TABLE "Component" ADD CONSTRAINT "Component_slug_domainId_key" UNIQUE ("slug", "domainId");
        END IF;
    END IF;
END $$;
