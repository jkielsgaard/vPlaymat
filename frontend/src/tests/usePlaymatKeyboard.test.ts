// Tests for usePlaymatKeyboard — d/n/t/u shortcut dispatch and input field suppression.
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePlaymatKeyboard } from '../hooks/usePlaymatKeyboard'

function press(key: string, target?: Partial<EventTarget>) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true })
  if (target) Object.defineProperty(event, 'target', { value: target })
  window.dispatchEvent(event)
}

describe('usePlaymatKeyboard', () => {
  const handleDraw = vi.fn()
  const handleNextTurn = vi.fn()
  const handleBulkTap = vi.fn()
  const handleBulkUntap = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Unmount is handled by renderHook cleanup
  })

  function setup(selectedCount = 0) {
    return renderHook(() =>
      usePlaymatKeyboard({
        handleDraw,
        handleNextTurn,
        handleBulkTap,
        handleBulkUntap,
        selectedIds: new Set(Array.from({ length: selectedCount }, (_, i) => `card-${i}`)),
      })
    )
  }

  it('d key calls handleDraw with 1', () => {
    const { unmount } = setup()
    press('d')
    expect(handleDraw).toHaveBeenCalledWith(1)
    unmount()
  })

  it('n key calls handleNextTurn', () => {
    const { unmount } = setup()
    press('n')
    expect(handleNextTurn).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('t key calls handleBulkTap when cards are selected', () => {
    const { unmount } = setup(2)
    press('t')
    expect(handleBulkTap).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('t key does nothing when no cards are selected', () => {
    const { unmount } = setup(0)
    press('t')
    expect(handleBulkTap).not.toHaveBeenCalled()
    unmount()
  })

  it('u key calls handleBulkUntap when cards are selected', () => {
    const { unmount } = setup(2)
    press('u')
    expect(handleBulkUntap).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('u key does nothing when no cards are selected', () => {
    const { unmount } = setup(0)
    press('u')
    expect(handleBulkUntap).not.toHaveBeenCalled()
    unmount()
  })

  it('suppresses shortcuts when target is an INPUT', () => {
    const { unmount } = setup()
    press('d', { tagName: 'INPUT' })
    expect(handleDraw).not.toHaveBeenCalled()
    unmount()
  })

  it('suppresses shortcuts when target is a TEXTAREA', () => {
    const { unmount } = setup()
    press('n', { tagName: 'TEXTAREA' })
    expect(handleNextTurn).not.toHaveBeenCalled()
    unmount()
  })

  it('removes the event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = setup()
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })
})
