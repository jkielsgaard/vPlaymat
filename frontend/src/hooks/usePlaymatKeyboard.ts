// Keyboard shortcuts for the playmat — d (draw), n (next turn), t/u (bulk tap/untap).
import { useEffect, useRef } from 'react'

interface UsePlaymatKeyboardParams {
  handleDraw: (count?: number) => void
  handleNextTurn: () => void
  handleBulkTap: () => void
  handleBulkUntap: () => void
  selectedIds: Set<string>
}

export function usePlaymatKeyboard({
  handleDraw,
  handleNextTurn,
  handleBulkTap,
  handleBulkUntap,
  selectedIds,
}: UsePlaymatKeyboardParams) {
  // Ref so the effect doesn't re-register on every render while still seeing current values
  const ref = useRef({ handleDraw, handleNextTurn, handleBulkTap, handleBulkUntap, selectedIds })
  ref.current = { handleDraw, handleNextTurn, handleBulkTap, handleBulkUntap, selectedIds }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return
      const { handleDraw, handleNextTurn, handleBulkTap, handleBulkUntap, selectedIds } = ref.current
      switch (e.key.toLowerCase()) {
        case 'd': e.preventDefault(); handleDraw(1); break
        case 'n': e.preventDefault(); handleNextTurn(); break
        case 't': if (selectedIds.size > 0) { e.preventDefault(); handleBulkTap() } break
        case 'u': if (selectedIds.size > 0) { e.preventDefault(); handleBulkUntap() } break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
