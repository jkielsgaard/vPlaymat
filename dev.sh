#!/usr/bin/env bash
# Local development — runs backend (uvicorn) and frontend (Vite) natively.
# Frontend: http://localhost:5173   Backend: http://localhost:8000
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── nvm ──────────────────────────────────────────────────────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
else
  echo "ERROR: nvm not found at $NVM_DIR" >&2
  exit 1
fi

# ── Python venv ───────────────────────────────────────────────────────────────
VENV="$ROOT/backend/.venv"
if [[ ! -d "$VENV" ]]; then
  echo "Creating Python venv…"
  python3 -m venv "$VENV"
fi
# shellcheck source=/dev/null
source "$VENV/bin/activate"
pip install -q -r "$ROOT/backend/requirements.txt"

# ── Node deps ─────────────────────────────────────────────────────────────────
cd "$ROOT/frontend"
nvm use
npm install --silent

# ── Start services ────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping…"
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup INT TERM

cd "$ROOT/backend"
export SESSION_DIR="$ROOT/backend/data/sessions"
mkdir -p "$SESSION_DIR"
uvicorn main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
echo "Backend started (PID $BACKEND_PID) → http://localhost:8000"

cd "$ROOT/frontend"
echo "Starting frontend → http://localhost:5173"
npm run dev

cleanup
