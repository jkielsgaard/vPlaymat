// Tests for the useSession hook — UUID generation, localStorage persistence, and isolation.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrCreateSessionId } from '../hooks/useSession'

const SESSION_KEY = 'vmagic-session-id'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('getOrCreateSessionId', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('generates a valid UUID v4 on first visit', () => {
    const id = getOrCreateSessionId()
    expect(id).toMatch(UUID_PATTERN)
  })

  it('stores the new ID in both sessionStorage and localStorage', () => {
    const id = getOrCreateSessionId()
    expect(sessionStorage.getItem(SESSION_KEY)).toBe(id)
    expect(localStorage.getItem(SESSION_KEY)).toBe(id)
  })

  it('returns the same ID on subsequent calls within the same tab', () => {
    const first = getOrCreateSessionId()
    const second = getOrCreateSessionId()
    expect(second).toBe(first)
  })

  it('restores ID from localStorage when sessionStorage is empty (returning visitor)', () => {
    const existingId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    localStorage.setItem(SESSION_KEY, existingId)

    const id = getOrCreateSessionId()
    expect(id).toBe(existingId)
    expect(sessionStorage.getItem(SESSION_KEY)).toBe(existingId)
  })

  it('does not overwrite an existing localStorage ID with a new one', () => {
    const existingId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    localStorage.setItem(SESSION_KEY, existingId)

    getOrCreateSessionId()
    expect(localStorage.getItem(SESSION_KEY)).toBe(existingId)
  })

  it('returns an ephemeral UUID when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    const id = getOrCreateSessionId()
    expect(id).toMatch(UUID_PATTERN)

    vi.restoreAllMocks()
  })
})
