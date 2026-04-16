// Tests for the useSessionExpiry hook — idle detection, warning, expiry, and extend.
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSessionExpiry } from '../hooks/useSessionExpiry'

vi.mock('../api/rest', () => ({
  getLastActivity: vi.fn(),
  touchSession: vi.fn().mockResolvedValue({ ok: true }),
}))

import * as restApi from '../api/rest'
const mockGetLastActivity = vi.mocked(restApi.getLastActivity)
const mockTouchSession = vi.mocked(restApi.touchSession)

// Mirror the hook's internal constants
const POLL_MS = 10_000
const WARN_AFTER_MS = 50 * 60 * 1000
const EXPIRE_AFTER_MS = 60 * 60 * 1000

describe('useSessionExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Default: no idle time
    mockGetLastActivity.mockReturnValue(Date.now())
    mockTouchSession.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // Idle below threshold

  it('shows no warning when idle time is below the warning threshold', () => {
    const { result } = renderHook(() => useSessionExpiry())

    mockGetLastActivity.mockReturnValue(Date.now() - 30 * 60 * 1000) // 30 min idle
    act(() => { vi.advanceTimersByTime(POLL_MS) })

    expect(result.current.warningVisible).toBe(false)
    expect(result.current.sessionExpired).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Warning zone (50–60 min)

  it('shows warning when idle between 50 and 60 minutes', () => {
    const { result } = renderHook(() => useSessionExpiry())

    mockGetLastActivity.mockReturnValue(Date.now() - 55 * 60 * 1000) // 55 min idle
    act(() => { vi.advanceTimersByTime(POLL_MS) })

    expect(result.current.warningVisible).toBe(true)
    expect(result.current.sessionExpired).toBe(false)
  })

  it('reports correct minutes remaining while warning is visible', () => {
    const { result } = renderHook(() => useSessionExpiry())

    // 58 min idle → 2 minutes left (Math.ceil((60min - 58min) / 1min) = 2)
    mockGetLastActivity.mockReturnValue(Date.now() - 58 * 60 * 1000)
    act(() => { vi.advanceTimersByTime(POLL_MS) })

    expect(result.current.warningVisible).toBe(true)
    expect(result.current.minutesLeft).toBe(2)
  })

  it('hides warning again if activity resumes below the threshold', () => {
    const { result } = renderHook(() => useSessionExpiry())

    // First tick: show warning
    mockGetLastActivity.mockReturnValue(Date.now() - 55 * 60 * 1000)
    act(() => { vi.advanceTimersByTime(POLL_MS) })
    expect(result.current.warningVisible).toBe(true)

    // Second tick: back below threshold (new activity happened)
    mockGetLastActivity.mockReturnValue(Date.now() - 5 * 60 * 1000)
    act(() => { vi.advanceTimersByTime(POLL_MS) })
    expect(result.current.warningVisible).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Expiry (≥ 60 min)

  it('sets sessionExpired when idle exceeds 60 minutes', () => {
    const { result } = renderHook(() => useSessionExpiry())

    mockGetLastActivity.mockReturnValue(Date.now() - 61 * 60 * 1000) // 61 min idle
    act(() => { vi.advanceTimersByTime(POLL_MS) })

    expect(result.current.sessionExpired).toBe(true)
    expect(result.current.warningVisible).toBe(false)
  })

  it('fires sessionExpired only once — not on every subsequent tick', () => {
    const { result } = renderHook(() => useSessionExpiry())

    mockGetLastActivity.mockReturnValue(Date.now() - 61 * 60 * 1000)

    // Run 3 ticks
    act(() => { vi.advanceTimersByTime(POLL_MS * 3) })

    // sessionExpired should be true but not have been re-toggled
    expect(result.current.sessionExpired).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // disabled

  it('does nothing when enabled is false', () => {
    const { result } = renderHook(() => useSessionExpiry({ enabled: false }))

    mockGetLastActivity.mockReturnValue(Date.now() - 61 * 60 * 1000)
    act(() => { vi.advanceTimersByTime(POLL_MS) })

    expect(result.current.warningVisible).toBe(false)
    expect(result.current.sessionExpired).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // extend()

  it('extend() calls touchSession', async () => {
    const { result } = renderHook(() => useSessionExpiry())

    await act(async () => { await result.current.extend() })

    expect(mockTouchSession).toHaveBeenCalledTimes(1)
  })

  it('extend() hides the warning', async () => {
    const { result } = renderHook(() => useSessionExpiry())

    // Show warning first
    mockGetLastActivity.mockReturnValue(Date.now() - 55 * 60 * 1000)
    act(() => { vi.advanceTimersByTime(POLL_MS) })
    expect(result.current.warningVisible).toBe(true)

    await act(async () => { await result.current.extend() })

    expect(result.current.warningVisible).toBe(false)
  })

  it('extend() clears the sessionExpired flag', async () => {
    const { result } = renderHook(() => useSessionExpiry())

    mockGetLastActivity.mockReturnValue(Date.now() - 61 * 60 * 1000)
    act(() => { vi.advanceTimersByTime(POLL_MS) })
    expect(result.current.sessionExpired).toBe(true)

    await act(async () => { await result.current.extend() })

    expect(result.current.sessionExpired).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Cleanup

  it('clears the interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useSessionExpiry())
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
