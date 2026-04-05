# Mail Maker

A self-hosted email template management system. Design templates visually using a drag-and-drop editor (Unlayer), store assets in S3-compatible object storage, and expose a REST API for backend services to fetch and render templates with variable substitution at send time.

## Features

- Visual drag-and-drop email editor (Unlayer / react-email-editor)
- Handlebars variable substitution (`{{first_name}}`, `{{order_number}}`, …)
- Template versioning with slug-based lookups
- Image uploads to any S3-compatible storage (AWS S3, OCI, MinIO, LocalStack)
- JWT-authenticated web UI
- API key authentication for external service integration
- Send-test endpoint to preview rendered emails in Mailpit

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
│   └── email_templates/      # HTML templates seeded into the DB on first run
├── scripts/
│   └── localstack-init.sh    # Creates the S3 bucket in LocalStack
└── docker-compose.yml        # PostgreSQL, LocalStack, Mailpit
```

## Prerequisites

- Node.js 18+
- npm 10+
- Docker + Docker Compose

## Getting Started

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (port 5433), LocalStack S3 (port 4566), and Mailpit (SMTP 1025, UI 8025).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy and fill in the API environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

Minimum required values for local development are already set in `.env`. For real S3 storage, fill in the AWS / OCI credentials.

### 4. Run database migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

The seed creates the admin user `ali@qashio.com` and imports any HTML templates found in `static/email_templates/`.

### 5. Start the development servers

```bash
npm run dev
```

| Service | URL |
|---|---|
| Web UI | http://localhost:3000 |
| API | http://localhost:3001 |
| API docs (Swagger) | http://localhost:3001/api/docs |
| Mailpit inbox | http://localhost:8025 |

## Environment Variables

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

## API Reference

All external API endpoints require an API key. Create one in the UI under **Settings → API Keys**, then pass it as a header:

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

**cURL**

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

Returns the template name, subject, description, and variable schema. Does not return the design JSON or raw HTML.

### Send a test email

Renders the template and delivers it via SMTP. Useful for previewing in Mailpit or any SMTP server.

```
POST /v1/send-test/:templateSlug
```

**Request body**

```json
{
  "to": "you@example.com",
  "variables": {
    "first_name": "John"
  }
}
```

**cURL**

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

The render service registers these built-in helpers:

| Helper | Example | Output |
|---|---|---|
| `upper` | `{{upper name}}` | `JOHN` |
| `lower` | `{{lower name}}` | `john` |
| `formatDate` | `{{formatDate createdAt}}` | `April 5, 2026` |

## Useful Commands

```bash
# Run DB migrations
npm run db:migrate

# Regenerate Prisma client after schema changes
npm run db:generate

# Seed admin user + HTML templates
npm run db:seed

# Open Prisma Studio (DB browser)
npm run db:studio

# Build all apps
npm run build
```

## OCI Object Storage

To use Oracle Cloud Infrastructure S3-compatible storage, set:

```env
STORAGE_ENDPOINT=https://<namespace>.compat.objectstorage.<region>.oraclecloud.com
AWS_ACCESS_KEY_ID=<oci-access-key>
AWS_SECRET_ACCESS_KEY=<oci-secret-key>
AWS_REGION=<region>
S3_BUCKET=<bucket-name>
```

The `forcePathStyle` flag is enabled automatically when `STORAGE_ENDPOINT` is set.

## Seeding HTML Templates

Drop `.html` files into `static/email_templates/` and run `npm run db:seed`. Each file becomes a template whose slug is derived from the filename. Already-seeded slugs are skipped on subsequent runs.
