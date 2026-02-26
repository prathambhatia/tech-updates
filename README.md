# AI Systems Intelligence (Phase 1 - Local Only)

Local-only Next.js 14 App Router platform for aggregating AI and system design blogs into categorized feeds.

## Stack

- Next.js 14 (App Router)
- TypeScript (strict)
- Tailwind CSS + `@tailwindcss/typography`
- Prisma ORM
- PostgreSQL (local)
- `rss-parser`
- `cheerio` (RSS fallback parsing)

## Architecture

- No Redis
- No background queues
- No deployment setup
- Ingestion via `POST /api/ingest`

## Folder Structure

```text
app/
  api/
    ingest/
      route.ts
  article/
    [slug]/
      page.tsx
  category/
    [slug]/
      page.tsx
  search/
    page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  article-list-item.tsx
  category-card.tsx
  pagination-links.tsx
  theme-toggle.tsx
lib/
  db.ts
  env.ts
  rss.ts
  scrape.ts
prisma/
  schema.prisma
  seed.ts
services/
  article.service.ts
  ingestion.service.ts
types/
  article.ts
  ingestion.ts
utils/
  async.ts
  date.ts
  text.ts
```

## Prisma Schema (PostgreSQL)

`prisma/schema.prisma` uses:

- `Category` (`id`, `name`, `slug`, `createdAt`)
- `Source` (`id`, `name`, `url`, `rssUrl`, `categoryId`, `createdAt`)
- `Article` (`id`, `title`, `slug`, `url`, `author`, `summary`, `contentPreview`, `publishedAt`, `readingTime`, `sourceId`, `createdAt`)
- `Tag` (`id`, `name`, `slug`)
- `ArticleTag` (`articleId`, `tagId`)

Includes:

- `Article.url` unique
- index on `Article.publishedAt`
- relational FKs and join table relation

## Ingestion Service

Implemented in `services/ingestion.service.ts`:

- pulls all sources from PostgreSQL
- parses each RSS feed with `rss-parser`
- falls back to HTML extraction with `cheerio` when RSS fails
- normalizes URL/title/text
- generates slug, reading time, summary, preview
- filters Medium content by tags:
  - `system design`
  - `distributed systems`
  - `llm`
  - `transformers`
  - `rag`
  - `scaling`
- skips duplicates by unique `Article.url`
- persists tags via `Tag` + `ArticleTag`

## API Route

`POST /api/ingest` is implemented in `app/api/ingest/route.ts`.

Example:

```bash
curl -X POST http://localhost:3000/api/ingest
```

Returns source-level and aggregate ingestion metrics.

## Tailwind Config

`tailwind.config.ts`:

- `darkMode: ["class"]`
- typography plugin enabled (`@tailwindcss/typography`)
- utility-first styles only (no CSS modules)
- article page uses `prose` classes

## Local Setup

### 1) Install PostgreSQL locally

macOS (Homebrew):

```bash
brew install postgresql@16
brew services start postgresql@16
```

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

### 2) Create database

```bash
createdb ai_systems_intelligence
```

If needed, create user/password first via `psql`.

### 3) Configure environment

```bash
cp .env.example .env
```

Ensure `.env` contains:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/ai_systems_intelligence?schema=public"
```

### 4) Install dependencies

```bash
npm install
```

### 5) Run Prisma migrations + seed

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

### 6) Start development server

```bash
npm run dev
```

### 7) Trigger ingestion

```bash
curl -X POST http://localhost:3000/api/ingest
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/search`
