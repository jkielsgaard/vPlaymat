import type { Card } from '../../types/game'
import { CardView } from '../cards/CardView'
import { CARD_BASE_W, CARD_BASE_H } from './ZoneBattlefield'
import { useSettingsContext } from '../../contexts/SettingsContext'
import type { CommanderZoneCorner } from '../../hooks/useSettings'

interface ZoneCommandProps {
  card: Card | null
  onContextMenu: (e: React.MouseEvent, card: Card) => void
  onHover: (card: Card | null) => void
  onDragStart?: (e: React.DragEvent, card: Card) => void
  onReturnCommander?: () => void
  commanderReturns?: number
  onResetReturns?: () => void
}

const CORNER_CLASSES: Record<CommanderZoneCorner, string> = {
  'top-right':    'top-2 right-2',
  'top-left':     'top-2 left-2',
  'bottom-right': 'bottom-2 right-2',
  'bottom-left':  'bottom-2 left-2',
}

export function ZoneCommand({ card, onContextMenu, onHover, onDragStart, onReturnCommander, commanderReturns = 0, onResetReturns }: ZoneCommandProps) {
  const { settings } = useSettingsContext()
  const scale = settings.commanderCardScale
  const corner = settings.commanderZoneCorner
  const cardW = CARD_BASE_W * scale
  const cardH = CARD_BASE_H * scale

  return (
    <div
      data-testid="zone-command"
      className={`absolute flex flex-col items-center gap-1 ${CORNER_CLASSES[corner]}`}
      style={{ width: cardW + 8, pointerEvents: 'none' }}
    >
      <span
        className="text-gold text-[9px] font-semibold tracking-widest uppercase"
        style={{ pointerEvents: 'none' }}
      >
        Command
      </span>
      {/* Commander return counter */}
      <div
        className="flex items-center gap-1"
        style={{ pointerEvents: 'auto' }}
      >
        <span className="text-gray-200 text-[11px] font-semibold" title="Times returned to command zone (commander tax)">
          Tax: {commanderReturns > 0 ? `+${commanderReturns * 2}` : '0'}
        </span>
        {commanderReturns > 0 && onResetReturns && (
          <button
            className="text-gray-500 hover:text-gray-300 text-[10px] leading-none"
            title="Reset commander tax counter"
            onClick={onResetReturns}
          >
            ×
          </button>
        )}
      </div>
      <div
        className="border border-gold/40 rounded p-0.5 bg-black/30"
        style={{ width: cardW + 4, height: cardH + 4, pointerEvents: 'none' }}
      >
        {card ? (
          <CardView
            card={card}
            cardScale={scale}
            onTap={() => {}}
            onContextMenu={onContextMenu}
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            onMouseEnter={() => onHover(card)}
            onMouseLeave={() => onHover(null)}
            style={{ width: cardW, height: cardH, pointerEvents: 'auto' }}
          />
        ) : (
          <div
            className="w-full h-full rounded border border-dashed border-gold/20 flex flex-col items-center justify-center gap-1"
            style={{ width: cardW, height: cardH }}
          >
            <span className="text-gray-600 text-[10px] text-center leading-tight px-1">
              No<br/>Commander
            </span>
            {onReturnCommander && (
              <button
                className="text-[9px] px-1 py-0.5 bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light leading-none"
                style={{ pointerEvents: 'auto' }}
                onClick={onReturnCommander}
              >
                Return
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
