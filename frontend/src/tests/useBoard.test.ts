// Tests for the useBoard hook — WebSocket connection, state updates, and reconnect.
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBoard } from '../hooks/useBoard'
import type { GameState } from '../types/game'

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

const mockClose = vi.fn()
let mockInstance: {
  onopen: (() => void) | null
  onmessage: ((e: { data: string }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
  close: typeof mockClose
  readyState: number
}

const MockWebSocket = vi.fn(() => {
  mockInstance = {
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    close: mockClose,
    readyState: 1, // OPEN
  }
  return mockInstance
})

const emptyState: GameState = {
  cards: {},
  library_order: [],
  graveyard_order: [],
  life: 20,
  game_mode: 'normal',
  commander_damage: {},
  turn: 1,
  opponent_count: 3,
  opponent_names: [],
  poison_counters: 0,
  commander_returns: 0,
  active_viewer: null,
  spectator_zone_viewing: false,
}

const updatedState: GameState = {
  ...emptyState,
  life: 15,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBoard', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket)
    mockClose.mockClear()
    MockWebSocket.mockClear()
    // Clear storage so cached state doesn't leak between tests
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('connects to WebSocket on mount', () => {
    renderHook(() => useBoard())
    // URL now includes ?session_id=<uuid> query param
    expect(MockWebSocket).toHaveBeenCalledWith(
      expect.stringContaining('ws://localhost:8000/ws'),
    )
  })

  it('parses initial state message from server', () => {
    const { result } = renderHook(() => useBoard())

    act(() => {
      mockInstance.onmessage?.({ data: JSON.stringify(emptyState) })
    })

    expect(result.current.gameState).toEqual(emptyState)
  })

  it('replaces state on subsequent updates', () => {
    const { result } = renderHook(() => useBoard())

    act(() => {
      mockInstance.onmessage?.({ data: JSON.stringify(emptyState) })
    })
    act(() => {
      mockInstance.onmessage?.({ data: JSON.stringify(updatedState) })
    })

    expect(result.current.gameState?.life).toBe(15)
  })

  it('ignores malformed JSON messages without crashing', () => {
    const { result } = renderHook(() => useBoard())

    act(() => {
      mockInstance.onmessage?.({ data: 'not-valid-json' })
    })

    // State should remain null (never successfully updated; localStorage cleared in beforeEach)
    expect(result.current.gameState).toBeNull()
  })

  it('reports connected status on open', () => {
    const { result } = renderHook(() => useBoard())

    act(() => {
      mockInstance.onopen?.()
    })

    expect(result.current.connected).toBe(true)
  })

  it('reports disconnected status on close', () => {
    const { result } = renderHook(() => useBoard())

    act(() => {
      mockInstance.onopen?.()
    })
    act(() => {
      mockInstance.onclose?.()
    })

    expect(result.current.connected).toBe(false)
  })

  it('closes WebSocket on unmount', () => {
    const { unmount } = renderHook(() => useBoard())
    unmount()
    expect(mockClose).toHaveBeenCalledTimes(1)
  })
})
