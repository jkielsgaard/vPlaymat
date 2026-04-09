import type { Card } from '../../types/game'
import { useSettingsContext } from '../../contexts/SettingsContext'
import cardBackSvg from '../../assets/card-back.svg'

// Base card dimensions at scale 1.0 (must match ZoneBattlefield constants)
const BASE_W = 80
const BASE_H = 112

interface CardViewProps {
  card: Card
  cardScale?: number
  onTap?: (cardId: string) => void
  onContextMenu?: (e: React.MouseEvent, card: Card) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, card: Card) => void
  onDragEnd?: (e: React.DragEvent, card: Card) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  style?: React.CSSProperties
  className?: string
  showCounterBadges?: boolean
}

export function CardView({
  card,
  cardScale = 1,
  onTap,
  onContextMenu,
  draggable,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  style,
  className = '',
  showCounterBadges = true,
}: CardViewProps) {
  const { settings } = useSettingsContext()
  const badgeFontSize = Math.round(9 * settings.counterBadgeScale)
  const cw = BASE_W * cardScale
  const ch = BASE_H * cardScale

  function handleDragStart(e: React.DragEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    e.dataTransfer.setData('grabOffsetX', String(e.clientX - rect.left))
    e.dataTransfer.setData('grabOffsetY', String(e.clientY - rect.top))
    onDragStart?.(e, card)
  }

  const isFaceDown = card.face_down === true
  const isTransformed = card.transformed === true
  const imgSrc = isFaceDown
    ? (cardBackSvg as string)
    : isTransformed && card.back_image_uri
    ? card.back_image_uri
    : card.image_uri

  // When tapped the ZoneBattlefield wrapper is already landscape (cardH × cardW).
  // We render a portrait inner div that rotates 90° to fill it.
  // When untapped the wrapper is portrait; inner div just fills it (no rotation).
  const innerStyle: React.CSSProperties = card.tapped
    ? {
        position: 'absolute',
        width: cw,
        height: ch,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        transformOrigin: 'center',
        transition: 'transform 150ms',
      }
    : { position: 'absolute', inset: 0 }

  return (
    <div
      data-testid="card-view"
      className={`relative cursor-pointer select-none w-full h-full ${className}`}
      style={style}
      onClick={() => onTap?.(card.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.(e, card)
      }}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? (e) => onDragEnd?.(e, card) : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Inner portrait div — rotates 90° when tapped to fill landscape wrapper */}
      <div style={innerStyle}>
        <img
          src={imgSrc}
          alt={isFaceDown ? 'Face-down card' : card.name}
          className="w-full h-full object-contain rounded-lg shadow-md pointer-events-none"
          draggable={false}
        />
        {/* Face-down indicator */}
        {isFaceDown && (
          <div className="absolute top-1 left-1 bg-black/70 text-gray-300 text-[8px] font-bold px-1 rounded leading-tight z-10">
            ↓
          </div>
        )}
        {/* Transformed indicator */}
        {isTransformed && !isFaceDown && (
          <div className="absolute top-1 left-1 bg-purple-900/80 text-purple-300 text-[8px] font-bold px-1 rounded leading-tight z-10">
            ⟳
          </div>
        )}
        {/* Tapped tint */}
        {card.tapped && settings.tappedCardTint && (
          <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ background: 'rgba(180,120,0,0.22)' }} />
        )}
      </div>

      {/* Counter badges — outside inner div so they don't rotate with card art */}
      {showCounterBadges && (
        <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5">
          {!isFaceDown && Object.entries(card.counters).map(([type, count]) => {
            if (count === 0) return null
            let label = ''
            let cls = 'bg-gray-700 text-white'
            if (type === 'p1p1') { label = `+${count}/+${count}`; cls = 'bg-green-700 text-white' }
            else if (type === 'm1m1') { label = `-${count}/-${count}`; cls = 'bg-red-700 text-white' }
            else if (type === 'loyalty') { label = `⬡${count}`; cls = 'bg-purple-700 text-white' }
            else if (type === 'charge') { label = `◎${count}`; cls = 'bg-blue-700 text-white' }
            else { label = `${count} ${type}` }
            return (
              <span key={type} className={`${cls} font-bold px-1 rounded leading-tight`} style={{ fontSize: badgeFontSize }}>
                {label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
