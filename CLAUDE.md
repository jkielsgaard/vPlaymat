# vPlaymat — Claude Code Instructions

## Version number (REQUIRED)

The app version is displayed in the centre of the top menu bar in
`frontend/src/components/menu/MenuBar.tsx`.

**Only bump the version when the codebase changes** (not for README, docs, or test-only changes).

Versioning scheme: **Semantic Versioning — MAJOR.MINOR.PATCH**

The beta notice banner in the UI is separate from the version number and stays until the project is declared stable.

| Part | Bump when |
|------|-----------|
| PATCH | Bug fix, small UI tweak, copy change |
| MINOR | New user-facing feature added |
| MAJOR | Large feature area completed or breaking change |

Rules:
- PATCH resets to 0 when MINOR bumps (e.g. `v1.0.3` → `v1.1.0`)
- MINOR resets to 0 when MAJOR bumps (e.g. `v1.3.2` → `v2.0.0`)

Steps:
1. Look at the current version string in `MenuBar.tsx` (search for `v`).
2. Decide which part to bump based on the nature of the change.
3. Update the string in **both** of these files before finishing the task:
   - `frontend/src/components/menu/MenuBar.tsx` — the version shown in the UI
   - `backend/main.py` — `APP_VERSION` constant (shown in the startup log)

Both files must always show the same version.

## End-of-task summary (REQUIRED)

After every task, finish your response with a short block in this format:

---
**Version:** vX.Y.Z beta
**What to test:**
- Bullet per changed feature or fix, written as a concrete action the user can take
  (e.g. "Shift+click two cards, drag one — the other should follow")
---

Keep the bullets specific and actionable. Do not write vague items like "check that things work".

---

## Architecture

vPlaymat is a single-page React app backed by a FastAPI WebSocket server. Understanding the data flow saves time when making changes.

### Data flow

```
Browser (React) ←──WebSocket──→ FastAPI (Python)
                ←──REST API──→
```

- The frontend connects to the backend via a **persistent WebSocket** (`useBoard.ts`). Every game state change is pushed from the server to all connected clients for that session.
- **REST endpoints** handle mutations (draw, move card, import deck, etc.). After each mutation the backend broadcasts the updated state over WebSocket to all clients in that session.
- The frontend never modifies local state directly — it sends a REST request and waits for the WebSocket broadcast to update the UI.

### Session model

- Each browser gets a **session ID** stored in `localStorage` (`useSession.ts`).
- The backend maintains one `GameState` object per session ID in memory (`state.py`).
- Sessions are persisted to disk (JSON files in `/app/data/sessions/`) every 5 seconds via a background flush loop, and expire after 15 minutes of inactivity.
- The OBS view (`?obs=1` URL param) connects to the same session via a `session_id` URL param — it is read-only and mirrors the player's board live.

### Key files

| File | What it does |
|------|-------------|
| `frontend/src/hooks/useBoard.ts` | WebSocket connection, state cache, reconnect logic |
| `frontend/src/hooks/useSession.ts` | Session ID generation and localStorage persistence |
| `frontend/src/api/rest.ts` | All REST calls — automatically appends `session_id` to every request |
| `frontend/src/App.tsx` | Root component — detects OBS mode, renders main UI or `OBSView` |
| `frontend/src/components/layout/Playmat.tsx` | Main game layout — arena, hand, log |
| `frontend/src/components/layout/OBSView.tsx` | Clean arena-only view for OBS Browser Source |
| `backend/main.py` | FastAPI app entry point, WebSocket endpoint, startup tasks |
| `backend/state.py` | In-memory session store, WebSocket connection manager, flush loop |
| `backend/models/game_state.py` | All game logic — draw, move, tap, counters, serialisation |
| `backend/routers/game.py` | REST endpoints for game actions (draw, untap, life, etc.) |
| `backend/routers/deck.py` | Deck import endpoint — calls Scryfall, resets game state |
| `backend/routers/cards.py` | Per-card REST endpoints (move, tap, flip, transform, counters) |

### Frontend component structure

```
App
├── MenuBar (top bar — Game menu, Settings, Help)
├── ReconnectBanner (shown when WebSocket drops)
├── Playmat (main game area)
│   ├── Arena (battlefield + zones)
│   │   ├── ZoneBattlefield (free-form card placement)
│   │   ├── ZoneCommand (commander zone, top corner)
│   │   ├── ZoneHand (cards in hand, below arena)
│   │   └── ZoneViewer (graveyard/exile overlay)
│   └── GameLog (action log panel)
└── StartGameWizard (deck import modal, shown on first load or from menu)
```

---

## Testing rules

### When to write tests

- **Always** when adding a new hook or utility function
- **Always** when fixing a bug — add a test that would have caught it
- **Always** when adding a new backend model method or session management logic
- **Consider** for new UI components if they have non-trivial logic (state machines, conditional rendering based on props)
- **Skip** for pure layout/styling components with no logic
- **Skip** for simple pass-through props or wrappers

### Test locations

| What | Where |
|------|-------|
| Frontend hooks and utilities | `frontend/src/tests/` |
| Frontend components | `frontend/src/tests/` |
| Backend game logic | `backend/tests/test_board_state.py` |
| Backend session management | `backend/tests/test_session_management.py` |
| Backend serialisation | `backend/tests/test_game_state_serialization.py` |

### Frontend test patterns

- Use `renderHook` for hooks, `render` + `userEvent` for components
- Mock WebSocket with `vi.stubGlobal('WebSocket', MockWebSocket)` — see `useBoard.test.ts` for the pattern
- Always `localStorage.clear()` and `sessionStorage.clear()` in `beforeEach` when testing session-related code
- Mock `navigator.clipboard` with `Object.defineProperty` when testing copy actions
- Mock REST calls with `vi.mock('../api/rest', () => ({ ... }))`

### Backend test patterns

- Use the `fresh_state` and `state_with_deck` fixtures from `conftest.py`
- Use `make_card()` from `conftest.py` to create test cards — don't construct `Card` objects directly in tests
- Session management tests must use the `isolated_sessions` fixture (in `test_session_management.py`) to clear `state._sessions` and `state._dirty` between tests
- Use `monkeypatch.setattr(state_module, 'SESSION_DIR', str(tmp_path))` to avoid writing real files during tests
- Mark async tests with `@pytest.mark.asyncio` or rely on `asyncio_mode = auto` in `pytest.ini`

### What not to test

- Pure styling or layout (Tailwind classes)
- Third-party library behaviour (Scryfall API responses — mock those)
- Implementation details that are likely to change (internal state shape)
