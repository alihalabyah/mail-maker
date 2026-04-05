/**
 * One-off migration: wraps raw-HTML templates (designJson = {}) in a valid
 * Unlayer design JSON so they open in the visual editor.
 *
 * Unlayer's "html" content block renders arbitrary HTML unchanged, so the
 * visual output stays identical to the original email.
 *
 * Run: cd apps/api && npx ts-node prisma/migrate-html-to-unlayer.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function buildUnlayerDesign(html: string): object {
  return {
    schemaVersion: 16,
    counters: {
      u_row: 1,
      u_column: 1,
      u_content_html: 1,
    },
    body: {
      id: 'body',
      rows: [
        {
          id: 'row_1',
          cells: [1],
          columns: [
            {
              id: 'col_1',
              contents: [
                {
                  id: 'content_html_1',
                  type: 'html',
                  values: {
                    html,
                    _meta: {
                      htmlID: 'u_content_html_1',
                      htmlClassNames: 'u_content_html',
                    },
                  },
                },
              ],
              values: {
                backgroundColor: '',
                padding: '0px',
                border: {},
                _meta: {
                  htmlID: 'u_column_1',
                  htmlClassNames: 'u_column',
                },
              },
            },
          ],
          values: {
            displayCondition: null,
            columns: false,
            backgroundColor: '',
            columnsBackgroundColor: '',
            backgroundImage: {
              url: '',
              fullWidth: true,
              repeat: 'no-repeat',
              size: 'custom',
              position: 'center',
            },
            padding: '0px',
            anchor: '',
            _meta: {
              htmlID: 'u_row_1',
              htmlClassNames: 'u_row',
            },
            selectable: true,
            draggable: true,
            duplicatable: true,
            deletable: true,
            hideable: true,
          },
        },
      ],
      values: {
        backgroundColor: '#e7e7e7',
        backgroundImage: {
          url: '',
          fullWidth: true,
          repeat: 'no-repeat',
          size: 'custom',
          position: 'center',
        },
        contentWidth: '600px',
        contentAlign: 'center',
        fontFamily: {
          label: 'Arial',
          value: 'arial,helvetica,sans-serif',
        },
        textColor: '#000000',
        linkStyle: {
          body: true,
          linkColor: '#0000ee',
          linkHoverColor: '#0000ee',
          linkUnderline: true,
          linkHoverUnderline: true,
        },
        preheaderText: '',
        _meta: {
          htmlID: 'u_body',
          htmlClassNames: 'u_body',
        },
      },
    },
  };
}

async function main() {
  // Find templates where designJson has no "body" key — i.e. raw HTML imports
  const templates = await prisma.template.findMany();

  const toMigrate = templates.filter((t) => {
    const d = t.designJson as Record<string, unknown>;
    return !d || typeof d !== 'object' || !('body' in d);
  });

  if (toMigrate.length === 0) {
    console.log('No templates need migration.');
    return;
  }

  console.log(`Migrating ${toMigrate.length} template(s)…`);

  for (const template of toMigrate) {
    const designJson = buildUnlayerDesign(template.htmlTemplate);

    await prisma.template.update({
      where: { id: template.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { designJson: designJson as any },
    });

    console.log(`  ✓ ${template.slug}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
