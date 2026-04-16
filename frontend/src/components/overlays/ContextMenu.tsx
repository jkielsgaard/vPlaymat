// Right-click context menu — zone moves, face-down, transform, attach, and stack actions.
import { useEffect, useRef } from 'react'
import type { Card, Zone } from '../../types/game'

interface ContextMenuProps {
  card: Card
  position: { x: number; y: number }
  onMove: (cardId: string, zone: Zone) => void
  onMoveToTop?: (cardId: string) => void
  onClose: () => void
  isCommander?: boolean
  onCreateCopy?: (card: Card) => void
  onRemoveAllCounters?: (cardId: string) => void
  onFlip?: (cardId: string) => void
  onTransform?: (cardId: string) => void
  // Multi-select — only shown when 2+ cards are selected
  selectionCount?: number
  onBulkTap?: () => void
  onBulkUntap?: () => void
  onBulkMove?: (zone: Zone) => void
  onBulkStackH?: () => void
  onBulkStackV?: () => void
  onBulkAttach?: () => void
}

const ZONE_OPTIONS: { zone: Zone; label: string }[] = [
  { zone: 'hand', label: 'To Hand' },
  { zone: 'battlefield', label: 'To Battlefield' },
  { zone: 'graveyard', label: 'To Graveyard' },
  { zone: 'exile', label: 'To Exile' },
  { zone: 'library', label: 'To Bottom of Library' },
  { zone: 'command', label: 'To Command Zone' },
]

export function ContextMenu({
  card,
  position,
  onMove,
  onMoveToTop,
  onClose,
  isCommander = false,
  onCreateCopy,
  onRemoveAllCounters,
  onFlip,
  onTransform,
  selectionCount,
  onBulkTap,
  onBulkUntap,
  onBulkMove,
  onBulkStackH,
  onBulkStackV,
  onBulkAttach,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const isFaceDown = card.face_down === true
  const isTransformed = card.transformed === true
  const hasDfc = !!card.back_image_uri
  const hasCounters = Object.values(card.counters).some((v) => v !== 0)

  return (
    <div
      ref={ref}
      className="fixed bg-mtg-card border border-gold/40 rounded-lg shadow-2xl py-1 min-w-44"
      style={{ left: position.x, top: position.y, zIndex: 500 }}
    >
      {/* Card name header */}
      <div className="px-3 py-1 text-gold text-xs font-semibold border-b border-gold/20 mb-1 truncate">
        {isFaceDown ? 'Face-down card' : card.name}
      </div>

      {/* Zone moves */}
      {ZONE_OPTIONS.filter((o) =>
        o.zone !== card.zone &&
        (o.zone !== 'command' || isCommander)
      ).map(({ zone, label }) => (
        <button
          key={zone}
          className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
          onClick={() => { onMove(card.id, zone); onClose() }}
        >
          {label}
        </button>
      ))}

      {/* To Top of Library — only when not currently in library */}
      {card.zone !== 'library' && onMoveToTop && (
        <button
          className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
          onClick={() => { onMoveToTop(card.id); onClose() }}
        >
          To Top of Library
        </button>
      )}

      {/* Card actions section */}
      {(onFlip || (hasDfc && onTransform) || hasCounters || (card.is_token && onCreateCopy)) && (
        <div className="border-t border-gold/20 my-1" />
      )}

      {/* Face-down / face-up toggle — any zone */}
      {onFlip && (
        <button
          className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
          onClick={() => { onFlip(card.id); onClose() }}
        >
          {isFaceDown ? 'Turn Face-Up' : 'Turn Face-Down'}
        </button>
      )}

      {/* Transform — only for DFC cards */}
      {hasDfc && onTransform && (
        <button
          className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
          onClick={() => { onTransform(card.id); onClose() }}
        >
          {isTransformed ? 'Transform (front face)' : 'Transform (back face)'}
        </button>
      )}

      {hasCounters && onRemoveAllCounters && (
        <button
          className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
          onClick={() => { onRemoveAllCounters(card.id); onClose() }}
        >
          Remove all counters
        </button>
      )}

      {card.is_token && onCreateCopy && (
        <button
          className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
          onClick={() => { onCreateCopy(card); onClose() }}
        >
          Create copy
        </button>
      )}

      {/* Multi-select actions — only shown when 2+ cards are selected */}
      {selectionCount != null && selectionCount > 1 && (
        <>
          <div className="border-t border-gold/20 my-1" />
          <div className="px-3 py-1 text-gray-500 text-[10px] uppercase tracking-wider font-semibold">
            {selectionCount} cards selected
          </div>
          {onBulkTap && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
              onClick={() => { onBulkTap(); onClose() }}
            >
              Tap all selected
            </button>
          )}
          {onBulkUntap && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
              onClick={() => { onBulkUntap(); onClose() }}
            >
              Untap all selected
            </button>
          )}
          {onBulkMove && (
            <>
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
                onClick={() => { onBulkMove('graveyard'); onClose() }}
              >
                Move all → Graveyard
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
                onClick={() => { onBulkMove('hand'); onClose() }}
              >
                Move all → Hand
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
                onClick={() => { onBulkMove('exile'); onClose() }}
              >
                Move all → Exile
              </button>
            </>
          )}
          {(onBulkStackH || onBulkStackV) && (
            <div className="border-t border-gold/20 my-1" />
          )}
          {onBulkStackH && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
              onClick={() => { onBulkStackH(); onClose() }}
            >
              Stack horizontal ⇔
            </button>
          )}
          {onBulkStackV && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
              onClick={() => { onBulkStackV(); onClose() }}
            >
              Stack vertical ⇕
            </button>
          )}
          {onBulkAttach && (
            <>
              <div className="border-t border-gold/20 my-1" />
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
                onClick={() => { onBulkAttach(); onClose() }}
              >
                Attach to this card
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
