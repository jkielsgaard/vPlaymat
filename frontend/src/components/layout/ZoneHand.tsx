// Hand zone — displays cards in hand and handles playing them to the battlefield.
import type { Card } from '../../types/game'
import { CardView } from '../cards/CardView'
import { CARD_BASE_W, CARD_BASE_H } from './ZoneBattlefield'

interface ZoneHandProps {
  cards: Card[]
  cardScale: number
  onContextMenu: (e: React.MouseEvent, card: Card) => void
  onHover: (card: Card | null) => void
}

/** Cards start overlapping once the hand exceeds this count */
const OVERLAP_THRESHOLD = 7

export function ZoneHand({ cards, cardScale, onContextMenu, onHover }: ZoneHandProps) {
  const cardW = CARD_BASE_W * cardScale
  const cardH = CARD_BASE_H * cardScale

  function handleDragStart(e: React.DragEvent, card: Card) {
    e.dataTransfer.setData('cardId', card.id)
    e.dataTransfer.setData('fromZone', 'hand')
  }

  // When overlapping, shrink the right-side gap so all cards fit
  const overlap = cards.length > OVERLAP_THRESHOLD
  // Amount each card overlaps the previous one (positive = overlap)
  const overlapPx = overlap
    ? Math.max(cardW * 0.1, cardW - (cardW * OVERLAP_THRESHOLD) / cards.length)
    : 0

  return (
    <div className="relative">
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-gold text-xs font-semibold tracking-widest uppercase whitespace-nowrap">
        Hand ({cards.length})
      </span>
      <div className="flex items-end" style={{ minHeight: cardH }}>
        {cards.length === 0 ? (
          <div className="text-gray-600 text-xs self-center px-4">No cards in hand</div>
        ) : (
          cards.map((card, i) => (
            <div
              key={card.id}
              style={{
                marginRight: overlap && i < cards.length - 1 ? -overlapPx : 0,
                zIndex: i + 1,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <CardView
                card={card}
                cardScale={cardScale}
                onContextMenu={onContextMenu}
                draggable
                onDragStart={handleDragStart}
                onMouseEnter={() => onHover(card)}
                onMouseLeave={() => onHover(null)}
                className="hover:-translate-y-3 transition-transform"
                style={{ width: cardW, height: cardH, display: 'block' }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
