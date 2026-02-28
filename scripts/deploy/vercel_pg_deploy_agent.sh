#!/usr/bin/env bash
set -euo pipefail

# Safe deployment helper for:
# - Backing up local/source Postgres
# - Restoring into managed Postgres
# - Running Prisma migrations
# - Deploying to Vercel production
#
# Required tools: psql, pg_dump, gzip, npm, npx, vercel
#
# Required env vars:
#   SOURCE_DATABASE_URL
#   TARGET_DATABASE_URL
#   VERCEL_TOKEN
#   VERCEL_PROJECT_NAME
# Optional env vars:
#   VERCEL_SCOPE
#   INGESTION_AUTO_ENABLED (default: false for Vercel)
#   INGESTION_MANUAL_TRIGGER_ENABLED (default: false for Vercel)
#   INGESTION_API_SECRET (recommended if manual trigger is enabled)
#   CRON_SECRET (recommended for Vercel cron auth)
#   INGESTION_DAILY_CRON (default: 0 6 * * *)
#   POPULARITY_REFRESH_ENABLED (default: false for Vercel)
#   POPULARITY_REFRESH_INTERVAL_HOURS (default: 6)
#   X_BEARER_TOKEN
#   GITHUB_TOKEN

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$ROOT_DIR/backups"
backup_file="$backup_dir/predeploy-${timestamp}.sql.gz"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

command -v psql >/dev/null 2>&1 || { echo "psql is required"; exit 1; }
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "npx is required"; exit 1; }
command -v vercel >/dev/null 2>&1 || { echo "vercel CLI is required"; exit 1; }

require_var SOURCE_DATABASE_URL
require_var TARGET_DATABASE_URL
require_var VERCEL_TOKEN
require_var VERCEL_PROJECT_NAME

INGESTION_AUTO_ENABLED="${INGESTION_AUTO_ENABLED:-false}"
INGESTION_MANUAL_TRIGGER_ENABLED="${INGESTION_MANUAL_TRIGGER_ENABLED:-false}"
INGESTION_DAILY_CRON="${INGESTION_DAILY_CRON:-0 6 * * *}"
POPULARITY_REFRESH_ENABLED="${POPULARITY_REFRESH_ENABLED:-false}"
POPULARITY_REFRESH_INTERVAL_HOURS="${POPULARITY_REFRESH_INTERVAL_HOURS:-6}"

echo "==> Verifying source DB connectivity"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT current_database(), now();" >/dev/null

echo "==> Verifying target DB connectivity"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT current_database(), now();" >/dev/null

echo "==> Creating source DB backup at $backup_file"
mkdir -p "$backup_dir"
pg_dump --no-owner --no-privileges "$SOURCE_DATABASE_URL" | gzip > "$backup_file"

echo "==> Importing backup into target DB (public schema reset)"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
SQL
gunzip -c "$backup_file" | psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null

echo "==> Running Prisma generate + migrate deploy against target DB"
DATABASE_URL="$TARGET_DATABASE_URL" npx prisma generate >/dev/null
DATABASE_URL="$TARGET_DATABASE_URL" npx prisma migrate deploy

echo "==> Linking Vercel project"
if [[ -n "${VERCEL_SCOPE:-}" ]]; then
  npx vercel link --yes --project "$VERCEL_PROJECT_NAME" --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN"
else
  npx vercel link --yes --project "$VERCEL_PROJECT_NAME" --token "$VERCEL_TOKEN"
fi

echo "==> Upserting Vercel production environment variables"
set_env_var() {
  local key="$1"
  local value="$2"
  local scope_flag=()

  if [[ -n "${VERCEL_SCOPE:-}" ]]; then
    scope_flag+=(--scope "$VERCEL_SCOPE")
  fi

  npx vercel env rm "$key" production --yes --token "$VERCEL_TOKEN" "${scope_flag[@]}" >/dev/null 2>&1 || true
  printf "%s" "$value" | npx vercel env add "$key" production --token "$VERCEL_TOKEN" "${scope_flag[@]}" >/dev/null
}

set_env_var "DATABASE_URL" "$TARGET_DATABASE_URL"
set_env_var "INGESTION_AUTO_ENABLED" "$INGESTION_AUTO_ENABLED"
set_env_var "INGESTION_MANUAL_TRIGGER_ENABLED" "$INGESTION_MANUAL_TRIGGER_ENABLED"
set_env_var "INGESTION_DAILY_CRON" "$INGESTION_DAILY_CRON"
set_env_var "POPULARITY_REFRESH_ENABLED" "$POPULARITY_REFRESH_ENABLED"
set_env_var "POPULARITY_REFRESH_INTERVAL_HOURS" "$POPULARITY_REFRESH_INTERVAL_HOURS"

if [[ -n "${INGESTION_API_SECRET:-}" ]]; then
  set_env_var "INGESTION_API_SECRET" "$INGESTION_API_SECRET"
fi

if [[ -n "${CRON_SECRET:-}" ]]; then
  set_env_var "CRON_SECRET" "$CRON_SECRET"
fi

if [[ -n "${X_BEARER_TOKEN:-}" ]]; then
  set_env_var "X_BEARER_TOKEN" "$X_BEARER_TOKEN"
fi

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  set_env_var "GITHUB_TOKEN" "$GITHUB_TOKEN"
fi

echo "==> Deploying to Vercel production"
deploy_cmd=(npx vercel deploy --prod --yes --token "$VERCEL_TOKEN")
if [[ -n "${VERCEL_SCOPE:-}" ]]; then
  deploy_cmd+=(--scope "$VERCEL_SCOPE")
fi
deployment_output="$("${deploy_cmd[@]}")"
echo "$deployment_output"

deployment_url="$(printf "%s" "$deployment_output" | awk '/https:\/\/.*\.vercel\.app/ {print $1}' | tail -n1)"
if [[ -z "$deployment_url" ]]; then
  echo "Deployment completed, but URL was not detected from CLI output." >&2
  exit 1
fi

echo "==> Running post-deploy health check"
curl -fsSL "$deployment_url" >/dev/null

echo ""
echo "Deployment URL: $deployment_url"
echo "Backup file: $backup_file"
