#!/usr/bin/env bash
# Production build — single container via Podman or Docker.
# App served by nginx at http://localhost:8080
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Detect container runtime ──────────────────────────────────────────────────
if command -v podman-compose &>/dev/null; then
  COMPOSE="podman-compose"
elif command -v podman &>/dev/null; then
  # podman-compose may be installed in the backend venv
  VENV="$ROOT/backend/.venv"
  if [[ -f "$VENV/bin/podman-compose" ]]; then
    # shellcheck source=/dev/null
    source "$VENV/bin/activate"
    COMPOSE="podman-compose"
  else
    echo "podman found but podman-compose is not installed." >&2
    echo "Run:  source backend/.venv/bin/activate && pip install podman-compose" >&2
    exit 1
  fi
elif command -v docker &>/dev/null; then
  COMPOSE="docker compose"
else
  echo "ERROR: neither podman-compose nor docker is installed." >&2
  exit 1
fi

echo "Using: $COMPOSE"
echo "Building and starting production container…"
echo ""

cd "$ROOT"
$COMPOSE -f docker-compose.prod.yml up --build

echo ""
echo "App is running at http://localhost:8080"
