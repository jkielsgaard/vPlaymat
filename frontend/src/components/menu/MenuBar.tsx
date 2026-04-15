import { useState } from 'react'
import type { Settings } from '../../hooks/useSettings'
import { GameMenu } from './GameMenu'
import { HelpPanel } from './HelpPanel'
import { SettingsPanel } from './SettingsPanel'

interface MenuBarProps {
  settings: Settings
  onUpdateSettings: (partial: Partial<Settings>) => void
  onNewGame: () => void
  onToggleLog: () => void
  spectatorZoneViewing: boolean
  onToggleSpectatorZoneViewing: (v: boolean) => void
}

export function MenuBar({ settings, onUpdateSettings, onNewGame, onToggleLog, spectatorZoneViewing, onToggleSpectatorZoneViewing }: MenuBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-12 flex items-center gap-4 px-4 bg-black/60 border-b border-gold/20 z-30 backdrop-blur-sm">
        <span className="text-gold font-bold tracking-widest text-sm mr-2">vPlaymat</span>

        <GameMenu onNewGame={onNewGame} onToggleLog={onToggleLog} />

        <button
          className="px-3 py-1 text-sm text-gray-300 hover:text-gold transition-colors"
          onClick={() => setSettingsOpen(true)}
        >
          Settings ▾
        </button>

        <button
          className="px-3 py-1 text-sm text-gray-300 hover:text-gold transition-colors"
          onClick={() => setHelpOpen(true)}
        >
          Help ?
        </button>

        {/* Version — centred in the bar */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 select-none pointer-events-none">
          <span className="text-gray-500 text-xs font-mono tracking-widest">v1.4.5</span>
          <span className="bg-amber-700/70 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
            BETA
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />
      </div>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onUpdate={onUpdateSettings}
          onClose={() => setSettingsOpen(false)}
          spectatorZoneViewing={spectatorZoneViewing}
          onToggleSpectatorZoneViewing={onToggleSpectatorZoneViewing}
        />
      )}

      {helpOpen && (
        <HelpPanel onClose={() => setHelpOpen(false)} />
      )}
    </>
  )
}
