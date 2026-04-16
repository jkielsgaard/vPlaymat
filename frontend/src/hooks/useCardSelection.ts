// Card selection state — tracks which card IDs are currently selected on the battlefield.
import { useState } from 'react'

export function useCardSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function clearSelection() {
    setSelectedIds(new Set())
  }

  return { selectedIds, setSelectedIds, clearSelection }
}
