# Deployment Agent (Vercel + Managed Postgres)

Use `scripts/deploy/vercel_pg_deploy_agent.sh` to deploy this project with data-preserving migration.

## What it does

1. Validates source and target Postgres connectivity.
2. Takes a compressed backup of the source DB into `backups/`.
3. Restores that backup into target managed Postgres.
4. Runs `prisma generate` + `prisma migrate deploy` on target DB.
5. Links Vercel project and sets production env vars.
6. Deploys production and prints the live URL.

## Required environment variables

- `SOURCE_DATABASE_URL` (your current DB)
- `TARGET_DATABASE_URL` (managed Postgres DB)
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_NAME`

## Optional environment variables

- `VERCEL_SCOPE`
- `INGESTION_AUTO_ENABLED` (recommended `false` on Vercel)
- `INGESTION_MANUAL_TRIGGER_ENABLED` (recommended `false` on Vercel)
- `INGESTION_API_SECRET` (required if manual trigger enabled)
- `CRON_SECRET` (recommended for cron endpoint auth)
- `INGESTION_DAILY_CRON`
- `POPULARITY_REFRESH_ENABLED` (recommended `false` on Vercel)
- `POPULARITY_REFRESH_INTERVAL_HOURS`
- `POPULARITY_V2_ENABLED` (recommended `true`)
- `POPULARITY_HALF_LIFE_HOURS` (default `168`)
- `X_BEARER_TOKEN`
- `GITHUB_TOKEN`

## Run

```bash
bash scripts/deploy/vercel_pg_deploy_agent.sh
```

## Safety notes

- Backup is always created before import.
- Backup artifacts are gitignored via `backups/`.
- `.vercel/` and all `.env.*` are gitignored.
