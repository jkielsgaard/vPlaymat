# Contributing to vPlaymat

Thanks for your interest in contributing! This guide covers how to get a local dev environment running and how to submit changes.

## Prerequisites

- **Python 3.11+** with `venv`
- **Node 20+** (use [nvm](https://github.com/nvm-sh/nvm))
- **Podman + podman-compose** or **Docker + Docker Compose** (for container-based dev)
- **Git**

## Local dev setup

### 1 — Clone

```bash
git clone https://github.com/your-username/vPlaymat.git
cd vPlaymat
```

### 2 — Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

### 3 — Frontend

```bash
cd frontend
nvm use          # switches to Node 20 (reads .nvmrc)
npm install
npm run dev
```

The app runs at http://localhost:5173.

### 4 — Run both with Podman (optional)

```bash
# From repo root — podman-compose is installed in the backend venv
source backend/.venv/bin/activate
podman-compose up
```

## Running tests

Always run tests before submitting a PR.

```bash
# Backend
cd backend && source .venv/bin/activate && pytest -v

# Frontend
cd frontend && npm run test:run
```

## Project structure

```
vPlaymat/
├── backend/
│   ├── main.py          # FastAPI app + WebSocket endpoint
│   ├── state.py         # In-memory game state + WS broadcast
│   ├── models/          # GameState, Card Pydantic models
│   ├── routers/         # deck, game, cards endpoints
│   ├── services/        # Scryfall API client
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/  # React UI components
│       ├── contexts/    # SettingsContext
│       ├── hooks/       # useBoard, useActions, useSession, useSettings
│       ├── api/         # REST client (rest.ts)
│       └── types/       # TypeScript interfaces
├── nginx.conf           # nginx config for production container
├── docker-compose.yml   # Dev containers
├── docker-compose.prod.yml  # Production (nginx + uvicorn)
└── render.yaml          # Render.com Blueprint
```

## Making changes

1. **Fork** the repo and create a branch: `git checkout -b my-feature`
2. Make your changes — keep commits focused and descriptive
3. Run the full test suite (backend + frontend)
4. Open a **Pull Request** with a clear title and description
5. Link any related issues with `Closes #123`

## Code style

- **Backend** — standard Python; no formatter enforced but keep it readable
- **Frontend** — TypeScript strict mode; Tailwind for styling; no extra abstraction layers
- Keep changes focused — don't refactor unrelated code in the same PR
- No new dependencies without a strong reason

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## Requesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).
