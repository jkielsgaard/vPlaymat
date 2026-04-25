#!/usr/bin/env bash
# Run all tests — backend (pytest) and frontend (vitest). Exit 1 if either suite fails.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

PASS=0
FAIL=0

run_suite() {
  local name="$1"
  shift
  echo ""
  echo "── $name ──────────────────────────────────────────────────────────────────"
  if "$@"; then
    echo "✓ $name passed"
    PASS=$((PASS + 1))
  else
    echo "✗ $name FAILED"
    FAIL=$((FAIL + 1))
  fi
}

# ── Backend ──────────────────────────────────────────────────────────────────
VENV="$BACKEND_DIR/.venv/bin/activate"
if [[ ! -f "$VENV" ]]; then
  echo "ERROR: backend venv not found at $VENV" >&2
  echo "Run: cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$VENV"
run_suite "Backend (pytest)" python -m pytest "$BACKEND_DIR/tests/" -q

# ── Frontend ─────────────────────────────────────────────────────────────────
run_suite "Frontend (vitest)" bash -c "cd '$FRONTEND_DIR' && npm test -- --run"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "  Passed: $PASS   Failed: $FAIL"
echo "════════════════════════════════════════════════════════════════════════════"

[[ $FAIL -eq 0 ]]
