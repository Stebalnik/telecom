#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ $# -eq 0 ]; then
  echo "Usage: ./scripts/ship.sh \"commit message\""
  exit 1
fi

COMMIT_MESSAGE="$*"

echo "1) Updating docs export..."
bash ./scripts/update_project_docs.sh

echo "2) Checking current branch..."
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Current branch: $BRANCH"

echo "3) Adding all tracked/untracked files except .gitignore exclusions..."
git add -A

echo "4) Git status:"
git status --short

echo "5) Creating commit..."
if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

git commit -m "$COMMIT_MESSAGE"

echo "6) Pushing to origin/$BRANCH ..."
git push origin "$BRANCH"

echo
echo "Done."
echo "Branch: $BRANCH"
echo "Commit: $COMMIT_MESSAGE"
