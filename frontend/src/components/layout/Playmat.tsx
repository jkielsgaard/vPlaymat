// Main game layout — arena (battlefield + zones), hand, game log, and all overlays.
import { useRef, useState } from 'react'
import type { Card, GameState, Zone } from '../../types/game'
import { useActions } from '../../hooks/useActions'
import * as api from '../../api/rest'
import { useGameLog } from '../../hooks/useGameLog'
import { useSettingsContext } from '../../contexts/SettingsContext'
import { useToast, ToastDisplay } from '../../contexts/ToastContext'
import { useCardSelection } from '../../hooks/useCardSelection'
import { useBulkOperations } from '../../hooks/useBulkOperations'
import { usePlaymatKeyboard } from '../../hooks/usePlaymatKeyboard'
import { CardPreview } from '../cards/CardPreview'
import { ContextMenu } from '../overlays/ContextMenu'
import { GameLog } from '../overlays/GameLog'
import { CommanderDamage } from '../ui/CommanderDamage'
import { LifeCounter } from '../ui/LifeCounter'
import { PoisonCounter } from '../ui/PoisonCounter'
import { ZoneBattlefield, CARD_BASE_W, CARD_BASE_H } from './ZoneBattlefield'
import { ZoneExile } from './ZoneExile'
import { ZoneGraveyard } from './ZoneGraveyard'
import { ZoneHand } from './ZoneHand'
import { ZoneCommand } from './ZoneCommand'
import { ZoneLibrary } from './ZoneLibrary'
import { LibraryBrowser } from '../overlays/LibraryBrowser'
import { TokenCreator } from '../overlays/TokenCreator'
import { ScryPanel } from '../overlays/ScryPanel'
import { RevealOverlay } from '../overlays/RevealOverlay'

// ── Buy Me a Coffee ──────────────────────────────────────────────────────────
const COFFEE_URL = 'https://buymeacoffee.com/jkielsgaard'

interface PlaymatProps {
  gameState: GameState
  logOpen: boolean
  onCloseLog: () => void
  betaBannerVisible?: boolean
}

interface ContextMenuState {
  card: Card
  position: { x: number; y: number }
}

const BOTTOM_STRIP_H = 64
const LEFT_COL_W = 110

const ZONE_LABELS: Record<string, string> = {
  hand: 'Hand',
  battlefield: 'Battlefield',
  graveyard: 'Graveyard',
  exile: 'Exile',
  library: 'Library',
  command: 'Command Zone',
}

export function Playmat({ gameState, logOpen, onCloseLog, betaBannerVisible = false }: PlaymatProps) {
  const actions = useActions()
  const { settings } = useSettingsContext()
  const { entries, addEntry, clearLog } = useGameLog()
  const { addToast } = useToast()

  const [hoveredCard, setHoveredCard] = useState<Card | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [commanderLossAlert, setCommanderLossAlert] = useState<string | null>(null)
  const [libraryBrowserOpen, setLibraryBrowserOpen] = useState(false)
  const [shuffleAfterBrowse, setShuffleAfterBrowse] = useState(false)
  const [tokenCreatorOpen, setTokenCreatorOpen] = useState(false)
  const [scryOpen, setScryOpen] = useState(false)
  const [revealOpen, setRevealOpen] = useState(false)
  const [confirmUntapAll, setConfirmUntapAll] = useState(false)
  const [cardZOrder, setCardZOrder] = useState<string[]>(() => gameState.card_z_order ?? [])

  // Applies a new z-order locally and persists it to the backend so spectators stay in sync.
  function applyZOrder(next: string[]) {
    setCardZOrder(next)
    api.updateZOrder(next).catch(() => {})
  }

  const { selectedIds, setSelectedIds } = useCardSelection()

  const allCards = Object.values(gameState.cards)
  const libraryCards = gameState.library_order.map((id) => gameState.cards[id]).filter(Boolean)
  const handCards = allCards.filter((c) => c.zone === 'hand')
  const battlefieldCards = allCards.filter((c) => c.zone === 'battlefield')
  // Graveyard uses explicit ordering (newest-on-top = index 0)
  const graveyardCards = (gameState.graveyard_order ?? []).map((id) => gameState.cards[id]).filter(Boolean)
  const exileCards = allCards.filter((c) => c.zone === 'exile')
  const commanderCard = allCards.find((c) => c.zone === 'command') ?? null
  const commanderCardAny = allCards.find((c) => c.is_commander) ?? null

  const { arenaWidth, arenaHeight, cardScale, arenaBackground, pageBackground, cardPreviewPosition, cardPreviewCorner } = settings
  const battlefieldH = arenaHeight - BOTTOM_STRIP_H
  const turn = gameState.turn

  function openContextMenu(e: React.MouseEvent, card: Card) {
    setContextMenu({ card, position: { x: e.clientX, y: e.clientY } })
  }

  // ── Logged action wrappers ──────────────────────────────────────────

  async function handleMoveCard(cardId: string, zone: Zone) {
    const card = gameState.cards[cardId]
    try {
      if (zone === 'battlefield') {
        await actions.moveCard(cardId, zone, 0.5, 0.5)
        applyZOrder([...cardZOrder.filter(id => id !== cardId), cardId])
      } else {
        await actions.moveCard(cardId, zone)
        applyZOrder(cardZOrder.filter(id => id !== cardId))
      }
      if (card) addEntry(turn, `Moved ${card.name} → ${ZONE_LABELS[zone] ?? zone}`)
    } catch {
      addToast(`Failed to move card`)
    }
  }

  async function handleDrop(cardId: string, x: number, y: number) {
    const card = gameState.cards[cardId]
    try {
      await actions.moveCard(cardId, 'battlefield', x, y)
      if (card && card.zone !== 'battlefield') {
        addEntry(turn, `Moved ${card.name} → Battlefield`)
      }
      // Only update z-order for single-card drops.
      // Multi-drag z-order is handled once by handleGroupMoved to preserve internal order.
      if (!(selectedIds.has(cardId) && selectedIds.size > 1)) {
        applyZOrder([...cardZOrder.filter(id => id !== cardId), cardId])
      }
    } catch {
      addToast(`Failed to drop card`)
    }
  }

  function handleGroupMoved(groupIds: string[]) {
    // Bring the whole group to the front together, preserving their relative z-order.
    const groupSet = new Set(groupIds)
    const groupInOrder = cardZOrder.filter(id => groupSet.has(id))
    const missing = groupIds.filter(id => !cardZOrder.includes(id))
    applyZOrder([...cardZOrder.filter(id => !groupSet.has(id)), ...groupInOrder, ...missing])
  }

  function handleTap(cardId: string) {
    const card = gameState.cards[cardId]
    actions.tapCard(cardId).catch(() => addToast('Failed to tap card'))
    if (card) addEntry(turn, `${card.tapped ? 'Untapped' : 'Tapped'} ${card.name}`)
  }

  function handleDraw(count = 1) {
    actions.drawCards(count).catch(() => addToast('Failed to draw'))
    addEntry(turn, count === 1 ? 'Drew a card' : `Drew ${count} cards`)
    addToast(count === 1 ? 'Drew a card' : `Drew ${count} cards`)
  }

  function handleShuffle() {
    actions.shuffleLibrary().catch(() => addToast('Failed to shuffle'))
    addEntry(turn, 'Shuffled library')
    addToast('Library shuffled')
  }

  function handleNextTurn() {
    actions.nextTurn().catch(() => addToast('Failed to advance turn'))
    addEntry(turn + 1, `Turn ${turn + 1} started`)
    addToast(`Turn ${turn + 1}`)
  }

  function handleUntapAll() {
    actions.untapAll().catch(() => addToast('Failed to untap'))
    addEntry(turn, 'Untapped all cards')
    addToast('All cards untapped')
    setConfirmUntapAll(false)
  }

  function handleAdjustLife(delta: number) {
    const before = gameState.life
    actions.adjustLife(delta).catch(() => addToast('Failed to adjust life'))
    addEntry(turn, `Life: ${before} → ${before + delta} (${delta > 0 ? '+' : ''}${delta})`)
  }

  function handleAdjustPoison(delta: number) {
    const before = gameState.poison_counters
    actions.adjustPoison(delta).catch(() => addToast('Failed to adjust poison'))
    addEntry(turn, `Poison: ${before} → ${Math.max(0, before + delta)}`)
  }

  function handleAddCounter(cardId: string, type: string, delta: number) {
    const card = gameState.cards[cardId]
    actions.addCounter(cardId, type, delta).catch(() => addToast('Failed to add counter'))
    if (card) {
      const label = type === 'p1p1' ? '+1/+1' : type === 'm1m1' ? '-1/-1' : type
      addEntry(turn, delta > 0
        ? `Added ${label} counter to ${card.name}`
        : `Removed ${label} counter from ${card.name}`)
    }
  }

  function handleRemoveAllCounters(cardId: string) {
    const card = gameState.cards[cardId]
    actions.removeAllCounters(cardId).catch(() => addToast('Failed to remove counters'))
    if (card) addEntry(turn, `Removed all counters from ${card.name}`)
  }

  function handleCreateToken(name: string, image_uri: string) {
    actions.createToken(name, image_uri).catch(() => addToast('Failed to create token'))
    addEntry(turn, `Created ${name} token`)
  }

  async function handleScryConfirm(keepTop: string[], sendBottom: string[]) {
    const n = keepTop.length + sendBottom.length
    try {
      await actions.scryDecide(keepTop, sendBottom)
      setScryOpen(false)
      addEntry(turn, `Scryed ${n}`)
    } catch {
      addToast('Failed to complete scry')
    }
  }

  function handleCommanderDragStart(e: React.DragEvent, card: Card) {
    e.dataTransfer.setData('cardId', card.id)
    e.dataTransfer.setData('fromZone', 'command')
  }

  async function handleMoveToTop(cardId: string) {
    const card = gameState.cards[cardId]
    try {
      await actions.moveCard(cardId, 'library', 0, 0, true)
      if (card) addEntry(turn, `Moved ${card.name} → Top of Library`)
    } catch {
      addToast('Failed to move card to top')
    }
  }

  function handleFlip(cardId: string) {
    const card = gameState.cards[cardId]
    actions.flipCard(cardId).catch(() => addToast('Failed to flip card'))
    if (card) addEntry(turn, `${card.face_down ? 'Turned face-up' : 'Turned face-down'}: ${card.name}`)
  }

  function handleTransform(cardId: string) {
    const card = gameState.cards[cardId]
    actions.transformCard(cardId).catch(() => addToast('Failed to transform card'))
    if (card) addEntry(turn, `Transformed ${card.name}`)
  }

  const bulk = useBulkOperations({
    selectedIds,
    setSelectedIds,
    cards: gameState.cards,
    battlefieldCards,
    contextMenuCardId: contextMenu?.card.id,
    stackGap: settings.stackGap,
    attachGap: settings.attachGap,
    cardScale,
    cardZOrder,
    handleMoveCard,
    handleTap,
    applyZOrder,
  })

  usePlaymatKeyboard({
    handleDraw,
    handleNextTurn,
    handleBulkTap: bulk.handleBulkTap,
    handleBulkUntap: bulk.handleBulkUntap,
    selectedIds,
  })

  // When preview is inside the arena, panels can use the full arena width.
  const previewWidth = Math.round(208 * settings.cardPreviewScale)
  const panelWidth = cardPreviewPosition === 'outside' ? arenaWidth - previewWidth - 16 : arenaWidth

  return (
    <div
      className={`min-h-screen flex flex-col items-start justify-start ${betaBannerVisible ? 'pt-20' : 'pt-14'} pb-4`}
      style={{ background: pageBackground, paddingLeft: 10 }}
    >
      {/* ── Arena ── everything inside here is what OBS captures ─────── */}
      <div
        className="relative flex flex-col overflow-hidden border border-gold/30 shadow-2xl shrink-0"
        style={{ width: arenaWidth, height: arenaHeight, background: arenaBackground }}
      >
          {/* Main area: left zone column + battlefield */}
          <div className="flex flex-row" style={{ height: battlefieldH }}>
            {/* Left column — Library, Graveyard, Exile */}
            <div
              className="flex flex-col py-2 shrink-0 border-r border-gold/10"
              style={{ width: LEFT_COL_W }}
            >
              <div className="flex flex-col items-center py-1 gap-1">
                <ZoneLibrary
                  count={libraryCards.length}
                  cardScale={Math.min(cardScale, (LEFT_COL_W - 24) / 80)}
                  onDraw={() => handleDraw(1)}
                  onShuffle={handleShuffle}
                  onBrowse={() => setLibraryBrowserOpen(true)}
                  onScry={() => setScryOpen(true)}
                  onReveal={() => setRevealOpen(true)}
                />
                {/* Action buttons — below library deck */}
                <div className="grid grid-cols-2 gap-1 px-2 w-full">
                  <button
                    className="col-span-2 px-1.5 py-0.5 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors"
                    onClick={handleNextTurn}
                  >Next Turn</button>
                  <button
                    className="px-1.5 py-0.5 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors"
                    onClick={() => setTokenCreatorOpen(true)}
                  >+ Token</button>
                  <button
                    className="px-1.5 py-0.5 text-[10px] bg-felt border border-gold/30 text-gold rounded hover:bg-felt-light transition-colors"
                    onClick={() => setConfirmUntapAll(true)}
                  >Untap All</button>
                </div>
              </div>
              <div className="border-t border-gold/10 mx-2" />
              <div className="flex-1 flex flex-col items-center justify-center py-1">
                <ZoneGraveyard
                  cards={graveyardCards}
                  cardScale={Math.min(cardScale, (LEFT_COL_W - 24) / 80)}
                  onContextMenu={openContextMenu}
                  onHover={setHoveredCard}
                  onViewerOpen={() => api.setActiveViewer('graveyard')}
                  onViewerClose={() => api.setActiveViewer(null)}
                />
              </div>
              <div className="border-t border-gold/10 mx-2" />
              <div className="flex-1 flex flex-col items-center justify-center py-1">
                <ZoneExile
                  cards={exileCards}
                  cardScale={Math.min(cardScale, (LEFT_COL_W - 24) / 80)}
                  onContextMenu={openContextMenu}
                  onHover={setHoveredCard}
                  onViewerOpen={() => api.setActiveViewer('exile')}
                  onViewerClose={() => api.setActiveViewer(null)}
                />
              </div>
            </div>

            {/* Battlefield — free drop area */}
            <div className="flex-1 min-w-0 relative">
              <ZoneBattlefield
                cards={battlefieldCards}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onTap={handleTap}
                onContextMenu={openContextMenu}
                onCardDropped={handleDrop}
                onGroupMoved={handleGroupMoved}
                onHover={setHoveredCard}
                onAddCounter={handleAddCounter}
                onBulkMove={bulk.handleBulkMove}
                cardScale={cardScale}
                cardZOrder={cardZOrder}
              />
              {gameState.game_mode === 'commander' && (
                <ZoneCommand
                  card={commanderCard}
                  onContextMenu={openContextMenu}
                  onHover={setHoveredCard}
                  onDragStart={handleCommanderDragStart}
                  commanderReturns={gameState.commander_returns ?? 0}
                  onResetReturns={() => actions.resetCommanderReturns()}
                  onReturnCommander={
                    commanderCardAny && commanderCardAny.zone !== 'command'
                      ? () => {
                          actions.moveCard(commanderCardAny.id, 'command')
                            .catch(() => addToast('Failed to return commander'))
                          addEntry(turn, `Returned ${commanderCardAny.name} to Command Zone`)
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </div>

          {/* Bottom strip */}
          <div
            className="flex items-center gap-4 px-3 border-t border-gold/20 shrink-0 overflow-x-auto"
            style={{ height: BOTTOM_STRIP_H, background: 'rgba(0,0,0,0.35)' }}
          >
            <LifeCounter life={gameState.life} onAdjust={handleAdjustLife} />
            <PoisonCounter count={gameState.poison_counters} onAdjust={handleAdjustPoison} />

            <div className="flex flex-col items-center leading-none shrink-0">
              <span className="text-white font-bold tabular-nums text-xl" style={{ lineHeight: 1 }}>{handCards.length}</span>
              <span className="text-gold text-[9px] font-semibold tracking-widest uppercase mt-0.5">Hand</span>
            </div>
            <div className="flex flex-col items-center leading-none shrink-0">
              <span className="text-white font-bold tabular-nums text-xl" style={{ lineHeight: 1 }}>{gameState.turn}</span>
              <span className="text-gold text-[9px] font-semibold tracking-widest uppercase mt-0.5">Turn</span>
            </div>
            {gameState.game_mode === 'commander' && (
              <CommanderDamage
                commanderDamage={gameState.commander_damage}
                opponentNames={
                  gameState.opponent_names?.length
                    ? gameState.opponent_names
                    : Array.from({ length: gameState.opponent_count ?? 3 }, (_, i) => `Opponent ${i + 1}`)
                }
                onLoss={(src) => setCommanderLossAlert(src)}
                onLog={(msg) => addEntry(turn, msg)}
              />
            )}

            {/* Buy Me a Coffee — pushed to the far right */}
            <a
              href={COFFEE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] font-semibold hover:bg-yellow-500/30 transition-colors"
            >
              ☕ Buy me a coffee
            </a>
          </div>

          {/* Reveal overlay — inside arena so OBS captures it */}
          {revealOpen && (
            <RevealOverlay libraryCards={libraryCards} onClose={() => setRevealOpen(false)} />
          )}

          {/* Card preview overlay — inside arena, player-only (not shown to spectators) */}
          {cardPreviewPosition === 'inside' && hoveredCard && (() => {
            const isTop = cardPreviewCorner.startsWith('top')
            const isLeft = cardPreviewCorner.endsWith('left')
            return (
              <div
                style={{
                  position: 'absolute',
                  zIndex: 90,
                  top: isTop ? 8 : undefined,
                  bottom: isTop ? undefined : BOTTOM_STRIP_H + 8,
                  left: isLeft ? LEFT_COL_W + 8 : undefined,
                  right: isLeft ? undefined : 8,
                  pointerEvents: 'none',
                }}
              >
                <CardPreview card={hoveredCard} variant="overlay" />
              </div>
            )
          })()}

          {/* Toasts — inside arena so OBS captures them */}
          <ToastDisplay />
        </div>
        {/* ── End arena ─────────────────────────────────────────────────── */}

      {/* Below arena — outside OBS capture.
          Outside mode: panels left (panelWidth) + preview column right.
          Inside mode: panels use full arena width, no preview column here. */}
      <div className="flex flex-row items-start mt-4">

        <div style={{ width: panelWidth }} className="shrink-0">
          {logOpen ? (
            <GameLog
              entries={entries}
              arenaWidth={panelWidth}
              onClear={clearLog}
              onClose={onCloseLog}
            />
          ) : scryOpen ? (
            <ScryPanel
              libraryCards={libraryCards}
              arenaWidth={panelWidth}
              cardScale={cardScale}
              onConfirm={handleScryConfirm}
              onClose={() => setScryOpen(false)}
              onHover={setHoveredCard}
            />
          ) : libraryBrowserOpen ? (
            <LibraryBrowser
              cards={libraryCards}
              cardScale={settings.zoneViewerCardScale}
              arenaWidth={panelWidth}
              maxHeight={settings.libraryBrowserHeight}
              shuffleAfter={shuffleAfterBrowse}
              onShuffleAfterChange={setShuffleAfterBrowse}
              onContextMenu={openContextMenu}
              onHover={setHoveredCard}
              onShuffle={handleShuffle}
              onClose={() => setLibraryBrowserOpen(false)}
            />
          ) : (
            /* Hand view: spacer | hand cards */
            <div className="flex items-start">
              {/* Spacer to align hand with the battlefield, not the zone column */}
              <div style={{ width: LEFT_COL_W }} className="shrink-0" />
              <div
                className="flex items-end justify-center px-4 flex-1"
                style={{ minHeight: 112 * cardScale + 24 }}
              >
                <ZoneHand
                  cards={handCards}
                  cardScale={cardScale}
                  onContextMenu={openContextMenu}
                  onHover={setHoveredCard}
                />
              </div>
            </div>
          )}
        </div>

        {/* Card preview — outside mode only: dedicated column to the right of panels */}
        {cardPreviewPosition === 'outside' && (
          <div className="shrink-0 pl-4 pt-2">
            <CardPreview card={hoveredCard} />
          </div>
        )}

      </div>

      {/* Scryfall attribution (required by Scryfall API terms) */}
      <p className="text-gray-600 text-[10px] mt-2 text-center" style={{ width: panelWidth - LEFT_COL_W, marginLeft: LEFT_COL_W }}>
        Card data &amp; images:{' '}
        <a href="https://scryfall.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 underline">
          Scryfall
        </a>
        {' '}— Magic: The Gathering is a trademark of Wizards of the Coast LLC.
      </p>

      {/* Overlays */}

      {contextMenu && (
        <ContextMenu
          card={contextMenu.card}
          position={contextMenu.position}
          onMove={handleMoveCard}
          onMoveToTop={handleMoveToTop}
          onClose={() => setContextMenu(null)}
          isCommander={contextMenu.card.is_commander}
          onCreateCopy={(card) => handleCreateToken(card.name, card.image_uri)}
          onRemoveAllCounters={handleRemoveAllCounters}
          onFlip={handleFlip}
          onTransform={handleTransform}
          selectionCount={selectedIds.size}
          onBulkTap={selectedIds.size > 1 ? bulk.handleBulkTap : undefined}
          onBulkUntap={selectedIds.size > 1 ? bulk.handleBulkUntap : undefined}
          onBulkMove={selectedIds.size > 1 ? (zone) => bulk.handleBulkMove([...selectedIds], zone) : undefined}
          onBulkStackH={selectedIds.size > 1 ? () => bulk.handleBulkStack('horizontal') : undefined}
          onBulkStackV={selectedIds.size > 1 ? () => bulk.handleBulkStack('vertical') : undefined}
          onBulkAttach={selectedIds.size > 1 && contextMenu?.card.zone === 'battlefield' ? () => bulk.handleBulkAttach(contextMenu.card.id) : undefined}
        />
      )}

      {tokenCreatorOpen && (
        <TokenCreator onClose={() => setTokenCreatorOpen(false)} onHover={setHoveredCard} />
      )}

      {confirmUntapAll && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center">
          <div className="bg-mtg-card border border-gold/40 rounded-xl p-6 max-w-sm text-center">
            <p className="text-gray-200 mb-4">Untap all cards on the battlefield?</p>
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded"
                onClick={() => setConfirmUntapAll(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-gold text-black font-semibold rounded hover:bg-gold-light"
                onClick={handleUntapAll}
              >
                Untap All
              </button>
            </div>
          </div>
        </div>
      )}

      {commanderLossAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-mtg-card border border-red-500/60 rounded-xl p-8 text-center max-w-sm">
            <div className="text-red-400 text-4xl mb-3">⚠</div>
            <h2 className="text-white font-bold text-xl mb-2">Commander Damage Loss</h2>
            <p className="text-gray-300 text-sm mb-4">
              You have taken 21 or more commander damage from <strong className="text-gold">{commanderLossAlert}</strong>.
            </p>
            <button
              className="px-4 py-2 bg-felt border border-gold/40 text-gold rounded hover:bg-felt-light"
              onClick={() => setCommanderLossAlert(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
