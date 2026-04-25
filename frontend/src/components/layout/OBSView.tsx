// Spectator view — clean arena-only layout for OBS Browser Source and direct URL sharing.
import { useEffect, useRef, useState } from 'react'
import { useBoard } from '../../hooks/useBoard'
import { SettingsContext } from '../../contexts/SettingsContext'
import { SETTINGS_DEFAULTS } from '../../hooks/useSettings'
import { useSpectatorSettings } from '../../hooks/useSpectatorSettings'
import type { SpectatorPreviewCorner } from '../../hooks/useSpectatorSettings'
import { ZoneBattlefield, CARD_BASE_W, CARD_BASE_H } from './ZoneBattlefield'
import { ZoneGraveyard } from './ZoneGraveyard'
import { ZoneExile } from './ZoneExile'
import { ZoneCommand } from './ZoneCommand'
import { ZoneViewer } from '../overlays/ZoneViewer'
import { FaceDownCard } from '../cards/FaceDownCard'
import { LifeCounter } from '../ui/LifeCounter'
import { PoisonCounter } from '../ui/PoisonCounter'
import { CommanderDamage } from '../ui/CommanderDamage'
import { SpectatorCardPreview } from '../cards/SpectatorCardPreview'
import type { Card } from '../../types/game'

const BOTTOM_STRIP_H = 64
const LEFT_COL_W = 110

export function SpectatorView() {
  const { gameState, tokenRejected } = useBoard()
  const { settings: sprSettings, update: updateSpr } = useSpectatorSettings()
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Spectator's own independently-opened viewer (only when spectator_zone_viewing is true)
  const [spectatorViewerZone, setSpectatorViewerZone] = useState<'graveyard' | 'exile' | null>(null)

  // Track active_viewer changes so we can reset the dismissed state each time player opens a new one
  const [dismissedPlayerViewer, setDismissedPlayerViewer] = useState(false)
  const prevActiveViewer = useRef<string | null>(null)
  useEffect(() => {
    const current = gameState?.active_viewer ?? null
    if (current !== prevActiveViewer.current) {
      prevActiveViewer.current = current
      setDismissedPlayerViewer(false)
    }
  }, [gameState?.active_viewer])

  // Remove body margin so the arena sits flush at 0,0; allow scrolling if arena > viewport
  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'auto'
  }, [])

  if (tokenRejected) {
    return (
      <div
        style={{ width: '100vw', height: '100vh', background: '#1a2e1a' }}
        className="flex items-center justify-center"
      >
        <div className="text-center">
          <div className="text-gold text-lg font-semibold mb-2">Spectator link not found</div>
          <div className="text-gray-400 text-sm">This link is invalid or has expired.</div>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div
        style={{ width: '100vw', height: '100vh', background: '#1a2e1a' }}
        className="flex items-center justify-center"
      >
        <span className="text-gray-500 text-sm">Connecting…</span>
      </div>
    )
  }

  const allCards = Object.values(gameState.cards)
  const battlefieldCards = allCards.filter((c) => c.zone === 'battlefield')
  const graveyardCards = (gameState.graveyard_order ?? []).map((id) => gameState.cards[id]).filter(Boolean)
  const exileCards = allCards.filter((c) => c.zone === 'exile')
  const commanderCard = allCards.find((c) => c.zone === 'command') ?? null
  const libraryCount = gameState.library_order.length

  // Arena dimensions and card scale come from the player (synced via WebSocket).
  // zoom=1.0 means 1:1 pixel match with the player's view.
  const arenaW = gameState.arena_width
  const arenaH = gameState.arena_height
  const CARD_SCALE = gameState.card_scale
  const scale = sprSettings.zoom

  const zoneCardScale = Math.min(CARD_SCALE, (LEFT_COL_W - 24) / 80)
  const zoneW = CARD_BASE_W * zoneCardScale
  const zoneH = CARD_BASE_H * zoneCardScale

  // Show the player's mirrored viewer when:
  // - spectator_zone_viewing is off (spectator can't open independently)
  // - player has a viewer open
  // - spectator hasn't locally dismissed it
  const showPlayerViewer =
    !gameState.spectator_zone_viewing &&
    gameState.active_viewer !== null &&
    !dismissedPlayerViewer

  const playerViewerCards =
    gameState.active_viewer === 'graveyard'
      ? graveyardCards
      : gameState.active_viewer === 'exile'
        ? exileCards
        : []

  const spectatorSettings = { ...SETTINGS_DEFAULTS, cardScale: CARD_SCALE, zoneViewerCardScale: 1.0 }

  return (
    <SettingsContext.Provider value={{ settings: spectatorSettings, updateSettings: () => {} }}>
      {/* ⚙ gear — fixed to the viewport corner, never scaled */}
      <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 9999 }}>
        <button
          className="text-white/25 hover:text-white/60 text-base leading-none transition-colors"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-label="Spectator settings"
          title="Spectator settings"
        >
          ⚙
        </button>

        {settingsOpen && (
          <div className="absolute top-7 right-0 bg-black/90 border border-gold/30 rounded-lg p-4 w-60 flex flex-col gap-4 shadow-xl backdrop-blur-sm">

            <div>
              <p className="text-gray-400 text-xs mb-1.5">
                Zoom — {Math.round(sprSettings.zoom * 100)}%
              </p>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={sprSettings.zoom}
                onChange={(e) => updateSpr({ zoom: parseFloat(e.target.value) })}
                className="w-full accent-gold"
              />
              <div className="flex justify-between text-gray-600 text-[10px] mt-0.5">
                <span>50%</span><span>100%</span><span>150%</span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sprSettings.previewEnabled}
                onChange={(e) => updateSpr({ previewEnabled: e.target.checked })}
                className="accent-gold"
              />
              <span className="text-gray-300 text-xs">Show card preview on hover</span>
            </label>

            {sprSettings.previewEnabled && (
              <>
                <div>
                  <p className="text-gray-400 text-xs mb-1.5">
                    Preview size — {sprSettings.previewScale.toFixed(1)}×
                  </p>
                  <input
                    type="range"
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    value={sprSettings.previewScale}
                    onChange={(e) => updateSpr({ previewScale: parseFloat(e.target.value) })}
                    className="w-full accent-gold"
                  />
                  <div className="flex justify-between text-gray-600 text-[10px] mt-0.5">
                    <span>0.5×</span><span>3.0×</span>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-xs mb-1.5">Position</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { value: 'top-left',     label: '↖ Top left' },
                        { value: 'top-right',    label: '↗ Top right' },
                        { value: 'bottom-left',  label: '↙ Bottom left' },
                        { value: 'bottom-right', label: '↘ Bottom right' },
                      ] as { value: SpectatorPreviewCorner; label: string }[]
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          sprSettings.previewCorner === value
                            ? 'bg-gold text-black border-gold font-semibold'
                            : 'bg-black/40 border-gold/20 text-gray-300 hover:border-gold/40'
                        }`}
                        onClick={() => updateSpr({ previewCorner: value })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Canvas — rendered at the player's exact arena dimensions, then CSS-scaled by zoom.
          transform-origin: top left keeps the top-left corner stable (matches OBS anchor). */}
      <div
        style={{
          width: arenaW * scale,
          height: arenaH * scale,
          overflow: 'hidden',
        }}
      >
      <div
        style={{
          width: arenaW,
          height: arenaH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: '#1a2e1a',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Main area: left zone column + battlefield */}
        <div className="flex flex-row flex-1" style={{ minHeight: 0 }}>

          {/* Left column — Library, Graveyard, Exile (read-only) */}
          <div
            className="flex flex-col py-2 shrink-0 border-r border-gold/10"
            style={{ width: LEFT_COL_W }}
          >
            {/* Library — read-only stack + count */}
            <div className="flex flex-col items-center gap-1.5 w-full px-2 py-1">
              <div className="flex items-center justify-between w-full">
                <span className="text-gold text-[10px] font-semibold tracking-widest uppercase">Library</span>
                <span className="text-gold font-bold text-xs">{libraryCount}</span>
              </div>
              <div className="relative" style={{ width: zoneW, height: zoneH }}>
                {libraryCount > 0 ? (
                  <>
                    {libraryCount > 2 && (
                      <div className="absolute" style={{ top: 3, left: 3, width: zoneW, height: zoneH, opacity: 0.35 }}>
                        <FaceDownCard className="w-full h-full" />
                      </div>
                    )}
                    {libraryCount > 1 && (
                      <div className="absolute" style={{ top: 1.5, left: 1.5, width: zoneW, height: zoneH, opacity: 0.65 }}>
                        <FaceDownCard className="w-full h-full" />
                      </div>
                    )}
                    <FaceDownCard className="w-full h-full" />
                  </>
                ) : (
                  <div
                    className="rounded-lg border-2 border-dashed border-gold/20 flex items-center justify-center text-gray-600 text-[10px]"
                    style={{ width: zoneW, height: zoneH }}
                  >
                    Empty
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gold/10 mx-2" />

            {/* Graveyard */}
            <div className="flex-1 flex flex-col items-center justify-center py-1">
              <ZoneGraveyard
                cards={graveyardCards}
                cardScale={zoneCardScale}
                onContextMenu={() => {}}
                onHover={setHoveredCard}
                readOnly={!gameState.spectator_zone_viewing}
                controlledOpen={
                  gameState.spectator_zone_viewing
                    ? spectatorViewerZone === 'graveyard'
                    : undefined
                }
                onViewerOpen={
                  gameState.spectator_zone_viewing
                    ? () => setSpectatorViewerZone('graveyard')
                    : undefined
                }
                onViewerClose={
                  gameState.spectator_zone_viewing
                    ? () => setSpectatorViewerZone(null)
                    : undefined
                }
              />
            </div>

            <div className="border-t border-gold/10 mx-2" />

            {/* Exile */}
            <div className="flex-1 flex flex-col items-center justify-center py-1">
              <ZoneExile
                cards={exileCards}
                cardScale={zoneCardScale}
                onContextMenu={() => {}}
                onHover={setHoveredCard}
                readOnly={!gameState.spectator_zone_viewing}
                controlledOpen={
                  gameState.spectator_zone_viewing
                    ? spectatorViewerZone === 'exile'
                    : undefined
                }
                onViewerOpen={
                  gameState.spectator_zone_viewing
                    ? () => setSpectatorViewerZone('exile')
                    : undefined
                }
                onViewerClose={
                  gameState.spectator_zone_viewing
                    ? () => setSpectatorViewerZone(null)
                    : undefined
                }
              />
            </div>
          </div>

          {/* Battlefield */}
          <div className="flex-1 relative" style={{ minHeight: 0 }}>
            <ZoneBattlefield
              cards={battlefieldCards}
              selectedIds={new Set()}
              onSelectionChange={() => {}}
              onTap={() => {}}
              onContextMenu={() => {}}
              onCardDropped={() => {}}
              onGroupMoved={() => {}}
              onHover={setHoveredCard}
              onAddCounter={() => {}}
              onBulkMove={() => {}}
              cardScale={CARD_SCALE}
              cardZOrder={gameState.card_z_order ?? []}
              readOnly
            />
            {gameState.game_mode === 'commander' && commanderCard && (
              <ZoneCommand
                card={commanderCard}
                onContextMenu={() => {}}
                onHover={setHoveredCard}
                commanderReturns={gameState.commander_returns ?? 0}
              />
            )}
            <SpectatorCardPreview card={hoveredCard} settings={sprSettings} />
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className="flex items-center gap-4 px-3 border-t border-gold/20 shrink-0"
          style={{ height: BOTTOM_STRIP_H, background: 'rgba(0,0,0,0.35)' }}
        >
          <LifeCounter life={gameState.life} onAdjust={() => {}} readOnly />
          <PoisonCounter count={gameState.poison_counters} onAdjust={() => {}} readOnly />
          <div className="flex flex-col items-center leading-none shrink-0">
            <span className="text-white font-bold tabular-nums text-xl" style={{ lineHeight: 1 }}>
              {gameState.turn}
            </span>
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
              onLoss={() => {}}
              onLog={() => {}}
              readOnly
            />
          )}
        </div>

        {/* Player's zone viewer — mirrored to spectator (only when spectator_zone_viewing is off) */}
        {showPlayerViewer && (
          <ZoneViewer
            title={gameState.active_viewer === 'graveyard' ? 'Graveyard' : 'Exile'}
            cards={playerViewerCards}
            cardScale={spectatorSettings.zoneViewerCardScale}
            onContextMenu={() => {}}
            onHover={setHoveredCard}
            onClose={() => setDismissedPlayerViewer(true)}
            readOnly
          />
        )}

      </div>{/* end inner canvas */}
      </div>{/* end scale wrapper */}
    </SettingsContext.Provider>
  )
}
