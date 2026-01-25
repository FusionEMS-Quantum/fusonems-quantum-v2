#!/bin/sh
set -eu

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
BACKEND_DIR="$REPO_ROOT/backend"

cd "$BACKEND_DIR"

echo "Running alembic upgrade head..."
set +e
OUTPUT=$(alembic upgrade head 2>&1)
STATUS=$?
set -e

printf '%s\n' "$OUTPUT"

if [ "$STATUS" -eq 0 ]; then
  echo "Migrations applied successfully."
  exit 0
fi

if printf '%s\n' "$OUTPUT" | grep -q "DuplicateTable"; then
  echo "Detected DuplicateTable; stamping to the current heads before retrying the upgrade."
  HEAD_REVISIONS=$(alembic heads -q)
  if [ -z "$HEAD_REVISIONS" ]; then
    echo "Unable to determine head revisions; run 'alembic heads' manually." >&2
    exit "$STATUS"
  fi
  for REV in $HEAD_REVISIONS; do
    echo "Stamping head $REV"
    alembic stamp "$REV"
  done
  alembic upgrade head
  exit $?
fi

echo "Migration failed; see output above." >&2
exit "$STATUS"
