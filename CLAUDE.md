# vPlaymat — Claude Code Instructions

## Version number (REQUIRED)

The app version is displayed in the centre of the top menu bar in
`frontend/src/components/menu/MenuBar.tsx`.

**Every time you make a change to the codebase, you MUST increment the version.**

Versioning scheme: `v0.1 alpha`, `v0.2 alpha`, `v0.3 alpha`, … continuing
sequentially with one decimal step per change session.

Steps:
1. Look at the current version string in `MenuBar.tsx` (search for `v0.`).
2. Increment the minor number by 0.1 (e.g. `v0.1 alpha` → `v0.2 alpha`).
3. Update the string in **both** of these files before finishing the task:
   - `frontend/src/components/menu/MenuBar.tsx` — the version shown in the UI
   - `backend/main.py` — `APP_VERSION` constant (shown in the startup log)

Never skip this step, even for small fixes. Both files must always show the same version.

## End-of-task summary (REQUIRED)

After every task, finish your response with a short block in this format:

---
**Version:** v0.X alpha
**What to test:**
- Bullet per changed feature or fix, written as a concrete action the user can take
  (e.g. "Shift+click two cards, drag one — the other should follow")
---

Keep the bullets specific and actionable. Do not write vague items like "check that things work".
