import type { Card } from '../../types/game'
import type { SpectatorSettings, SpectatorPreviewCorner } from '../../hooks/useSpectatorSettings'

interface Props {
  card: Card | null
  settings: SpectatorSettings
}

const CORNER_STYLE: Record<SpectatorPreviewCorner, React.CSSProperties> = {
  'top-left':     { top: 8,  left: 8  },
  'top-right':    { top: 8,  right: 8 },
  'bottom-left':  { bottom: 8, left: 8  },
  'bottom-right': { bottom: 8, right: 8 },
}

export function SpectatorCardPreview({ card, settings }: Props) {
  if (!settings.previewEnabled || !card) return null

  const width = Math.round(160 * settings.previewScale)

  return (
    <div
      className="absolute pointer-events-none z-10 drop-shadow-2xl"
      style={{ width, ...CORNER_STYLE[settings.previewCorner] }}
    >
      <img
        src={card.image_uri}
        alt={card.name}
        className="w-full rounded-xl border border-gold/20"
        draggable={false}
      />
    </div>
  )
}
