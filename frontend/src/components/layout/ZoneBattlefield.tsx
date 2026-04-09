import { useRef, useState, useCallback, useEffect } from 'react'
import type { Card, Zone } from '../../types/game'
import { CardView } from '../cards/CardView'
import { CounterMenu } from '../overlays/CounterMenu'
import { useSettingsContext } from '../../contexts/SettingsContext'

// Base card dimensions at scale 1.0
export const CARD_BASE_W = 80
export const CARD_BASE_H = 112

interface ZoneBattlefieldProps {
  cards: Card[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onTap: (cardId: string) => void
  onContextMenu: (e: React.MouseEvent, card: Card) => void
  onCardDropped: (cardId: string, x: number, y: number) => void
  onHover: (card: Card | null) => void
  onAddCounter: (cardId: string, type: string, delta: number) => void
  onBulkMove: (cardIds: string[], zone: Zone) => void
  onGroupMoved: (groupIds: string[]) => void
  cardScale: number
  cardZOrder: string[]
}

export function ZoneBattlefield({
  cards,
  selectedIds,
  onSelectionChange,
  onTap,
  onContextMenu,
  onCardDropped,
  onHover,
  onAddCounter,
  onBulkMove,
  onGroupMoved,
  cardScale,
  cardZOrder,
}: ZoneBattlefieldProps) {
  const { settings } = useSettingsContext()
  const badgeFontSize = Math.round(9 * settings.counterBadgeScale)
  const cardW = CARD_BASE_W * cardScale
  const cardH = CARD_BASE_H * cardScale
  const lastDragPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const [counterMenu, setCounterMenu] = useState<{ card: Card; x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Rubber band selection ─────────────────────────────────────────────

  const [rubberBand, setRubberBand] = useState<{
    startX: number; startY: number; curX: number; curY: number
  } | null>(null)
  const rubberBandRef = useRef(rubberBand)
  rubberBandRef.current = rubberBand
  const hasDraggedRef = useRef(false)

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start rubber band on left-click directly on the container (not on a card)
    if (e.button !== 0) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    hasDraggedRef.current = false
    setRubberBand({ startX: x, startY: y, curX: x, curY: y })
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!rubberBandRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const dx = x - rubberBandRef.current.startX
      const dy = y - rubberBandRef.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDraggedRef.current = true
      setRubberBand(prev => prev ? { ...prev, curX: x, curY: y } : null)
    }

    function onMouseUp(e: MouseEvent) {
      if (!rubberBandRef.current) return
      if (!hasDraggedRef.current) {
        // Treat as a plain click on empty space — clear selection
        onSelectionChange(new Set())
      } else {
        // Select all cards whose center falls inside the rectangle
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const { startX, startY, curX, curY } = rubberBandRef.current
          const minX = Math.min(startX, curX)
          const maxX = Math.max(startX, curX)
          const minY = Math.min(startY, curY)
          const maxY = Math.max(startY, curY)
          const hit = new Set<string>()
          for (const card of cards) {
            const cx = card.x * rect.width
            const cy = card.y * rect.height
            if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
              hit.add(card.id)
            }
          }
          // Shift held: add to existing selection; otherwise replace
          if (e.shiftKey) {
            onSelectionChange(new Set([...selectedIds, ...hit]))
          } else {
            onSelectionChange(hit)
          }
        }
      }
      setRubberBand(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [cards, selectedIds, onSelectionChange])

  // Rubber band rect in px relative to container
  const rbRect = rubberBand && hasDraggedRef.current ? {
    left: Math.min(rubberBand.startX, rubberBand.curX),
    top: Math.min(rubberBand.startY, rubberBand.curY),
    width: Math.abs(rubberBand.curX - rubberBand.startX),
    height: Math.abs(rubberBand.curY - rubberBand.startY),
  } : null

  // ── Drop handling ────────────────────────────────────────────────────

  function resolveDropPosition(
    rect: DOMRect,
    clientX: number,
    clientY: number,
    grabOffsetX: number,
    grabOffsetY: number,
  ): { x: number; y: number } {
    if (rect.width === 0 || rect.height === 0) return { x: 0.5, y: 0.5 }
    const cardLeft = clientX - rect.left - grabOffsetX
    const cardTop = clientY - rect.top - grabOffsetY
    const centerX = cardLeft + cardW / 2
    const centerY = cardTop + cardH / 2
    const minX = cardW / 2
    const maxX = rect.width - cardW / 2
    const minY = cardH / 2
    const maxY = rect.height - cardH / 2
    return {
      x: Math.max(minX, Math.min(maxX, centerX)) / rect.width,
      y: Math.max(minY, Math.min(maxY, centerY)) / rect.height,
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    lastDragPos.current = { x: e.clientX, y: e.clientY }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('cardId')
    if (!cardId) return
    const grabOffsetX = parseFloat(e.dataTransfer.getData('grabOffsetX') || String(cardW / 2))
    const grabOffsetY = parseFloat(e.dataTransfer.getData('grabOffsetY') || String(cardH / 2))
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const clientX = lastDragPos.current.x || e.clientX
    const clientY = lastDragPos.current.y || e.clientY
    const { x, y } = resolveDropPosition(rect, clientX, clientY, grabOffsetX, grabOffsetY)
    onCardDropped(cardId, x, y)

    // Multi-select drag: move all other selected battlefield cards by the same delta
    if (selectedIds.has(cardId) && selectedIds.size > 1) {
      const draggingCard = cards.find(c => c.id === cardId)
      if (draggingCard) {
        const dx = x - draggingCard.x
        const dy = y - draggingCard.y
        const minFx = (cardW / 2) / rect.width
        const maxFx = 1 - (cardW / 2) / rect.width
        const minFy = (cardH / 2) / rect.height
        const maxFy = 1 - (cardH / 2) / rect.height
        for (const selId of selectedIds) {
          if (selId === cardId) continue
          const selCard = cards.find(c => c.id === selId)
          if (selCard) {
            const nx = Math.max(minFx, Math.min(maxFx, selCard.x + dx))
            const ny = Math.max(minFy, Math.min(maxFy, selCard.y + dy))
            onCardDropped(selId, nx, ny)
          }
        }
        // Notify parent to bring the whole group forward while preserving internal z-order
        onGroupMoved([...selectedIds])
      }
    }
  }

  function handleCardDragStart(e: React.DragEvent, card: Card) {
    e.dataTransfer.setData('cardId', card.id)
    e.dataTransfer.setData('fromZone', card.zone)
  }

  // ── Selection ────────────────────────────────────────────────────────

  function toggleSelection(cardId: string) {
    const next = new Set(selectedIds)
    if (next.has(cardId)) next.delete(cardId)
    else next.add(cardId)
    onSelectionChange(next)
  }

  // ── Counter menu ─────────────────────────────────────────────────────

  function openCounterMenu(e: React.MouseEvent, card: Card) {
    e.stopPropagation()
    setCounterMenu({ card, x: e.clientX, y: e.clientY })
  }

  return (
    <div
      ref={containerRef}
      data-testid="battlefield"
      className="relative w-full h-full rounded-lg overflow-hidden"
      style={{ background: 'transparent' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleContainerMouseDown}
    >
      {cards.map((card) => {
        const isHovered = hoveredCardId === card.id
        const isSelected = selectedIds.has(card.id)
        const zIndex = cardZOrder.indexOf(card.id)
        const isFaceDown = card.face_down === true
        const hasCounters = !isFaceDown && Object.values(card.counters).some(v => v !== 0)
        // Tapped cards are landscape — swap wrapper dims so the pointer-events area
        // matches the visual card footprint and badges/toolbar land at the right edges.
        const wW = card.tapped ? cardH : cardW
        const wH = card.tapped ? cardW : cardH
        return (
          <div
            key={card.id}
            className="absolute"
            style={{
              left: `calc(${card.x * 100}% - ${wW / 2}px)`,
              top: `calc(${card.y * 100}% - ${wH / 2}px)`,
              width: wW,
              height: wH,
              zIndex: zIndex === -1 ? 0 : zIndex + 1,
            }}
            // Stop card mouse events from reaching the battlefield div (would start rubber band)
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            // Capture phase: shift+click toggles selection without tapping
            onClickCapture={e => {
              if (e.shiftKey) {
                e.stopPropagation()
                e.preventDefault()
                toggleSelection(card.id)
              }
            }}
            onMouseEnter={() => { setHoveredCardId(card.id); onHover(card) }}
            onMouseLeave={() => { setHoveredCardId(null); onHover(null) }}
          >
            {/* Selection ring */}
            {isSelected && (
              <div className="absolute inset-0 rounded-lg ring-2 ring-gold z-20 pointer-events-none" />
            )}

            <CardView
              card={card}
              cardScale={cardScale}
              onTap={onTap}
              onContextMenu={onContextMenu}
              draggable
              onDragStart={(e) => handleCardDragStart(e, card)}
              showCounterBadges={false}
            />

            {/* Counter badges — rendered outside CardView so they don't rotate with the card */}
            {hasCounters && (
              <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5 pointer-events-none" style={{ zIndex: 15 }}>
                {Object.entries(card.counters).map(([type, count]) => {
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

            {/* Hover toolbar — pointer-events on buttons only so the container doesn't block cards beneath */}
            {isHovered && (
              <div
                className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-1 py-0.5 bg-black/70 rounded-b-lg z-20 pointer-events-none"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  className="text-green-400 hover:text-green-300 text-sm font-bold w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded leading-none pointer-events-auto"
                  title="Add +1/+1 counter"
                  onClick={(e) => { e.stopPropagation(); onAddCounter(card.id, 'p1p1', 1) }}
                >+</button>
                <span className="text-gray-400 text-[8px] leading-none select-none">1/1</span>
                <button
                  className="text-red-400 hover:text-red-300 text-sm font-bold w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded leading-none pointer-events-auto"
                  title="Remove +1/+1 counter"
                  onClick={(e) => { e.stopPropagation(); onAddCounter(card.id, 'p1p1', -1) }}
                >−</button>
                <button
                  className="text-gold hover:text-yellow-300 text-xs w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded leading-none pointer-events-auto"
                  title="All counter types"
                  onClick={(e) => openCounterMenu(e, card)}
                >⊕</button>
              </div>
            )}
          </div>
        )
      })}

      {/* Rubber band rectangle */}
      {rbRect && (
        <div
          className="absolute pointer-events-none border border-gold/70 rounded"
          style={{
            left: rbRect.left,
            top: rbRect.top,
            width: rbRect.width,
            height: rbRect.height,
            background: 'rgba(212,175,55,0.08)',
            zIndex: 50,
          }}
        />
      )}

      {/* Multi-select toolbar — count + clear only; bulk actions live in the context menu */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gray-900/90 border border-gold/40 rounded-lg px-2.5 py-1.5 z-30 shadow-lg whitespace-nowrap">
          <span className="text-gray-300 text-[10px]">
            {selectedIds.size} card{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="w-px h-3 bg-gray-600" />
          <button
            className="text-gray-500 hover:text-gray-300 text-base leading-none"
            onClick={(e) => { e.stopPropagation(); onSelectionChange(new Set()) }}
            title="Clear selection"
          >×</button>
        </div>
      )}

      {counterMenu && (
        <CounterMenu
          card={counterMenu.card}
          position={{ x: counterMenu.x, y: counterMenu.y }}
          onAdjust={(cardId, type, delta) => onAddCounter(cardId, type, delta)}
          onClose={() => setCounterMenu(null)}
        />
      )}
    </div>
  )
}
