# Contributing to mail-maker

Thank you for your interest in contributing! This guide covers the basics.

## Prerequisites

- Node.js 18+
- npm 10+
- Docker + Docker Compose

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. Run `docker compose up -d` to start PostgreSQL, LocalStack, and Mailpit
4. Run `npm install` to install dependencies
5. Copy `apps/api/.env.example` to `apps/api/.env` and fill in values
6. Run `npm run db:migrate && npm run db:seed` to set up the database
7. Run `npm run dev` to start both the API and web UI

## Development

The project uses [Turborepo](https://turbo.build/) with npm workspaces:

- `apps/api/` — NestJS backend
- `apps/web/` — Next.js frontend
- `packages/shared/` — Shared TypeScript types

Run `npm run build` before submitting a PR to ensure everything compiles.

## Making Changes

1. Create a branch: `git checkout -b feature/your-feature`
2. Make your changes and test them
3. Run `npm run build` to verify compilation
4. Commit with clear, descriptive messages
5. Push to your fork and open a Pull Request

## Commit Messages

Use conventional commit format:

```
feat(scope): add new feature
fix(scope): fix a bug
docs: update documentation
chore: maintenance tasks
```

## Pull Requests

- Keep PRs focused on a single concern
- Include a clear description of what changed and why
- Ensure `npm run build` passes
- One PR per feature/fix is preferred over large bundled PRs

## Reporting Issues

When opening an issue, include:

- **What** you expected to happen
- **What** actually happened
- Steps to reproduce
- Your environment (Node version, OS, Docker version)

## Questions?

Open a [GitHub Discussion](https://github.com/alihalabyah/mail-maker/discussions) for questions, ideas, or feedback.
