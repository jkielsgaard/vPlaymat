import { useState, useCallback, useRef } from 'react'

export interface LogEntry {
  id: number
  turn: number
  message: string
}

export function useGameLog() {
  const nextId = useRef(0)
  const [entries, setEntries] = useState<LogEntry[]>([])

  const addEntry = useCallback((turn: number, message: string) => {
    setEntries((prev) => [{ id: nextId.current++, turn, message }, ...prev])
  }, [])

  const clearLog = useCallback(() => setEntries([]), [])

  return { entries, addEntry, clearLog }
}
