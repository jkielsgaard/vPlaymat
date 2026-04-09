import { useEffect } from 'react'
import type { LogEntry } from '../../hooks/useGameLog'

interface GameLogProps {
  entries: LogEntry[]
  arenaWidth: number
  onClear: () => void
  onClose: () => void
}

export function GameLog({ entries, arenaWidth, onClear, onClose }: GameLogProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      data-testid="game-log"
      className="bg-gray-800 border border-gold/60 rounded-xl mt-4 p-5 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.6)]"
      style={{ width: arenaWidth }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <h3 className="text-gold font-semibold text-base flex-1">
          Game Log
          <span className="text-gray-500 font-normal text-sm ml-2">({entries.length} events)</span>
        </h3>
        <button
          className="px-3 py-1 text-xs bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors"
          onClick={onClear}
        >
          Clear
        </button>
        <button
          aria-label="Close"
          className="text-gray-400 hover:text-gold text-xl leading-none"
          onClick={onClose}
        >×</button>
      </div>

      {/* Log entries */}
      <div className="overflow-y-auto max-h-48 flex flex-col gap-0.5">
        {entries.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">No events yet</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-baseline gap-2 text-xs py-0.5 border-b border-white/5">
              <span className="text-gold/70 font-semibold shrink-0 w-12">T{entry.turn}</span>
              <span className="text-gray-300">{entry.message}</span>
            </div>
          ))
        )}
      </div>

      <p className="text-gray-600 text-xs mt-3 shrink-0">
        Newest events at top · Esc or × to close · Not visible to stream viewers
      </p>
    </div>
  )
}
