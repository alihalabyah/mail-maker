import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLockedComponents() {
  console.log('🔧 Fixing locked shared components in templates...');

  const templates = await prisma.template.findMany({
    select: { id: true, name: true, designJson: true },
  });

  let fixedCount = 0;

  for (const template of templates) {
    if (!template.designJson) continue;

    const design = template.designJson as Record<string, unknown>;
    const body = design.body as Record<string, unknown> | undefined;
    const rows = (body?.rows as unknown[]) ?? [];

    if (rows.length === 0) continue;

    let hasChanges = false;
    const fixedRows = rows.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      const values = r.values as Record<string, unknown> | undefined;

      // Remove locked property
      if (values?.locked === true) {
        console.log(`  ✓ Unlocking component in "${template.name}"`);
        hasChanges = true;
        const newValues = { ...values };
        delete newValues.locked;
        return { ...r, values: newValues };
      }

      // Remove padding from row level
      if (values && (values.paddingTop || values.paddingBottom || values.paddingLeft || values.paddingRight)) {
        hasChanges = true;
        const newValues = { ...values };
        delete newValues.paddingTop;
        delete newValues.paddingBottom;
        delete newValues.paddingLeft;
        delete newValues.paddingRight;
        return { ...r, values: newValues };
      }

      // Remove padding from column level
      const columns = r.columns as unknown[];
      if (columns && columns.length > 0) {
        const fixedColumns = columns.map((col: unknown) => {
          const c = col as Record<string, unknown>;
          const colValues = c.values as Record<string, unknown> | undefined;

          if (colValues && (colValues.paddingTop || colValues.paddingBottom || colValues.paddingLeft || colValues.paddingRight)) {
            hasChanges = true;
            const newValues = { ...colValues };
            delete newValues.paddingTop;
            delete newValues.paddingBottom;
            delete newValues.paddingLeft;
            delete newValues.paddingRight;
            return { ...c, values: newValues };
          }
          return col;
        });

        if (hasChanges) {
          return { ...r, columns: fixedColumns };
        }
      }

      return row;
    });

    if (hasChanges) {
      await prisma.template.update({
        where: { id: template.id },
        data: {
          designJson: {
            ...design,
            body: {
              ...body,
              rows: fixedRows,
            },
          } as Prisma.InputJsonValue,
        },
      });
      fixedCount++;
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} templates`);
}

fixLockedComponents()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
