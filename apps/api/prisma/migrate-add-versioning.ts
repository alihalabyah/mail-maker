import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.template.findMany();
  console.log(`Migrating ${templates.length} templates...`);

  for (const t of templates) {
    // Derive baseSlug: strip trailing "-ar" if present, else use slug as-is
    const baseSlug = t.slug.endsWith('-ar') ? t.slug.slice(0, -3) : t.slug;
    const locale = t.slug.endsWith('-ar') ? 'ar' : 'en';

    // Create v1 snapshot
    const version = await prisma.templateVersion.create({
      data: {
        templateId: t.id,
        version: 1,
        htmlTemplate: t.htmlTemplate,
        designJson: t.designJson as object,
        subject: t.subject,
        variables: t.variables as object,
        publishedById: t.createdById,
      },
    });

    // Update template
    await prisma.template.update({
      where: { id: t.id },
      data: {
        baseSlug,
        locale,
        status: 'published',
        currentVersionId: version.id,
      },
    });
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
