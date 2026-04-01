#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
EXPORT_BASE="docs/export_files"
EXPORT_DIR="$EXPORT_BASE/$TIMESTAMP"
LATEST_DIR="docs/export_latest"

mkdir -p "$EXPORT_DIR"
mkdir -p "$LATEST_DIR"

PROJECT_CONTEXT_FILE="$EXPORT_DIR/PROJECT_CONTEXT.md"
PROJECT_STRUCTURE_FILE="$EXPORT_DIR/PROJECT_STRUCTURE.md"
ROUTES_FILE="$EXPORT_DIR/ROUTES.md"
CODE_SNAPSHOT_FILE="$EXPORT_DIR/CODE_SNAPSHOT.md"
SUPABASE_SCHEMA_FILE="$EXPORT_DIR/SUPABASE_SCHEMA.sql"

ROOTS=()
for dir in app lib public supabase components; do
  if [ -d "$dir" ]; then
    ROOTS+=("$dir")
  fi
done

# -----------------------------
# PROJECT_CONTEXT.md
# -----------------------------
{
  echo "# Project Context Snapshot"
  echo
  echo "Generated: $(date)"
  echo
  echo "Export folder: $EXPORT_DIR"
  echo

  echo "## 1. Directory tree"
  echo '```'
  if [ ${#ROOTS[@]} -gt 0 ]; then
    find "${ROOTS[@]}" -type d | sort
  else
    echo "No project directories found."
  fi
  echo '```'
  echo

  echo "## 2. File list"
  echo '```'
  if [ ${#ROOTS[@]} -gt 0 ]; then
    find "${ROOTS[@]}" -type f \
      ! -path "*/node_modules/*" \
      ! -path "*/.next/*" \
      ! -path "*/coverage/*" \
      ! -path "*/dist/*" \
      ! -path "*/build/*" \
      ! -path "*/dump/*" \
      | sort
  else
    echo "No project files found."
  fi
  echo '```'
  echo

  echo "## 3. Routes"
  echo '```'
  if [ -d app ]; then
    find app -type f \( -name "page.tsx" -o -name "layout.tsx" -o -name "route.ts" -o -name "loading.tsx" -o -name "error.tsx" \) | sort
  else
    echo "No app directory found."
  fi
  echo '```'
  echo

  echo "## 4. Package.json"
  echo '```json'
  if [ -f package.json ]; then
    cat package.json
  else
    echo "{}"
  fi
  echo '```'
  echo

  echo "## 5. Important config files"
  echo '```'
  for f in package.json package-lock.json tsconfig.json next.config.js next.config.ts middleware.ts .gitignore; do
    [ -f "$f" ] && echo "$f"
  done
  echo '```'
  echo

  if [ -f docs/AI_CONTEXT.md ]; then
    echo "## 6. AI Context"
    echo
    cat docs/AI_CONTEXT.md
    echo
  fi
} > "$PROJECT_CONTEXT_FILE"

# -----------------------------
# PROJECT_STRUCTURE.md
# -----------------------------
{
  echo "# PROJECT_STRUCTURE"
  echo
  echo "Generated: $(date)"
  echo

  echo "## 1. Root directories"
  echo '```'
  find . \
    \( -path "./node_modules" -o -path "./.next" -o -path "./.git" -o -path "./coverage" -o -path "./dist" -o -path "./build" -o -path "./dump" -o -path "./docs/export_files" -o -path "./docs/export_latest" \) -prune \
    -o -type d -print | sort
  echo '```'
  echo

  echo "## 2. All project files"
  echo '```'
  find . \
    \( -path "./node_modules" -o -path "./.next" -o -path "./.git" -o -path "./coverage" -o -path "./dist" -o -path "./build" -o -path "./dump" -o -path "./docs/export_files" -o -path "./docs/export_latest" \) -prune \
    -o -type f -print | sort
  echo '```'
  echo

  echo "## 3. App route files"
  echo '```'
  if [ -d app ]; then
    find app -type f \( -name "page.tsx" -o -name "layout.tsx" -o -name "route.ts" -o -name "loading.tsx" -o -name "error.tsx" \) | sort
  else
    echo "No app directory found."
  fi
  echo '```'
  echo

  echo "## 4. API route files"
  echo '```'
  if [ -d app/api ]; then
    find app/api -type f | sort
  else
    echo "No API routes found."
  fi
  echo '```'
  echo

  echo "## 5. Library files"
  echo '```'
  if [ -d lib ]; then
    find lib -type f | sort
  else
    echo "No lib directory found."
  fi
  echo '```'
  echo

  echo "## 6. Component files"
  echo '```'
  if [ -d components ]; then
    find components -type f | sort
  else
    echo "No components directory found."
  fi
  echo '```'
  echo

  echo "## 7. Public files"
  echo '```'
  if [ -d public ]; then
    find public -type f | sort
  else
    echo "No public directory found."
  fi
  echo '```'
} > "$PROJECT_STRUCTURE_FILE"

# -----------------------------
# ROUTES.md
# -----------------------------
{
  echo "# ROUTES"
  echo
  echo "Generated: $(date)"
  echo
  echo "## App router files"
  echo '```'
  if [ -d app ]; then
    find app -type f \( -name "page.tsx" -o -name "layout.tsx" -o -name "route.ts" -o -name "loading.tsx" -o -name "error.tsx" \) | sort
  else
    echo "No app directory found."
  fi
  echo '```'
} > "$ROUTES_FILE"

# -----------------------------
# CODE_SNAPSHOT.md
# -----------------------------
{
  echo "# CODE_SNAPSHOT"
  echo
  echo "Generated: $(date)"
  echo
  echo "> Auto-generated snapshot of important project files."
  echo

  files=()

  if [ -d app ]; then
    while IFS= read -r f; do files+=("$f"); done < <(find app -type f | sort)
  fi

  if [ -d lib ]; then
    while IFS= read -r f; do files+=("$f"); done < <(find lib -type f | sort)
  fi

  if [ -d components ]; then
    while IFS= read -r f; do files+=("$f"); done < <(find components -type f | sort)
  fi

  for f in package.json tsconfig.json next.config.js next.config.ts middleware.ts app/globals.css; do
    [ -f "$f" ] && files+=("$f")
  done

  for file in "${files[@]}"; do
    [ -f "$file" ] || continue

    echo "## FILE: $file"
    echo

    ext="${file##*.}"
    lang=""
    case "$ext" in
      ts) lang="ts" ;;
      tsx) lang="tsx" ;;
      js) lang="js" ;;
      jsx) lang="jsx" ;;
      json) lang="json" ;;
      css) lang="css" ;;
      md) lang="md" ;;
      sh) lang="bash" ;;
      sql) lang="sql" ;;
      *) lang="" ;;
    esac

    echo "\`\`\`${lang}"
    cat "$file"
    echo
    echo "\`\`\`"
    echo
  done
} > "$CODE_SNAPSHOT_FILE"

# -----------------------------
# SUPABASE_SCHEMA.sql
# -----------------------------
dump_supabase_schema() {
  if [ "${SKIP_SUPABASE_DUMP:-0}" = "1" ]; then
    echo "Skipping Supabase schema export: SKIP_SUPABASE_DUMP=1"
    return 0
  fi

  echo "Generating Supabase schema dump..."

  if ! command -v docker >/dev/null 2>&1; then
    echo "Skipping Supabase schema export: Docker is not available."
    return 0
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Skipping Supabase schema export: Docker daemon is not running."
    return 0
  fi

  if ! npx supabase --help >/dev/null 2>&1; then
    echo "Skipping Supabase schema export: Supabase CLI is not available."
    return 0
  fi

  local timeout_cmd=""
  if command -v gtimeout >/dev/null 2>&1; then
    timeout_cmd="gtimeout 60"
  elif command -v timeout >/dev/null 2>&1; then
    timeout_cmd="timeout 60"
  fi

  if [ -n "${SUPABASE_DB_URL:-}" ]; then
    if [ -n "$timeout_cmd" ]; then
      eval "$timeout_cmd npx supabase db dump --db-url \"$SUPABASE_DB_URL\" -f \"$SUPABASE_SCHEMA_FILE\""
    else
      npx supabase db dump --db-url "$SUPABASE_DB_URL" -f "$SUPABASE_SCHEMA_FILE"
    fi
  else
    if [ -n "$timeout_cmd" ]; then
      eval "$timeout_cmd npx supabase db dump --linked -f \"$SUPABASE_SCHEMA_FILE\""
    else
      npx supabase db dump --linked -f "$SUPABASE_SCHEMA_FILE"
    fi
  fi

  echo "Supabase schema exported to $SUPABASE_SCHEMA_FILE"
}

if dump_supabase_schema; then
  :
else
  echo "Supabase schema export failed or timed out." >&2
fi

# -----------------------------
# Update docs/export_latest
# -----------------------------
rm -rf "$LATEST_DIR"
mkdir -p "$LATEST_DIR"

cp -f "$PROJECT_CONTEXT_FILE" "$LATEST_DIR/PROJECT_CONTEXT.md"
cp -f "$PROJECT_STRUCTURE_FILE" "$LATEST_DIR/PROJECT_STRUCTURE.md"
cp -f "$ROUTES_FILE" "$LATEST_DIR/ROUTES.md"
cp -f "$CODE_SNAPSHOT_FILE" "$LATEST_DIR/CODE_SNAPSHOT.md"

if [ -f "$SUPABASE_SCHEMA_FILE" ]; then
  cp -f "$SUPABASE_SCHEMA_FILE" "$LATEST_DIR/SUPABASE_SCHEMA.sql"
fi

echo "# Latest export" > "$LATEST_DIR/README.md"
echo >> "$LATEST_DIR/README.md"
echo "Generated from: $EXPORT_DIR" >> "$LATEST_DIR/README.md"
echo "Generated at: $(date)" >> "$LATEST_DIR/README.md"
echo >> "$LATEST_DIR/README.md"
echo "Files included:" >> "$LATEST_DIR/README.md"
echo "- PROJECT_CONTEXT.md" >> "$LATEST_DIR/README.md"
echo "- PROJECT_STRUCTURE.md" >> "$LATEST_DIR/README.md"
echo "- ROUTES.md" >> "$LATEST_DIR/README.md"
echo "- CODE_SNAPSHOT.md" >> "$LATEST_DIR/README.md"
if [ -f "$LATEST_DIR/SUPABASE_SCHEMA.sql" ]; then
  echo "- SUPABASE_SCHEMA.sql" >> "$LATEST_DIR/README.md"
fi

echo
echo "Export completed successfully."
echo "Archive folder:"
echo "  $EXPORT_DIR"
echo
echo "Latest tracked folder:"
echo "  $LATEST_DIR"
echo
echo "Generated files:"
echo "  $LATEST_DIR/PROJECT_CONTEXT.md"
echo "  $LATEST_DIR/PROJECT_STRUCTURE.md"
echo "  $LATEST_DIR/ROUTES.md"
echo "  $LATEST_DIR/CODE_SNAPSHOT.md"
if [ -f "$LATEST_DIR/SUPABASE_SCHEMA.sql" ]; then
  echo "  $LATEST_DIR/SUPABASE_SCHEMA.sql"
fi
