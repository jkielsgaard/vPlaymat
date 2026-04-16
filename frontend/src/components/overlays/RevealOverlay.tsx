// Reveal overlay — shows the top N library cards face-up inside the arena (OBS-visible).
import { useEffect, useState } from 'react'
import type { Card } from '../../types/game'
import { CARD_BASE_W, CARD_BASE_H } from '../layout/ZoneBattlefield'
import { useSettingsContext } from '../../contexts/SettingsContext'

interface RevealOverlayProps {
  libraryCards: Card[]
  onClose: () => void
}

export function RevealOverlay({ libraryCards, onClose }: RevealOverlayProps) {
  const { settings } = useSettingsContext()
  const [count, setCount] = useState(Math.min(1, libraryCards.length))

  const cardW = CARD_BASE_W * settings.revealCardScale
  const cardH = CARD_BASE_H * settings.revealCardScale
  const revealCards = libraryCards.slice(0, count)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="bg-mtg-card border border-gold/50 rounded-xl p-4 max-w-[90%] max-h-[90%] flex flex-col gap-3 overflow-auto">
        {/* Header */}
        <div className="flex items-center gap-3 shrink-0">
          <h3 className="text-gold font-semibold text-sm flex-1">
            Revealing top {count} card{count !== 1 ? 's' : ''}
          </h3>
          <div className="flex items-center gap-1">
            <button
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-felt rounded text-sm font-bold disabled:opacity-40"
              onClick={() => setCount((n) => Math.max(1, n - 1))}
              disabled={count <= 1}
            >−</button>
            <span className="text-white text-xs font-bold w-5 text-center">{count}</span>
            <button
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-felt rounded text-sm font-bold disabled:opacity-40"
              onClick={() => setCount((n) => Math.min(libraryCards.length, n + 1))}
              disabled={count >= libraryCards.length}
            >+</button>
          </div>
          <button
            className="px-3 py-1 text-xs bg-felt border border-gold/40 text-gold rounded hover:bg-felt-light transition-colors"
            onClick={onClose}
          >Done</button>
        </div>

        {/* Cards */}
        {revealCards.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Library is empty</p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {revealCards.map((card, i) => (
              <div key={card.id} className="flex flex-col items-center gap-1 relative">
                <span className="absolute -top-1.5 -left-1.5 bg-gray-600 text-gray-200 text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10 leading-none">
                  {i + 1}
                </span>
                <img
                  src={card.image_uri}
                  alt={card.name}
                  className="rounded-lg shadow-lg border border-gold/20"
                  style={{ width: cardW, height: cardH, objectFit: 'contain' }}
                  draggable={false}
                />
                <span className="text-gray-300 text-[9px] text-center leading-tight truncate" style={{ maxWidth: cardW }}>
                  {card.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
