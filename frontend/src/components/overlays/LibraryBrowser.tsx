// Library browser — private panel below the arena showing all library cards face-up.
import { useEffect, useState } from 'react'
import type { Card } from '../../types/game'
import { CardView } from '../cards/CardView'
import { CARD_BASE_W, CARD_BASE_H } from '../layout/ZoneBattlefield'

interface LibraryBrowserProps {
  /** Cards in current draw order (index 0 = top of library) */
  cards: Card[]
  cardScale: number
  /** Width of the arena so the panel matches it */
  arenaWidth: number
  /** Max pixel height of the scrollable card area */
  maxHeight: number
  shuffleAfter: boolean
  onShuffleAfterChange: (val: boolean) => void
  onContextMenu: (e: React.MouseEvent, card: Card) => void
  onHover: (card: Card | null) => void
  onShuffle: () => void
  onClose: () => void
}

export function LibraryBrowser({
  cards,
  cardScale,
  arenaWidth,
  maxHeight,
  shuffleAfter,
  onShuffleAfterChange,
  onContextMenu,
  onHover,
  onShuffle,
  onClose,
}: LibraryBrowserProps) {
  const [search, setSearch] = useState('')
  const cardW = CARD_BASE_W * cardScale
  const cardH = CARD_BASE_H * cardScale

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const query = search.trim().toLowerCase()
  const filtered = cards
    .map((card, i) => ({ card, position: i + 1 }))
    .filter(({ card }) => !query || card.name.toLowerCase().includes(query))

  function handleContextMenu(e: React.MouseEvent, card: Card) {
    onContextMenu(e, card)
    if (shuffleAfter) onShuffle()
  }

  return (
    <div
      data-testid="library-browser"
      className="bg-gray-800 border border-gold/60 rounded-xl mt-4 p-5 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.6)]"
      style={{ width: arenaWidth }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0 flex-wrap">
        <h3 className="text-gold font-semibold text-base shrink-0">
          Library
          <span className="text-gray-400 font-normal text-sm ml-2">
            ({cards.length} card{cards.length !== 1 ? 's' : ''})
          </span>
        </h3>

        <input
          data-testid="library-search"
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[140px] bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gold/60"
          autoFocus
        />

        <button
          className="px-3 py-1 text-xs bg-felt border border-gold/40 text-gold rounded hover:bg-felt-light transition-colors whitespace-nowrap shrink-0"
          onClick={() => { onShuffle(); onClose() }}
        >
          Shuffle &amp; Close
        </button>

        <button
          aria-label="Close"
          className="text-gray-400 hover:text-gold text-xl leading-none shrink-0"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* Shuffle-after toggle */}
      <label className="flex items-center gap-2 mb-3 shrink-0 cursor-pointer select-none">
        <input
          data-testid="shuffle-after-toggle"
          type="checkbox"
          checked={shuffleAfter}
          onChange={(e) => onShuffleAfterChange(e.target.checked)}
          className="accent-gold"
        />
        <span className="text-gray-400 text-xs">Shuffle library after moving a card</span>
      </label>

      {/* Card grid — scrollable, constrained to fit in the hand-zone slot */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            {query ? 'No cards match your search' : 'Library is empty'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-start">
            {filtered.map(({ card, position }) => (
              <div key={card.id} className="flex flex-col items-center gap-1 relative">
                <span className="absolute -top-1.5 -left-1.5 bg-gray-600 text-gray-200 text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10 leading-none">
                  {position}
                </span>
                <CardView
                  card={card}
                  cardScale={cardScale}
                  onContextMenu={(e, c) => handleContextMenu(e, c)}
                  onMouseEnter={() => onHover(card)}
                  onMouseLeave={() => onHover(null)}
                  style={{ width: cardW, height: cardH }}
                />
                <span className="text-gray-300 text-[9px] text-center leading-tight truncate" style={{ maxWidth: cardW }}>
                  {card.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-gray-500 text-xs mt-3 shrink-0">
        Right-click a card to move it · Esc or × to close · This panel is not visible to stream viewers
      </p>
    </div>
  )
}
