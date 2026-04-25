// Card preview — large card image shown on hover in the player's private area.
import type { Card } from '../../types/game'
import { useSettingsContext } from '../../contexts/SettingsContext'

interface CardPreviewProps {
  card: Card | null
  // 'panel' (default): inline, parent controls placement, holds space when empty.
  // 'overlay': no placeholder; caller absolutely-positions the wrapper.
  variant?: 'panel' | 'overlay'
}

export function CardPreview({ card, variant = 'panel' }: CardPreviewProps) {
  const { settings } = useSettingsContext()
  const previewWidth = Math.round(208 * settings.cardPreviewScale)

  if (!card) {
    // Overlay mode renders nothing when no card is hovered — parent shows/hides the wrapper.
    if (variant === 'overlay') return null
    return <div style={{ width: previewWidth }} />
  }

  return (
    <div
      style={{ width: previewWidth }}
      className={`drop-shadow-2xl ${variant === 'overlay' ? 'rounded-xl bg-black/60 p-1' : ''}`}
    >
      <img
        src={card.image_uri}
        alt={card.name}
        className="w-full rounded-xl border border-gold/20"
        draggable={false}
      />
      <div className="mt-1 text-center text-gold text-xs font-semibold truncate px-1">
        {card.name}
      </div>
    </div>
  )
}
