# Above The Line

A BHAG/OKR/RAG strategic-execution app for Business Game Changers (BGC), built with Next.js (App Router), Prisma, and libSQL/Turso.

## Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and AUTH_SECRET
npm run dev
```

Local dev uses a local SQLite file (`DATABASE_URL="file:./dev.db"`) — no Turso account needed.

## Environment variables

See `.env.example` for the full list. In production, `DATABASE_URL` points at a Turso database and `TURSO_AUTH_TOKEN` must also be set. Generate a separate `AUTH_SECRET` per environment (`openssl rand -base64 32`) — never reuse the local dev secret in production.

## Database migrations

Standard Prisma workflow locally:

```bash
npx prisma migrate dev --name <change>
```

Prisma's CLI (`migrate deploy`/`db push`) does not support remote `libsql://` URLs — only the Prisma Client at runtime does, via the libSQL driver adapter (see `lib/prisma.ts`). After creating a new migration, apply it to the production database with:

```bash
TURSO_URL="libsql://<db>.turso.io" TURSO_TOKEN="<token>" npm run db:push-turso
```

This script (`scripts/push-migrations-to-turso.mjs`) applies any not-yet-applied migrations and keeps its own `_prisma_migrations` bookkeeping table on the remote database in sync.

## Deploying

The app is deployed on Vercel, connected to this repository. Production environment variables (`DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`) are set in the Vercel project settings, not committed anywhere.
