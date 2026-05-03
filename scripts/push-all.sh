#!/bin/bash
# Push current dev branch changes to dev, main, and prod.
# Usage: ./scripts/push-all.sh "your commit message"

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/push-all.sh \"your commit message\""
  exit 1
fi

COMMIT_MSG="$1"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" != "dev" ]; then
  echo "Error: must be on dev branch (currently on $CURRENT_BRANCH)"
  exit 1
fi

echo "==> Staging all changes and committing on dev..."
git add -A
git commit -m "$COMMIT_MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

echo "==> Pushing dev..."
git push origin dev

echo "==> Merging into main and pushing..."
git checkout main
git pull origin main
git merge dev --no-edit
git push origin main

echo "==> Merging into prod and pushing..."
git checkout prod
git pull origin prod
git merge dev --no-edit
git push origin prod

echo "==> Switching back to dev..."
git checkout dev

echo ""
echo "Done! Pushed to dev, main, and prod."
