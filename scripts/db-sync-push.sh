#!/bin/bash
set -euo pipefail

# db-sync-push.sh
# Sync remote-only migrations across parallel worktrees, push local migrations,
# and regenerate database types.

PROJECT_ID="${SUPABASE_PROJECT_ID:-khwcknapjnhpxfodsahb}"
SCHEMAS="${SUPABASE_SCHEMAS:-public,produccion,compras,inventario,visitas,workflows}"
TYPES_OUTPUT="${SUPABASE_TYPES_OUTPUT:-packages/database/src/database.types.ts}"
MIGRATIONS_DIR="supabase/migrations"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI is not installed or not in PATH"
  exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Error: migrations directory not found at $MIGRATIONS_DIR"
  exit 1
fi

echo "[1/5] Checking migrations status..."
LOCAL_IDS=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sed 's|.*/||' | grep -oE '^[0-9]+' | sort || true)
REMOTE_IDS=$(supabase migration list 2>/dev/null | while IFS='|' read -r local remote time; do
  r=$(echo "$remote" | xargs 2>/dev/null || true)
  if echo "$r" | grep -qE '^[0-9]{14}$'; then
    echo "$r"
  fi
done | sort -u)

STUBS_CREATED=""
for rid in $REMOTE_IDS; do
  if ! echo "$LOCAL_IDS" | grep -q "^${rid}$"; then
    STUB="$MIGRATIONS_DIR/${rid}_remote_applied.sql"
    echo "-- Migration already applied remotely (stub from parallel worktree)" > "$STUB"
    STUBS_CREATED="$STUBS_CREATED $rid"
    echo "  - Stub created: ${rid}_remote_applied.sql"
  fi
done

if [ -n "$STUBS_CREATED" ]; then
  COUNT=$(echo "$STUBS_CREATED" | wc -w | xargs)
  echo "Detected $COUNT remote migration(s) from parallel worktrees."
else
  echo "Migrations are already in sync."
fi

echo "[2/5] Pushing migrations..."
PUSH_LOG=$(mktemp)
if ! supabase db push 2>&1 | tee "$PUSH_LOG"; then
  if grep -q "Rerun the command with --include-all flag" "$PUSH_LOG"; then
    echo "Detected out-of-order local migrations. Retrying with --include-all..."
    supabase db push --include-all
  else
    rm -f "$PUSH_LOG"
    exit 1
  fi
fi
rm -f "$PUSH_LOG"

echo "[3/5] Cleaning temporary stubs..."
if [ -n "$STUBS_CREATED" ]; then
  for mid in $STUBS_CREATED; do
    rm -f "$MIGRATIONS_DIR/${mid}_remote_applied.sql"
  done
fi

echo "[4/5] Regenerating types..."
supabase gen types typescript \
  --project-id "$PROJECT_ID" \
  --schema "$SCHEMAS" \
  2>/dev/null > "$TYPES_OUTPUT"

echo "Types updated at: $TYPES_OUTPUT"

echo "[5/5] Done"
