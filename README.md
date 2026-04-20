<p align="center">
  <img src="docs/editor-demo.gif" alt="mail-maker drag-and-drop editor demo" width="700">
</p>

<h1 align="center">mail-maker</h1>

<p align="center">
  Self-hosted email template manager with drag-and-drop editor, Handlebars variables, and REST API
</p>

<img width="1716" height="912" alt="image" src="https://github.com/user-attachments/assets/a50de162-33ce-46fe-9831-91d08fe876ca" />


<p align="center">
  <a href="https://github.com/alihalabyah/mail-maker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/alihalabyah/mail-maker?style=flat-square" alt="MIT License"></a>
  <a href="https://github.com/alihalabyah/mail-maker"><img src="https://img.shields.io/github/stars/alihalabyah/mail-maker?style=flat-square" alt="Stars"></a>
  <img src="https://img.shields.io/badge/TypeScript-80%25-3178C6?style=flat-square" alt="TypeScript">
  <a href="https://hub.docker.com/r/alihalabyah/mail-maker"><img src="https://img.shields.io/docker/pulls/alihalabyah/mail-maker?style=flat-square" alt="Docker Pulls"></a>
</p>

<p align="center">
  <a href="#quick-start"><b>Quick Start</b></a> &middot;
  <a href="#why-mail-maker"><b>Why mail-maker?</b></a> &middot;
  <a href="apps/api/.env.example"><b>Config</b></a> &middot;
  <a href="http://localhost:3001/api/docs"><b>API Docs</b></a> &middot;
  <a href="CONTRIBUTING.md"><b>Contributing</b></a>
</p>

---

## Why mail-maker?

Managing transactional email templates across teams is a mess. Templates end up hardcoded in backend repos, shared as raw HTML in Slack, or locked inside SaaS dashboards that cost money and create vendor lock-in.

**mail-maker** gives your team a self-hosted visual editor for building email templates, and a simple REST API for your backend services to fetch rendered HTML at send time. It works with any email provider (Resend, SendGrid, Mailgun, SES, Postmark — anything that accepts HTML).

| | mail-maker | Mailchimp / SendGrid Templates | MJML | Hardcoded HTML |
|---|---|---|---|---|
| **Self-hosted** | Yes | No | N/A (library) | Yes |
| **Visual drag-and-drop editor** | Yes | Yes | No | No |
| **Template versioning** | Yes (slug-based) | Limited | Manual | Manual |
| **Dynamic variables** | Handlebars | Limited merge tags | Handlebars | Any |
| **REST API for rendering** | Yes | Yes (vendor API) | No | No |
| **No vendor lock-in** | Yes | No | Partial | Yes |
| **Works with any email provider** | Yes | Only their own | Yes | Yes |
| **Cost** | Free (your infra) | Paid tiers | Free | Free |

## Quick Start

Get mail-maker running in under 5 minutes:

```bash
# 1. Clone the repo
git clone https://github.com/alihalabyah/mail-maker.git
cd mail-maker

# 2. Start infrastructure (PostgreSQL, S3, Mailpit)
docker compose up -d

# 3. Install dependencies
npm install

# 4. Configure environment
cp apps/api/.env.example apps/api/.env

# 5. Set up the database
npm run db:migrate
npm run db:seed

# 6. Start developing
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the editor UI, or [http://localhost:3001/api/docs](http://localhost:3001/api/docs) for the interactive API reference.

<details>
<summary>Deploy with one click</summary>

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/mail-maker)

</details>

## Features

- **Visual drag-and-drop email editor** — Unlayer / react-email-editor, no coding required
- **Handlebars variable substitution** — inject dynamic data at send time (`{{first_name}}`, `{{order_number}}`)
- **Template versioning with slug-based lookups** — safe deploys with rollback
- **Image uploads to any S3-compatible storage** — AWS S3, OCI, MinIO, LocalStack
- **JWT-authenticated web UI** — for template designers
- **API key authentication** — for backend services consuming templates
- **Send-test endpoint** — preview rendered emails in Mailpit

## Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Backend | NestJS 11, TypeScript, PostgreSQL, Prisma 6 |
| Frontend | Next.js 15 (App Router), Tailwind CSS |
| Email editor | react-email-editor (Unlayer) |
| Template engine | Handlebars |
| Storage | AWS SDK v3 (S3 / OCI / MinIO / LocalStack) |
| Auth | JWT (UI) + API keys (external services) |
| Local email testing | Mailpit |

## API Reference

All external API endpoints require an API key. Create one in the UI under **Settings > API Keys**, then pass it as a header:

```
X-API-Key: mk_your_key_here
```

### Render a template

```
POST /v1/render/:templateSlug
```

**Request body**

```json
{
  "variables": {
    "first_name": "John",
    "order_number": "ORD-123",
    "amount": "250.00"
  }
}
```

**Response**

```json
{
  "html": "<html>…</html>",
  "subject": "Your order ORD-123 is confirmed"
}
```

```bash
curl -X POST https://your-host/v1/render/order-confirmation \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mk_your_key_here" \
  -d '{"variables": {"first_name": "John", "order_number": "ORD-123"}}'
```

### Get template metadata

```
GET /v1/templates/:templateSlug
```

Returns the template name, subject, description, and variable schema.

### Send a test email

```
POST /v1/send-test/:templateSlug
```

```bash
curl -X POST http://localhost:3001/v1/send-test/order-confirmation \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mk_your_key_here" \
  -d '{"to": "you@example.com", "variables": {"first_name": "John"}}'
```

## Template Variables

Variables are declared per template in the UI sidebar. At render time, undeclared variables are ignored, variables with defaults are filled in automatically, and missing required variables return a `400` error.

| Field | Description |
|---|---|
| `name` | Handlebars key used in the template body: `{{name}}` |
| `label` | Human-readable label shown in the UI |
| `type` | `string`, `number`, `boolean`, or `date` |
| `required` | Whether the render call must supply this variable |
| `defaultValue` | Fallback value when not supplied |

## Handlebars Helpers

| Helper | Example | Output |
|---|---|---|
| `upper` | `{{upper name}}` | `JOHN` |
| `lower` | `{{lower name}}` | `john` |
| `formatDate` | `{{formatDate createdAt}}` | `April 5, 2026` |

## Configuration

<details>
<summary>Environment variables</summary>

### `apps/api/.env`

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://mailmaker:mailmaker@localhost:5433/mailmaker` |
| `JWT_SECRET` | Secret for signing JWT tokens | — |
| `JWT_EXPIRY` | Token expiry | `7d` |
| `AWS_REGION` | S3 region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | S3 access key | — |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | — |
| `S3_BUCKET` | Bucket name for uploaded assets | `mail-maker-assets` |
| `STORAGE_ENDPOINT` | Override endpoint for OCI / MinIO / LocalStack | — |
| `SMTP_HOST` | SMTP host for test sending | `localhost` |
| `SMTP_PORT` | SMTP port | `1025` |
| `SMTP_FROM` | From address for test sends | `mailmaker@mail-maker.local` |
| `PORT` | API server port | `3001` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |
| `ADMIN_PASSWORD` | Overrides the seeded admin password | — |

</details>

<details>
<summary>OCI Object Storage</summary>

To use Oracle Cloud Infrastructure S3-compatible storage, set:

```env
STORAGE_ENDPOINT=https://<namespace>.compat.objectstorage.<region>.oraclecloud.com
AWS_ACCESS_KEY_ID=<oci-access-key>
AWS_SECRET_ACCESS_KEY=<oci-secret-key>
AWS_REGION=<region>
S3_BUCKET=<bucket-name>
```

The `forcePathStyle` flag is enabled automatically when `STORAGE_ENDPOINT` is set.

</details>

## Useful Commands

```bash
npm run dev            # Start all services in development mode
npm run build          # Build all apps
npm run db:migrate     # Run database migrations
npm run db:generate    # Regenerate Prisma client
npm run db:seed        # Seed admin user + HTML templates
npm run db:studio      # Open Prisma Studio (DB browser)
```

## Project Structure

```
mail-maker/
├── apps/
│   ├── api/                  # NestJS backend (port 3001)
│   │   └── prisma/           # Schema, migrations, seed
│   └── web/                  # Next.js frontend (port 3000)
├── packages/
│   └── shared/               # Shared TypeScript types
├── static/
│   └── email_templates/      # HTML templates seeded into the DB
├── scripts/
│   └── localstack-init.sh    # Creates the S3 bucket in LocalStack
└── docker-compose.yml        # PostgreSQL, LocalStack, Mailpit
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) &mdash; free for personal and commercial use.
