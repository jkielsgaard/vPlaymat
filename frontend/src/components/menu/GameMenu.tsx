import { useEffect, useRef, useState } from 'react'
import { Portal } from '../ui/Portal'
import { StartGameWizard } from '../ui/StartGameWizard'
import { ReleaseNotesPanel } from './ReleaseNotesPanel'
import { useSettingsContext } from '../../contexts/SettingsContext'
import { getOrCreateSessionId } from '../../hooks/useSession'

interface GameMenuProps {
  onNewGame: () => void
  onToggleLog: () => void
}

export function GameMenu({ onNewGame, onToggleLog }: GameMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [spectatorCopied, setSpectatorCopied] = useState(false)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { settings } = useSettingsContext()

  function copySpectatorUrl() {
    const sessionId = getOrCreateSessionId()
    const { cardScale } = settings
    const base = `${window.location.origin}${window.location.pathname}`
    const url = `${base}?spectate=1&session_id=${encodeURIComponent(sessionId)}&scale=${cardScale}`
    navigator.clipboard.writeText(url).then(() => {
      setSpectatorCopied(true)
      setTimeout(() => setSpectatorCopied(false), 2000)
    })
    setOpen(false)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <div ref={ref} className="relative">
        <button
          className="px-3 py-1 text-sm text-gray-300 hover:text-gold transition-colors"
          onClick={() => setOpen((o) => !o)}
        >
          Game ▾
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 bg-mtg-card border border-gold/30 rounded-lg shadow-xl py-1 min-w-40 z-40">
            <MenuItem
              onClick={() => { setOpen(false); setConfirmNew(true) }}
            >
              New Game
            </MenuItem>
            <MenuItem onClick={() => { setOpen(false); setShowImport(true) }}>
              Import New Deck
            </MenuItem>
            <div className="border-t border-gold/10 my-1" />
            <MenuItem onClick={() => { setOpen(false); onToggleLog() }}>
              Game Log
            </MenuItem>
            <div className="border-t border-gold/10 my-1" />
            <MenuItem onClick={copySpectatorUrl}>
              {spectatorCopied ? '✓ Copied!' : 'Copy Spectator URL'}
            </MenuItem>
            <div className="border-t border-gold/10 my-1" />
            <MenuItem onClick={() => { setOpen(false); setReleaseNotesOpen(true) }}>
              Release Notes
            </MenuItem>
          </div>
        )}
      </div>

      {/* New game confirmation */}
      {confirmNew && (
        <Portal>
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center">
            <div className="bg-mtg-card border border-gold/40 rounded-xl p-6 max-w-sm text-center">
              <p className="text-gray-200 mb-4">Are you sure you want to start a new game? The current board will be cleared.</p>
              <div className="flex justify-center gap-3">
                <button
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded"
                  onClick={() => setConfirmNew(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm bg-gold text-black font-semibold rounded hover:bg-gold-light"
                  onClick={() => { setConfirmNew(false); onNewGame() }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showImport && (
        <StartGameWizard onClose={() => setShowImport(false)} />
      )}

      {releaseNotesOpen && (
        <ReleaseNotesPanel onClose={() => setReleaseNotesOpen(false)} />
      )}
    </>
  )
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-felt hover:text-gold transition-colors"
      onClick={onClick}
    >
      {children}
    </button>
  )
}


