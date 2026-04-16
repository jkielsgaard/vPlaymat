// Tests for useSettings and useSpectatorSettings — localStorage load, defaults, and updates.
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useSettings, SETTINGS_DEFAULTS } from '../hooks/useSettings'
import { useSpectatorSettings } from '../hooks/useSpectatorSettings'

const SETTINGS_KEY = 'vmagic-settings'
const SPECTATOR_KEY = 'vmagic-spectator-prefs'

// ---------------------------------------------------------------------------
// useSettings

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when localStorage has no saved settings', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(SETTINGS_DEFAULTS)
  })

  it('loads saved settings from localStorage on mount', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ arenaWidth: 1920, arenaHeight: 1080 }))
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.arenaWidth).toBe(1920)
    expect(result.current.settings.arenaHeight).toBe(1080)
  })

  it('fills in missing keys from defaults when loading partial saved settings', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ cardScale: 2.0 }))
    const { result } = renderHook(() => useSettings())
    // Saved value is used
    expect(result.current.settings.cardScale).toBe(2.0)
    // Missing keys fall back to defaults
    expect(result.current.settings.arenaWidth).toBe(SETTINGS_DEFAULTS.arenaWidth)
  })

  it('falls back to defaults when localStorage contains corrupt JSON', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-valid-json')
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(SETTINGS_DEFAULTS)
  })

  it('updateSettings merges a partial update into the current settings', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateSettings({ arenaWidth: 2560, arenaHeight: 1440 })
    })

    expect(result.current.settings.arenaWidth).toBe(2560)
    expect(result.current.settings.arenaHeight).toBe(1440)
    // Unrelated keys are unchanged
    expect(result.current.settings.cardScale).toBe(SETTINGS_DEFAULTS.cardScale)
  })

  it('updateSettings persists the merged settings to localStorage', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateSettings({ cardScale: 1.8 })
    })

    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
    expect(stored.cardScale).toBe(1.8)
  })
})

// ---------------------------------------------------------------------------
// useSpectatorSettings

describe('useSpectatorSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when localStorage has no saved spectator settings', () => {
    const { result } = renderHook(() => useSpectatorSettings())
    expect(result.current.settings.previewEnabled).toBe(true)
    expect(result.current.settings.previewScale).toBe(1.5)
    expect(result.current.settings.previewCorner).toBe('bottom-right')
  })

  it('loads saved spectator settings from localStorage', () => {
    localStorage.setItem(SPECTATOR_KEY, JSON.stringify({ previewScale: 2.5 }))
    const { result } = renderHook(() => useSpectatorSettings())
    expect(result.current.settings.previewScale).toBe(2.5)
  })

  it('falls back to defaults when localStorage contains corrupt JSON', () => {
    localStorage.setItem(SPECTATOR_KEY, '{bad json}')
    const { result } = renderHook(() => useSpectatorSettings())
    expect(result.current.settings.previewEnabled).toBe(true)
  })

  it('update() merges a partial change', () => {
    const { result } = renderHook(() => useSpectatorSettings())

    act(() => {
      result.current.update({ previewCorner: 'top-left' })
    })

    expect(result.current.settings.previewCorner).toBe('top-left')
    expect(result.current.settings.previewEnabled).toBe(true) // unchanged
  })

  it('update() persists to localStorage', () => {
    const { result } = renderHook(() => useSpectatorSettings())

    act(() => {
      result.current.update({ previewEnabled: false })
    })

    const stored = JSON.parse(localStorage.getItem(SPECTATOR_KEY)!)
    expect(stored.previewEnabled).toBe(false)
  })
})
