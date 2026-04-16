// Face-down card — renders the MTG card back image for Morph, Manifest, and library stacks.
import cardBackSvg from '../../assets/card-back.svg'

// Official MTG card back from Scryfall CDN — falls back to local SVG if unavailable
const SCRYFALL_CARD_BACK =
  'https://cards.scryfall.io/normal/back/0/0/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg'

interface FaceDownCardProps {
  className?: string
  style?: React.CSSProperties
}

export function FaceDownCard({ className = '', style }: FaceDownCardProps) {
  return (
    <div className={`select-none ${className}`} style={style}>
      <img
        src={SCRYFALL_CARD_BACK}
        alt="Face-down card"
        className="w-full h-full object-contain rounded-lg shadow-md pointer-events-none"
        draggable={false}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).src = cardBackSvg
        }}
      />
    </div>
  )
}
