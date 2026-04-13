import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'ali@halabyah.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme123';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatTemplateName(filename: string): string {
  return filename
    .replace(/\.html$/, '')
    .replace(/_/g, ' ');
}

function buildUnlayerDesign(html: string): object {
  return {
    schemaVersion: 16,
    counters: { u_row: 1, u_column: 1, u_content_html: 1 },
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
                _meta: { htmlID: 'u_column_1', htmlClassNames: 'u_column' },
              },
            },
          ],
          values: {
            displayCondition: null,
            columns: false,
            backgroundColor: '',
            columnsBackgroundColor: '',
            backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
            padding: '0px',
            anchor: '',
            _meta: { htmlID: 'u_row_1', htmlClassNames: 'u_row' },
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
        backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
        contentWidth: '600px',
        contentAlign: 'center',
        fontFamily: { label: 'Arial', value: 'arial,helvetica,sans-serif' },
        textColor: '#000000',
        linkStyle: {
          body: true,
          linkColor: '#0000ee',
          linkHoverColor: '#0000ee',
          linkUnderline: true,
          linkHoverUnderline: true,
        },
        preheaderText: '',
        _meta: { htmlID: 'u_body', htmlClassNames: 'u_body' },
      },
    },
  };
}

async function seedTemplates(userId: string) {
  const templatesDir = path.join(__dirname, '../../..', 'static', 'email_templates');

  if (!fs.existsSync(templatesDir)) {
    console.log('No static/email_templates directory found, skipping template seed.');
    return;
  }

  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.html'));

  for (const file of files) {
    const name = formatTemplateName(file);
    const slug = slugify(name);

    const existing = await prisma.template.findFirst({ where: { slug } });
    if (existing) {
      console.log(`  (exists) ${slug}`);
      continue;
    }

    const htmlTemplate = fs.readFileSync(path.join(templatesDir, file), 'utf-8');

    await prisma.template.create({
      data: {
        slug,
        name,
        subject: name,
        htmlTemplate,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        designJson: buildUnlayerDesign(htmlTemplate) as any,
        variables: [],
        createdById: userId,
        baseSlug: slug,
        locale: 'en',
        status: 'draft',
      },
    });

    console.log(`  ✓ ${slug}`);
  }
}

async function main() {
  let user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (user) {
    console.log(`User already exists: ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    user = await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash, role: Role.ADMIN },
    });
    console.log(`Created user: ${user.email}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  }

  console.log('Seeding templates…');
  await seedTemplates(user.id);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
