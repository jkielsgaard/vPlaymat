// Bulk card operations — move, tap/untap, stack, and attach for multi-selected cards.
import * as api from '../api/rest'
import type { Card, Zone } from '../types/game'
import { CARD_BASE_W, CARD_BASE_H } from '../components/layout/ZoneBattlefield'

interface UseBulkOperationsParams {
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  cards: Record<string, Card>
  battlefieldCards: Card[]
  contextMenuCardId?: string
  stackGap: number
  attachGap: number
  cardScale: number
  cardZOrder: string[]
  handleMoveCard: (cardId: string, zone: Zone) => Promise<void>
  handleTap: (cardId: string) => void
  applyZOrder: (ids: string[]) => void
}

export function useBulkOperations({
  selectedIds,
  setSelectedIds,
  cards,
  battlefieldCards,
  contextMenuCardId,
  stackGap,
  attachGap,
  cardScale,
  cardZOrder,
  handleMoveCard,
  handleTap,
  applyZOrder,
}: UseBulkOperationsParams) {

  async function handleBulkMove(cardIds: string[], zone: Zone) {
    for (const cardId of cardIds) {
      await handleMoveCard(cardId, zone)
    }
    setSelectedIds(new Set())
  }

  function handleBulkTap() {
    ;[...selectedIds].forEach(id => {
      const card = cards[id]
      if (card && !card.tapped) handleTap(id)
    })
    setSelectedIds(new Set())
  }

  function handleBulkUntap() {
    ;[...selectedIds].forEach(id => {
      const card = cards[id]
      if (card && card.tapped) handleTap(id)
    })
    setSelectedIds(new Set())
  }

  function handleBulkStack(direction: 'horizontal' | 'vertical') {
    if (selectedIds.size < 2) return
    const battlefieldEl = document.querySelector('[data-testid="battlefield"]')
    const rect = battlefieldEl?.getBoundingClientRect()
    if (!rect || rect.width === 0) return

    // Use the larger card dimension for safe clamping regardless of tap state
    const maxDim = Math.max(CARD_BASE_W, CARD_BASE_H) * cardScale

    // Right-clicked card is the anchor (back, lowest z).
    // Remaining cards stack in front of it sorted spatially.
    const anchor = contextMenuCardId
      ? battlefieldCards.find(c => c.id === contextMenuCardId)
      : undefined
    const others = battlefieldCards
      .filter(c => selectedIds.has(c.id) && c.id !== contextMenuCardId)
      .sort((a, b) => direction === 'horizontal' ? a.x - b.x : a.y - b.y)
    const sorted = anchor ? [anchor, ...others] : others
    if (sorted.length === 0) return

    const stackAnchor = sorted[0]
    const stepFx = stackGap / rect.width
    const stepFy = stackGap / rect.height
    const minFx = (maxDim / 2) / rect.width
    const maxFx = 1 - (maxDim / 2) / rect.width
    const minFy = (maxDim / 2) / rect.height
    const maxFy = 1 - (maxDim / 2) / rect.height

    sorted.forEach((card, i) => {
      const nx = direction === 'horizontal'
        ? Math.max(minFx, Math.min(maxFx, stackAnchor.x + i * stepFx))
        : stackAnchor.x
      const ny = direction === 'vertical'
        ? Math.max(minFy, Math.min(maxFy, stackAnchor.y + i * stepFy))
        : stackAnchor.y
      // Use raw API directly — awaiting here would race on setCardZOrder
      api.moveCard(card.id, 'battlefield', nx, ny)
    })

    // Set z-order explicitly: sorted[0] = back, sorted[last] = front — persisted to backend
    const sortedIds = sorted.map(c => c.id)
    applyZOrder([...cardZOrder.filter(id => !sortedIds.includes(id)), ...sortedIds])
    setSelectedIds(new Set())
  }

  function handleBulkAttach(hostId: string) {
    if (selectedIds.size < 2) return
    const battlefieldEl = document.querySelector('[data-testid="battlefield"]')
    const rect = battlefieldEl?.getBoundingClientRect()
    if (!rect || rect.width === 0) return

    const maxDim = Math.max(CARD_BASE_W, CARD_BASE_H) * cardScale
    const host = battlefieldCards.find(c => c.id === hostId)
    if (!host) return

    const stepFx = attachGap / rect.width
    const stepFy = attachGap / rect.height
    const minFx = (maxDim / 2) / rect.width
    const maxFx = 1 - (maxDim / 2) / rect.width
    const minFy = (maxDim / 2) / rect.height
    const maxFy = 1 - (maxDim / 2) / rect.height

    // Equipment in selection order: first selected = index 0 = closest to host
    const equipment = [...selectedIds]
      .filter(id => id !== hostId)
      .map(id => battlefieldCards.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined)

    equipment.forEach((card, i) => {
      const nx = Math.max(minFx, Math.min(maxFx, host.x + (i + 1) * stepFx))
      const ny = Math.max(minFy, Math.min(maxFy, host.y + (i + 1) * stepFy))
      api.moveCard(card.id, 'battlefield', nx, ny)
    })

    // Z-order: equipment reversed (last-selected lowest z), then host (highest z) — persisted to backend
    const equipmentIds = equipment.map(c => c.id)
    applyZOrder([
      ...cardZOrder.filter(id => id !== hostId && !equipmentIds.includes(id)),
      ...[...equipmentIds].reverse(),
      hostId,
    ])
    setSelectedIds(new Set())
  }

  return {
    handleBulkMove,
    handleBulkTap,
    handleBulkUntap,
    handleBulkStack,
    handleBulkAttach,
  }
}
