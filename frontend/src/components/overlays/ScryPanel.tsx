import { useEffect, useState } from 'react'
import type { Card } from '../../types/game'
import { CARD_BASE_W, CARD_BASE_H } from '../layout/ZoneBattlefield'

interface ScryPanelProps {
  libraryCards: Card[]
  arenaWidth: number
  cardScale: number
  onConfirm: (keepTop: string[], sendBottom: string[]) => void
  onClose: () => void
  onHover: (card: Card | null) => void
}

function moveUp(arr: string[], id: string): string[] {
  const i = arr.indexOf(id)
  if (i <= 0) return arr
  const next = [...arr]
  ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
  return next
}

function moveDown(arr: string[], id: string): string[] {
  const i = arr.indexOf(id)
  if (i < 0 || i >= arr.length - 1) return arr
  const next = [...arr]
  ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
  return next
}

export function ScryPanel({ libraryCards, arenaWidth, cardScale, onConfirm, onClose, onHover }: ScryPanelProps) {
  const [count, setCount] = useState(Math.min(1, libraryCards.length))
  const [topOrder, setTopOrder] = useState<string[]>(() => libraryCards.slice(0, count).map((c) => c.id))
  const [bottomOrder, setBottomOrder] = useState<string[]>([])

  const cardW = CARD_BASE_W * Math.min(cardScale, 0.85)
  const cardH = CARD_BASE_H * Math.min(cardScale, 0.85)

  // Card lookup map
  const cardById = Object.fromEntries(libraryCards.map((c) => [c.id, c]))

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // When count changes, reset to fresh state
  useEffect(() => {
    const ids = libraryCards.slice(0, count).map((c) => c.id)
    setTopOrder(ids)
    setBottomOrder([])
  }, [count])

  function sendToBottom(id: string) {
    setTopOrder((prev) => prev.filter((x) => x !== id))
    setBottomOrder((prev) => [...prev, id])
  }

  function sendToTop(id: string) {
    setBottomOrder((prev) => prev.filter((x) => x !== id))
    setTopOrder((prev) => [...prev, id])
  }

  function confirm() {
    onConfirm(topOrder, bottomOrder)
  }

  function renderCard(id: string, group: 'top' | 'bottom', idx: number, total: number) {
    const card = cardById[id]
    if (!card) return null
    const isTop = group === 'top'

    return (
      <div
        key={id}
        className="flex flex-col items-center gap-1 relative"
        onMouseEnter={() => onHover(card)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Position badge */}
        <span className={`absolute -top-1.5 -left-1.5 text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10 leading-none ${
          isTop ? 'bg-green-700 text-white' : 'bg-red-800 text-white'
        }`}>
          {idx + 1}
        </span>

        {/* Card image */}
        <div
          className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
            isTop ? 'ring-2 ring-green-500' : 'ring-2 ring-red-600'
          }`}
          style={{ width: cardW, height: cardH }}
          onClick={() => isTop ? sendToBottom(id) : sendToTop(id)}
          title={isTop ? 'Click to send to bottom' : 'Click to keep on top'}
        >
          <img
            src={card.image_uri}
            alt={card.name}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Card name */}
        <span className="text-gray-300 text-[9px] text-center leading-tight truncate" style={{ maxWidth: cardW }}>
          {card.name}
        </span>

        {/* Controls row */}
        <div className="flex items-center gap-0.5">
          <button
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-felt rounded text-xs leading-none disabled:opacity-30"
            onClick={() => isTop ? setTopOrder((a) => moveUp(a, id)) : setBottomOrder((a) => moveUp(a, id))}
            disabled={idx === 0}
            title="Move left (earlier)"
          >←</button>
          <button
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-felt rounded text-xs leading-none disabled:opacity-30"
            onClick={() => isTop ? setTopOrder((a) => moveDown(a, id)) : setBottomOrder((a) => moveDown(a, id))}
            disabled={idx === total - 1}
            title="Move right (later)"
          >→</button>
          <button
            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
              isTop
                ? 'bg-red-900 text-red-300 hover:bg-red-700'
                : 'bg-green-900 text-green-300 hover:bg-green-700'
            }`}
            onClick={() => isTop ? sendToBottom(id) : sendToTop(id)}
          >
            {isTop ? '▼ Bot' : '▲ Top'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="scry-panel"
      className="bg-gray-800 border border-gold/60 rounded-xl mt-4 p-5 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.6)]"
      style={{ width: arenaWidth }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0 flex-wrap">
        <h3 className="text-gold font-semibold text-base shrink-0">
          Scry
          <span className="text-gray-400 font-normal text-sm ml-2">(private — not visible to stream)</span>
        </h3>

        <div className="flex items-center gap-1">
          <span className="text-gray-400 text-xs">Cards:</span>
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-felt rounded text-sm font-bold disabled:opacity-40"
            onClick={() => setCount((n) => Math.max(1, n - 1))}
            disabled={count <= 1}
          >−</button>
          <span className="text-white text-sm font-bold w-5 text-center">{count}</span>
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-felt rounded text-sm font-bold disabled:opacity-40"
            onClick={() => setCount((n) => Math.min(libraryCards.length, n + 1))}
            disabled={count >= libraryCards.length}
          >+</button>
        </div>

        <div className="flex-1" />

        <button
          className="px-4 py-1 text-xs bg-gold text-black font-semibold rounded hover:opacity-90 transition-opacity shrink-0"
          onClick={confirm}
        >Confirm</button>
        <button
          aria-label="Close"
          className="text-gray-400 hover:text-gold text-xl leading-none shrink-0"
          onClick={onClose}
        >×</button>
      </div>

      {libraryCards.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">Library is empty</p>
      ) : (
        <div className="flex flex-row gap-4 items-start">
          {/* Keep on top — LEFT column */}
          <div className="flex-1 min-w-0">
            <p className="text-green-400 text-xs font-semibold mb-2">
              ▲ Keep on top ({topOrder.length})
              <span className="text-gray-500 font-normal ml-2">— ← → to reorder, leftmost drawn first</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {topOrder.length === 0
                ? <p className="text-gray-600 text-xs italic">None — all cards sent to bottom</p>
                : topOrder.map((id, i) => renderCard(id, 'top', i, topOrder.length))
              }
            </div>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-gold/20 shrink-0 mx-1" />

          {/* Send to bottom — RIGHT column */}
          <div className="flex-1 min-w-0">
            <p className="text-red-400 text-xs font-semibold mb-2">
              ▼ Send to bottom ({bottomOrder.length})
              <span className="text-gray-500 font-normal ml-2">— ← → to reorder, leftmost placed first</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {bottomOrder.length === 0
                ? <p className="text-gray-600 text-xs italic">None — all cards kept on top</p>
                : bottomOrder.map((id, i) => renderCard(id, 'bottom', i, bottomOrder.length))
              }
            </div>
          </div>
        </div>
      )}

      <p className="text-gray-500 text-xs mt-4 shrink-0">
        Click a card to toggle top/bottom · ←→ to reorder within each group · Esc or × to cancel
      </p>
    </div>
  )
}
