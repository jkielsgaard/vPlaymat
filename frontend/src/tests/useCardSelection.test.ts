// Tests for useCardSelection — initial state, setSelectedIds, and clearSelection.
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useCardSelection } from '../hooks/useCardSelection'

describe('useCardSelection', () => {
  it('starts with an empty selection', () => {
    const { result } = renderHook(() => useCardSelection())
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('setSelectedIds replaces the selection', () => {
    const { result } = renderHook(() => useCardSelection())
    act(() => {
      result.current.setSelectedIds(new Set(['card-1', 'card-2']))
    })
    expect(result.current.selectedIds.has('card-1')).toBe(true)
    expect(result.current.selectedIds.has('card-2')).toBe(true)
    expect(result.current.selectedIds.size).toBe(2)
  })

  it('clearSelection resets to empty', () => {
    const { result } = renderHook(() => useCardSelection())
    act(() => {
      result.current.setSelectedIds(new Set(['card-1']))
    })
    act(() => {
      result.current.clearSelection()
    })
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('setSelectedIds is a stable reference per render', () => {
    const { result, rerender } = renderHook(() => useCardSelection())
    const first = result.current.setSelectedIds
    rerender()
    // React useState setters are stable — same reference after rerender
    expect(result.current.setSelectedIds).toBe(first)
  })
})
