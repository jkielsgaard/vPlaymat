import { useState } from 'react'
import type { Card } from '../../types/game'
import { CardView } from '../cards/CardView'
import { ZoneViewer } from '../overlays/ZoneViewer'
import { useSettingsContext } from '../../contexts/SettingsContext'
import { CARD_BASE_W, CARD_BASE_H } from './ZoneBattlefield'

interface ZoneGraveyardProps {
  cards: Card[]
  cardScale: number
  onContextMenu: (e: React.MouseEvent, card: Card) => void
  onHover: (card: Card | null) => void
  // Callbacks so the parent knows when the viewer opens/closes
  onViewerOpen?: () => void
  onViewerClose?: () => void
  // Controlled mode — when provided, overrides internal open state
  controlledOpen?: boolean
  // Suppress all click interaction (read-only display)
  readOnly?: boolean
}

export function ZoneGraveyard({
  cards,
  cardScale,
  onContextMenu,
  onHover,
  onViewerOpen,
  onViewerClose,
  controlledOpen,
  readOnly = false,
}: ZoneGraveyardProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const { settings } = useSettingsContext()
  // cards are passed in graveyard order (index 0 = most recently placed = top)
  const top = cards[0] ?? null
  const w = CARD_BASE_W * cardScale
  const h = CARD_BASE_H * cardScale

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  function handleOpen() {
    if (readOnly || cards.length === 0) return
    if (controlledOpen === undefined) setInternalOpen(true)
    onViewerOpen?.()
  }

  function handleClose() {
    if (controlledOpen === undefined) setInternalOpen(false)
    onViewerClose?.()
  }

  return (
    <div className="flex flex-col items-center gap-1.5 w-full px-2">
      {/* Zone header */}
      <div className="flex items-center justify-between w-full">
        <span className="text-gold text-[10px] font-semibold tracking-widest uppercase">Graveyard</span>
        <span className="text-gold font-bold text-xs">{cards.length}</span>
      </div>

      {/* Card preview */}
      <div
        data-testid="graveyard-zone"
        className={`rounded-lg overflow-hidden transition-colors ${
          readOnly ? '' : 'cursor-pointer'
        } ${
          top
            ? (!readOnly ? 'hover:ring-1 hover:ring-gold/40' : '')
            : 'border border-dashed border-gold/20 flex items-center justify-center'
        }`}
        style={{ width: w, height: h }}
        onClick={handleOpen}
        title={readOnly ? undefined : cards.length > 0 ? 'Click to view graveyard' : 'Graveyard is empty'}
      >
        {top ? (
          <CardView
            card={top}
            cardScale={cardScale}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(top)}
            onMouseLeave={() => onHover(null)}
            style={{ width: w, height: h }}
          />
        ) : (
          <span className="text-gray-600 text-[10px]">Empty</span>
        )}
      </div>

      {/* Top card name */}
      {top && (
        <span className="text-gray-400 text-[9px] text-center leading-tight truncate w-full px-1">
          {top.name}
        </span>
      )}

      {isOpen && (
        <ZoneViewer
          title="Graveyard"
          cards={cards}
          cardScale={settings.zoneViewerCardScale}
          onContextMenu={readOnly ? () => {} : onContextMenu}
          onHover={onHover}
          onClose={handleClose}
          readOnly={readOnly}
        />
      )}
    </div>
  )
}
