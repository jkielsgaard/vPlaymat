import { useEffect } from 'react'
import { useBoard } from '../../hooks/useBoard'
import { SettingsContext } from '../../contexts/SettingsContext'
import { SETTINGS_DEFAULTS } from '../../hooks/useSettings'
import { ZoneBattlefield } from './ZoneBattlefield'
import { ZoneCommand } from './ZoneCommand'
import { LifeCounter } from '../ui/LifeCounter'
import { PoisonCounter } from '../ui/PoisonCounter'
import { CommanderDamage } from '../ui/CommanderDamage'

// Card scale can be passed via ?scale= — dimensions come from OBS itself (100vw/100vh)
const urlParams = new URLSearchParams(window.location.search)
const CARD_SCALE = parseFloat(urlParams.get('scale') ?? '1')
const BOTTOM_STRIP_H = 64

const obsSettings = {
  ...SETTINGS_DEFAULTS,
  cardScale: CARD_SCALE,
}

export function OBSView() {
  const { gameState } = useBoard()

  // Remove body margin/scroll so the arena sits flush at 0,0 with no scrollbars
  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
  }, [])

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
  const commanderCard = allCards.find((c) => c.zone === 'command') ?? null

  return (
    <SettingsContext.Provider value={{ settings: obsSettings, updateSettings: () => {} }}>
      {/* Fill the entire OBS Browser Source viewport — no fixed pixel dimensions needed */}
      <div
        style={{ width: '100vw', height: '100vh', background: '#1a2e1a', overflow: 'hidden' }}
        className="flex flex-col"
      >
        {/* Battlefield — fills all space above the bottom strip */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <ZoneBattlefield
            cards={battlefieldCards}
            selectedIds={new Set()}
            onSelectionChange={() => {}}
            onTap={() => {}}
            onContextMenu={() => {}}
            onCardDropped={() => {}}
            onGroupMoved={() => {}}
            onHover={() => {}}
            onAddCounter={() => {}}
            onBulkMove={() => {}}
            cardScale={CARD_SCALE}
            cardZOrder={[]}
          />
          {gameState.game_mode === 'commander' && commanderCard && (
            <ZoneCommand
              card={commanderCard}
              onContextMenu={() => {}}
              onHover={() => {}}
              commanderReturns={gameState.commander_returns ?? 0}
            />
          )}
        </div>

        {/* Bottom strip */}
        <div
          className="flex items-center gap-4 px-3 border-t border-gold/20 shrink-0"
          style={{ height: BOTTOM_STRIP_H, background: 'rgba(0,0,0,0.35)' }}
        >
          <LifeCounter life={gameState.life} onAdjust={() => {}} />
          <PoisonCounter count={gameState.poison_counters} onAdjust={() => {}} />
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
            />
          )}
        </div>
      </div>
    </SettingsContext.Provider>
  )
}
