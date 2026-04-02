#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source ./.env.local
  set +a
fi

DEFAULT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
DEPLOY_HOST="${DEPLOY_HOST:-root@165.232.145.239}"
DEPLOY_COMMAND="${DEPLOY_COMMAND:-bash /var/www/deploy.sh}"

SKIP_BUILD="${SKIP_BUILD:-0}"
SKIP_DOCS="${SKIP_DOCS:-0}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"
RELEASE_BUMP="${RELEASE_BUMP:-}"

require_git_repo() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "ERROR: not a git repository" >&2
    exit 1
  fi
}

run_build() {
  if [ "$SKIP_BUILD" = "1" ]; then
    echo "Skipping build: SKIP_BUILD=1"
    return 0
  fi

  echo "Running build..."
  npm run build
}

run_docs() {
  if [ "$SKIP_DOCS" = "1" ]; then
    echo "Skipping docs:update: SKIP_DOCS=1"
    return 0
  fi

  echo "Running docs:update..."
  npm run docs:update
}

get_changed_files() {
  git status --porcelain | awk '{print $2}'
}

detect_bump_type() {
  local files="$1"

  if echo "$files" | grep -Eq '(^|/)(api_contracts\.md|database_schema\.md|security_rules\.md)$'; then
    echo "major"
    return
  fi

  if echo "$files" | grep -Eq '(^|/)(supabase/|app/api/|lib/|app/|components/|SUPABASE_SCHEMA\.sql)$'; then
    echo "minor"
    return
  fi

  echo "patch"
}

classify_scope() {
  local files="$1"

  if echo "$files" | grep -Eq '^app/admin/|^lib/admin'; then
    echo "admin"
    return
  fi

  if echo "$files" | grep -Eq '^app/contractor/|^lib/contractor'; then
    echo "contractor"
    return
  fi

  if echo "$files" | grep -Eq '^app/customer/|^lib/customers'; then
    echo "customer"
    return
  fi

  if echo "$files" | grep -Eq '^supabase/|SUPABASE_SCHEMA\.sql'; then
    echo "database"
    return
  fi

  if echo "$files" | grep -Eq '^docs/'; then
    echo "docs"
    return
  fi

  echo "app"
}

classify_type() {
  local files="$1"

  if echo "$files" | grep -Eq '^docs/'; then
    echo "docs"
    return
  fi

  if echo "$files" | grep -Eq '^app/|^lib/|^components/|^supabase/'; then
    echo "feat"
    return
  fi

  echo "chore"
}

build_commit_message() {
  local files="$1"
  local change_type
  local scope
  local summary="update project files"

  change_type="$(classify_type "$files")"
  scope="$(classify_scope "$files")"

  if echo "$files" | grep -Eq '^app/contractor/onboarding/company/page\.tsx'; then
    summary="improve contractor onboarding company form"
  elif echo "$files" | grep -Eq '^app/customer/contractors/all/page\.tsx'; then
    summary="improve customer contractor marketplace"
  elif echo "$files" | grep -Eq '^app/customer/contractors/approved/page\.tsx'; then
    summary="fix approved contractors view"
  elif echo "$files" | grep -Eq '^app/contractor/customers/page\.tsx'; then
    summary="improve contractor customer applications"
  elif echo "$files" | grep -Eq '^lib/customers\.ts'; then
    summary="add customer contractor marketplace logic"
  elif echo "$files" | grep -Eq '^lib/contractor\.ts'; then
    summary="improve contractor application data"
  elif echo "$files" | grep -Eq '^supabase/'; then
    summary="update database schema and policies"
  elif echo "$files" | grep -Eq '^docs/'; then
    summary="refresh project docs export"
  fi

  echo "${change_type}(${scope}): ${summary}"
}

get_latest_version() {
  local latest
  latest="$(git tag --list 'v*' --sort=-version:refname | head -n 1)"
  if [ -z "$latest" ]; then
    echo "v0.0.0"
  else
    echo "$latest"
  fi
}

bump_version() {
  local version="$1"
  local bump="$2"

  version="${version#v}"
  IFS='.' read -r major minor patch <<< "$version"

  case "$bump" in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
    *)
      echo "ERROR: unknown bump type: $bump" >&2
      exit 1
      ;;
  esac

  echo "v${major}.${minor}.${patch}"
}

ensure_ssh_ready() {
  if [ "$SKIP_DEPLOY" = "1" ]; then
    return 0
  fi

  if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$DEPLOY_HOST" "echo ok" >/dev/null 2>&1; then
    echo "ERROR: SSH access to $DEPLOY_HOST is not ready." >&2
    echo "Use SSH keys so deploy can run without password prompts." >&2
    exit 1
  fi
}

main() {
  require_git_repo
  ensure_ssh_ready

  run_build
  run_docs

  local changed_files
  changed_files="$(get_changed_files)"

  if [ -z "$changed_files" ]; then
    echo "No changes to commit."
    exit 0
  fi

  local bump_type
  local commit_message
  local current_version
  local next_version

  if [ -n "$RELEASE_BUMP" ]; then
    bump_type="$RELEASE_BUMP"
  else
    bump_type="$(detect_bump_type "$changed_files")"
  fi

  commit_message="$(build_commit_message "$changed_files")"
  current_version="$(get_latest_version)"
  next_version="$(bump_version "$current_version" "$bump_type")"

  echo
  echo "Detected bump type: $bump_type"
  echo "Commit message:     $commit_message"
  echo "Current version:    $current_version"
  echo "Next version:       $next_version"
  echo

  git add -A

  if git diff --cached --quiet; then
    echo "No staged changes after git add."
    exit 0
  fi

  git commit -m "$commit_message"
  git tag "$next_version"
  git push origin "$DEFAULT_BRANCH"
  git push origin "$next_version"

  if [ "$SKIP_DEPLOY" = "1" ]; then
    echo "Skipping deploy: SKIP_DEPLOY=1"
    exit 0
  fi

  echo "Running remote deploy..."
  ssh "$DEPLOY_HOST" "$DEPLOY_COMMAND"

  echo
  echo "Release complete: $next_version"
}

main "$@"