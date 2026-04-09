import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import type { Card } from '../../types/game'

const COMMON_TYPES = [
  { type: 'p1p1',    label: '+1/+1',   cls: 'text-green-400' },
  { type: 'm1m1',    label: '-1/-1',   cls: 'text-red-400' },
  { type: 'loyalty', label: 'Loyalty', cls: 'text-purple-400' },
  { type: 'charge',  label: 'Charge',  cls: 'text-blue-400' },
  { type: 'age',     label: 'Age',     cls: 'text-yellow-400' },
  { type: 'time',    label: 'Time',    cls: 'text-cyan-400' },
]

interface CounterMenuProps {
  card: Card
  position: { x: number; y: number }
  onAdjust: (cardId: string, type: string, delta: number) => void
  onClose: () => void
}

export function CounterMenu({ card, position, onAdjust, onClose }: CounterMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Merge common types with any custom types already on the card
  const existingTypes = Object.keys(card.counters).filter(
    (t) => !COMMON_TYPES.find((c) => c.type === t)
  )
  const rows = [
    ...COMMON_TYPES,
    ...existingTypes.map((t) => ({ type: t, label: t, cls: 'text-gray-300' })),
  ]

  return createPortal(
    <div
      ref={ref}
      className="fixed bg-mtg-card border border-gold/40 rounded-lg shadow-2xl py-2 min-w-[180px]"
      style={{ left: position.x, top: position.y, zIndex: 600 }}
    >
      <div className="px-3 pb-1.5 text-gold text-xs font-semibold border-b border-gold/20 mb-1 truncate">
        Counters — {card.name}
      </div>
      {rows.map(({ type, label, cls }) => {
        const count = card.counters[type] ?? 0
        return (
          <div key={type} className="flex items-center gap-2 px-3 py-1">
            <span className={`${cls} text-xs w-16 shrink-0`}>{label}</span>
            <button
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-felt rounded text-sm font-bold leading-none"
              onClick={() => onAdjust(card.id, type, -1)}
            >−</button>
            <span className="text-white text-xs font-bold w-5 text-center">{count}</span>
            <button
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-felt rounded text-sm font-bold leading-none"
              onClick={() => onAdjust(card.id, type, 1)}
            >+</button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
