#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ $# -eq 0 ]; then
  echo 'Usage: ./scripts/ship_release.sh "type: commit message" [major|minor|patch]'
  exit 1
fi

COMMIT_MESSAGE="$1"
BUMP_TYPE="${2:-patch}"

if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "Invalid bump type: $BUMP_TYPE"
  echo 'Allowed values: major, minor, patch'
  exit 1
fi

if [[ ! "$COMMIT_MESSAGE" =~ ^(feat|fix|refactor|docs|style|test|chore|release)(\([a-zA-Z0-9_-]+\))?:\ .+ ]]; then
  echo "Invalid commit message format."
  echo 'Expected: type: short description'
  echo 'Example: fix: resolve bids insert rls policy'
  echo 'Example: feat(customer): add jobs archive page'
  exit 1
fi

echo "1) Updating docs export..."
SKIP_SUPABASE_DUMP=1 bash ./scripts/update_project_docs.sh

echo "2) Checking current branch..."
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Current branch: $BRANCH"

if [ "$BRANCH" = "HEAD" ]; then
  echo "You are in detached HEAD state. Checkout a branch first."
  exit 1
fi

echo "3) Fetching latest refs and tags..."
git fetch origin
git fetch --tags

echo "4) Adding files..."
git add -A

echo "5) Git status:"
git status --short

if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

echo "6) Creating commit..."
git commit -m "$COMMIT_MESSAGE"

echo "7) Pushing branch..."
git push origin "$BRANCH"

echo "8) Calculating next tag..."
LATEST_TAG="$(git tag --list 'v*' --sort=-version:refname | head -n 1)"

if [ -z "$LATEST_TAG" ]; then
  MAJOR=0
  MINOR=0
  PATCH=0
else
  VERSION="${LATEST_TAG#v}"
  IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
  MAJOR="${MAJOR:-0}"
  MINOR="${MINOR:-0}"
  PATCH="${PATCH:-0}"
fi

case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"

if git rev-parse "$NEW_TAG" >/dev/null 2>&1; then
  echo "Tag already exists: $NEW_TAG"
  exit 1
fi

echo "9) Creating tag: $NEW_TAG"
git tag -a "$NEW_TAG" -m "$NEW_TAG - $COMMIT_MESSAGE"

echo "10) Pushing tag..."
git push origin "$NEW_TAG"

echo
echo "Done."
echo "Branch: $BRANCH"
echo "Commit: $COMMIT_MESSAGE"
echo "Previous tag: ${LATEST_TAG:-none}"
echo "New tag: $NEW_TAG"
