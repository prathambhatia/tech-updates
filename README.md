# AI Systems Intelligence (Phase 1, Local-Only)

AI + system design blog intelligence platform for junior engineers.

## Features

- Aggregates curated engineering and AI blog sources
- Category browsing and search
- Popularity + junior relevance ranking
- `Must Read` tagging for high-value articles
- Manual `Fetch Latest Blogs` button with progress popup
- Automatic scheduled ingestion

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript (strict)
- TailwindCSS
- Prisma ORM
- PostgreSQL

## Local Setup

1. Install PostgreSQL and start it.
2. Create a local database:

```bash
createdb ai_systems_intelligence
```

3. Copy env file:

```bash
cp .env.example .env
```

4. Set `DATABASE_URL` in `.env` to your local Postgres connection (do not commit secrets).
5. Install dependencies:

```bash
npm install
```

6. Run migrations and seed:

```bash
npm run prisma:migrate
npm run prisma:seed
```

7. Start dev server:

```bash
npm run dev
```

8. Open:

- `http://localhost:3000`
- `http://localhost:3000/search`

## Ingestion

- Manual trigger:

```bash
curl -X POST http://localhost:3000/api/ingest
```

- Automatic ingestion runs on the configured schedule from `.env`.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Security

- Never commit `.env` or API tokens.
- Keep this project local-only for Phase 1.
