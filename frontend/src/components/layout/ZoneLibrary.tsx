import { CARD_BASE_W, CARD_BASE_H } from './ZoneBattlefield'
import { FaceDownCard } from '../cards/FaceDownCard'

interface ZoneLibraryProps {
  count: number
  cardScale: number
  onDraw: () => void
  onShuffle: () => void
  onBrowse: () => void
  onScry: () => void
  onReveal: () => void
}

export function ZoneLibrary({ count, cardScale, onDraw, onShuffle, onBrowse, onScry, onReveal }: ZoneLibraryProps) {
  const w = CARD_BASE_W * cardScale
  const h = CARD_BASE_H * cardScale

  return (
    <div className="flex flex-col items-center gap-1.5 w-full px-2">
      {/* Zone header */}
      <div className="flex items-center justify-between w-full">
        <span className="text-gold text-[10px] font-semibold tracking-widest uppercase">Library</span>
        <span className="text-gold font-bold text-xs">{count}</span>
      </div>

      {/* Card stack */}
      <div className="relative" style={{ width: w, height: h }}>
        {count > 0 ? (
          <>
            {count > 2 && (
              <div className="absolute" style={{ top: 3, left: 3, width: w, height: h, opacity: 0.35 }}>
                <FaceDownCard className="w-full h-full" />
              </div>
            )}
            {count > 1 && (
              <div className="absolute" style={{ top: 1.5, left: 1.5, width: w, height: h, opacity: 0.65 }}>
                <FaceDownCard className="w-full h-full" />
              </div>
            )}
            <FaceDownCard className="w-full h-full" />
            <div
              className="absolute inset-0 cursor-pointer z-10"
              title="Click to draw a card"
              onClick={onDraw}
            />
          </>
        ) : (
          <div
            className="rounded-lg border-2 border-dashed border-gold/20 flex items-center justify-center text-gray-600 text-[10px]"
            style={{ width: w, height: h }}
          >
            Empty
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1" style={{ width: w + 20 }}>
        <button
          className="px-1.5 py-0.5 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors disabled:opacity-40"
          onClick={onDraw} disabled={count === 0}
        >Draw</button>
        <button
          className="px-1.5 py-0.5 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors disabled:opacity-40"
          onClick={onShuffle} disabled={count === 0}
        >Shuffle</button>
        <button
          className="col-span-2 px-1.5 py-0.5 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors disabled:opacity-40"
          onClick={onBrowse} disabled={count === 0}
        >Browse Library</button>
        <button
          className="px-1.5 py-0.5 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors disabled:opacity-40"
          onClick={onScry} disabled={count === 0}
        >Scry</button>
        <button
          className="px-1.5 py-0.5 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors disabled:opacity-40"
          onClick={onReveal} disabled={count === 0}
        >Reveal</button>
      </div>
    </div>
  )
}
