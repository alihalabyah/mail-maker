-- CreateDomain table
CREATE TABLE public."Domain" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "isDefault" boolean NOT NULL DEFAULT false,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."Domain" OWNER TO mailmaker;

-- Create unique index on Domain name
CREATE UNIQUE INDEX "Domain_name_key" ON public."Domain"(name);

-- Add domainId column to Template
ALTER TABLE public."Template" ADD COLUMN "domainId" text;

-- Add foreign key constraint for Template
ALTER TABLE public."Template" ADD CONSTRAINT "Template_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old unique constraint and add new one with domainId
ALTER TABLE public."Template" DROP CONSTRAINT IF EXISTS "Template_baseSlug_locale_key";
ALTER TABLE public."Template" ADD CONSTRAINT "Template_baseSlug_locale_domainId_key" UNIQUE ("baseSlug", "locale", "domainId");

-- Add domainId column to Component
ALTER TABLE public."Component" ADD COLUMN "domainId" text;

-- Add foreign key constraint for Component
ALTER TABLE public."Component" ADD CONSTRAINT "Component_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old unique constraint and add new one with domainId
ALTER TABLE public."Component" DROP CONSTRAINT IF EXISTS "Component_slug_key";
ALTER TABLE public."Component" ADD CONSTRAINT "Component_slug_domainId_key" UNIQUE ("slug", "domainId");

-- Insert default prod domain
INSERT INTO public."Domain" ("id", "name", "description", "isDefault", "createdAt", "updatedAt")
VALUES ('clq0proddefault001', 'prod', 'Production environment', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
