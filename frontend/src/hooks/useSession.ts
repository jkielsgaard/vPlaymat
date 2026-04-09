const SESSION_KEY = 'vmagic-session-id'

/**
 * Returns a stable session ID for this browser profile.
 *
 * Normal mode:
 *   - sessionStorage holds the ID for the lifetime of the tab/window.
 *   - localStorage holds the ID across browser close/reopen.
 *   - On a returning visit: sessionStorage is empty but localStorage has the old
 *     ID → it is copied into sessionStorage so the session is considered the same.
 *
 * Incognito / private mode:
 *   - Both storages are isolated from the normal profile.
 *   - A new UUID is generated → backend treats it as a fresh session.
 *
 * If storage is unavailable (very restrictive security policy) an ephemeral
 * UUID is returned; the session is not persisted.
 */
export function getOrCreateSessionId(): string {
  try {
    // Same tab already has an ID
    const inSession = sessionStorage.getItem(SESSION_KEY)
    if (inSession) return inSession

    // Returning visitor (normal mode, browser was closed and reopened)
    const inLocal = localStorage.getItem(SESSION_KEY)
    if (inLocal) {
      sessionStorage.setItem(SESSION_KEY, inLocal)
      return inLocal
    }

    // Brand-new session
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
    localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}
