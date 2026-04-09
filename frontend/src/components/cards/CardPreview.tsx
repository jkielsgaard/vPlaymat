import type { Card } from '../../types/game'
import { useSettingsContext } from '../../contexts/SettingsContext'

interface CardPreviewProps {
  card: Card | null
}

/**
 * Inline card preview — rendered inside the private side panel to the right of
 * the arena. No fixed/absolute positioning; the parent controls placement.
 * Renders a placeholder of the same width when no card is hovered so the
 * panel width stays stable.
 */
export function CardPreview({ card }: CardPreviewProps) {
  const { settings } = useSettingsContext()
  const previewWidth = Math.round(208 * settings.cardPreviewScale)

  if (!card) {
    return <div style={{ width: previewWidth }} />
  }

  return (
    <div style={{ width: previewWidth }} className="drop-shadow-2xl">
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
