#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo "==> Setting up Mail Maker..."

# Copy env files if not present
if [ ! -f "$ROOT/apps/api/.env" ]; then
  cp "$ROOT/apps/api/.env.example" "$ROOT/apps/api/.env"
  echo "  Created apps/api/.env — edit it before starting."
fi

if [ ! -f "$ROOT/apps/web/.env.local" ]; then
  cp "$ROOT/apps/web/.env.local.example" "$ROOT/apps/web/.env.local"
  echo "  Created apps/web/.env.local"
fi

# Install dependencies
echo "==> Installing dependencies..."
cd "$ROOT" && npm install --legacy-peer-deps

# Start Docker services
echo "==> Starting Docker services (postgres + localstack)..."
cd "$ROOT" && docker compose up -d

echo "==> Waiting for Postgres to be ready..."
until docker compose exec -T postgres pg_isready -U mailmaker > /dev/null 2>&1; do
  sleep 1
done

# Run Prisma migration + generate
echo "==> Running database migration..."
cd "$ROOT/apps/api" && npx prisma migrate dev --name init

echo "==> Seeding admin user..."
cd "$ROOT/apps/api" && npx ts-node prisma/seed.ts

echo ""
echo "✓ Setup complete!"
echo ""
echo "  Start dev:     npm run dev (from repo root)"
echo "  API:           http://localhost:3001"
echo "  Swagger docs:  http://localhost:3001/api/docs"
echo "  Web UI:        http://localhost:3000"
echo ""
echo "  Default admin: admin@mail-maker.local / changeme123"
echo "  IMPORTANT: Change the admin password after first login."
