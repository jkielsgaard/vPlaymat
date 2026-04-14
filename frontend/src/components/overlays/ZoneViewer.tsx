import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../../types/game'
import { CardView } from '../cards/CardView'
import { CARD_BASE_W, CARD_BASE_H } from '../layout/ZoneBattlefield'

interface ZoneViewerProps {
  title: string
  cards: Card[]
  cardScale: number
  onContextMenu: (e: React.MouseEvent, card: Card) => void
  onHover: (card: Card | null) => void
  onClose: () => void
  readOnly?: boolean
}

export function ZoneViewer({ title, cards, cardScale, onContextMenu, onHover, onClose, readOnly = false }: ZoneViewerProps) {
  const cardW = CARD_BASE_W * cardScale
  const cardH = CARD_BASE_H * cardScale

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Backdrop and panel are separate siblings so the panel is never a child
  // of the backdrop — avoids any z-index competition with the parent bg.
  return createPortal(
    <div data-testid="zone-viewer" role="dialog" aria-modal="true">
      {/* Panel — no backdrop, floats over the page */}
      <div
        data-testid="zone-viewer-backdrop"
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 201 }}
        onClick={onClose}
      >
        <div
          className="pointer-events-auto bg-gray-800 border border-gold/60 rounded-xl p-5 max-w-[95vw] max-h-[85vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)]"
          style={{ width: Math.max(400, cardW * 4 + 80) }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-gold font-semibold text-base">
              {title}
              <span className="text-gray-400 font-normal text-sm ml-2">
                ({cards.length} card{cards.length !== 1 ? 's' : ''})
              </span>
            </h3>
            <button
              aria-label="Close"
              className="text-gray-400 hover:text-gold text-xl leading-none"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {/* Card grid */}
          <div className="overflow-y-auto flex-1">
            {cards.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No cards here</p>
            ) : (
              <div className="flex flex-wrap gap-3 justify-start">
                {cards.map((card) => (
                  <div key={card.id} className="flex flex-col items-center gap-1">
                    <CardView
                      card={card}
                      cardScale={cardScale}
                      onContextMenu={onContextMenu}
                      onMouseEnter={() => onHover(card)}
                      onMouseLeave={() => onHover(null)}
                      style={{ width: cardW, height: cardH }}
                    />
                    <span className="text-gray-300 text-[9px] text-center leading-tight max-w-[80px] truncate">
                      {card.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!readOnly && (
            <p className="text-gray-500 text-xs mt-3 shrink-0">
              Right-click a card to move it · Esc or click outside to close
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
