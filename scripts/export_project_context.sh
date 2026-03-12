#!/usr/bin/env bash
set -e

mkdir -p docs

echo "# Project Context Snapshot" > docs/PROJECT_CONTEXT.md
echo "" >> docs/PROJECT_CONTEXT.md
echo "Generated: $(date)" >> docs/PROJECT_CONTEXT.md
echo "" >> docs/PROJECT_CONTEXT.md

echo "## 1. Directory tree" >> docs/PROJECT_CONTEXT.md
echo '```' >> docs/PROJECT_CONTEXT.md
find app lib public supabase -type d | sort >> docs/PROJECT_CONTEXT.md
echo '```' >> docs/PROJECT_CONTEXT.md
echo "" >> docs/PROJECT_CONTEXT.md

echo "## 2. File list" >> docs/PROJECT_CONTEXT.md
echo '```' >> docs/PROJECT_CONTEXT.md
find app lib public supabase -type f \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  | sort >> docs/PROJECT_CONTEXT.md
echo '```' >> docs/PROJECT_CONTEXT.md
echo "" >> docs/PROJECT_CONTEXT.md

echo "## 3. Routes" >> docs/PROJECT_CONTEXT.md
echo '```' >> docs/PROJECT_CONTEXT.md
find app -type f \( -name "page.tsx" -o -name "layout.tsx" -o -name "route.ts" \) | sort >> docs/PROJECT_CONTEXT.md
echo '```' >> docs/PROJECT_CONTEXT.md
echo "" >> docs/PROJECT_CONTEXT.md

echo "## 4. Package.json" >> docs/PROJECT_CONTEXT.md
echo '```json' >> docs/PROJECT_CONTEXT.md
cat package.json >> docs/PROJECT_CONTEXT.md
echo '```' >> docs/PROJECT_CONTEXT.md
echo "" >> docs/PROJECT_CONTEXT.md

if [ -f docs/AI_CONTEXT.md ]; then
  echo "## 5. AI Context" >> docs/PROJECT_CONTEXT.md
  cat docs/AI_CONTEXT.md >> docs/PROJECT_CONTEXT.md
  echo "" >> docs/PROJECT_CONTEXT.md
fi

echo "Done: docs/PROJECT_CONTEXT.md"
