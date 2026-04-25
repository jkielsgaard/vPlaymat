// Root component — renders the main game UI or the spectator view, and manages global state.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBoard } from './hooks/useBoard'
import { useSettings } from './hooks/useSettings'
import { SettingsContext } from './contexts/SettingsContext'
import { MenuBar } from './components/menu/MenuBar'
import { Playmat } from './components/layout/Playmat'
import { SpectatorView } from './components/layout/OBSView'
import { StartGameWizard } from './components/ui/StartGameWizard'
import { ConnectionOverlay } from './components/overlays/ConnectionOverlay'
import { MobileWarning } from './components/overlays/MobileWarning'
import { SessionExpiryWarning } from './components/overlays/SessionExpiryWarning'
import { useSessionExpiry } from './hooks/useSessionExpiry'
import { ToastProvider } from './contexts/ToastContext'
import * as api from './api/rest'

// Detect spectator mode — presence of ?token= in the URL
const urlParams = new URLSearchParams(window.location.search)
const IS_SPECTATOR = urlParams.has('token')

const BETA_DISMISSED_KEY = 'vmagic-beta-dismissed'

export default function App() {
  // Spectator mode — render only the arena, no UI chrome
  if (IS_SPECTATOR) return <SpectatorView />

  const { gameState, connected } = useBoard()
  const { settings, updateSettings } = useSettings()
  const [wizardDismissed, setWizardDismissed] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [betaDismissed, setBetaDismissed] = useState(
    () => localStorage.getItem(BETA_DISMISSED_KEY) === 'true',
  )
  function dismissBeta() {
    localStorage.setItem(BETA_DISMISSED_KEY, 'true')
    setBetaDismissed(true)
  }

  // Track when connection was lost so the banner can show elapsed time
  const disconnectedAtRef = useRef<number | null>(null)
  const [disconnectedAt, setDisconnectedAt] = useState<number | null>(null)
  useEffect(() => {
    if (!connected) {
      if (disconnectedAtRef.current === null) {
        const now = Date.now()
        disconnectedAtRef.current = now
        setDisconnectedAt(now)
      }
    } else {
      disconnectedAtRef.current = null
      setDisconnectedAt(null)
    }
  }, [connected])

  const handleNewGame = useCallback(async () => {
    localStorage.removeItem('vmagic-last-state')
    await api.newGame()
    setWizardDismissed(false)
  }, [])

  // Show the wizard automatically when the app loads and no deck has been imported yet
  const hasNoDeck = gameState !== null && Object.keys(gameState.cards).length === 0

  const { warningVisible, minutesLeft, extend, sessionExpired } = useSessionExpiry({
    enabled: connected && !hasNoDeck,
  })

  const handleSessionExpiry = useCallback(async () => {
    localStorage.removeItem('vmagic-last-state')
    await api.clearGame()
    setWizardDismissed(false)
  }, [])

  useEffect(() => {
    if (sessionExpired) handleSessionExpiry()
  }, [sessionExpired, handleSessionExpiry])

  // Sync arena dimensions to the backend so spectators render at the same canvas size.
  // Runs on mount (to restore after page reload) and whenever the player resizes the arena.
  useEffect(() => {
    api.updateArenaSize(settings.arenaWidth, settings.arenaHeight, settings.cardScale).catch(() => {})
  }, [settings.arenaWidth, settings.arenaHeight, settings.cardScale])

  async function handleToggleSpectatorZoneViewing(v: boolean) {
    await api.setSpectatorZoneViewing(v)
  }
  const showAutoWizard = connected && hasNoDeck && !wizardDismissed

  return (
    <ToastProvider>
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      <MobileWarning />

      <ConnectionOverlay
        connected={connected}
        hasGameState={gameState !== null}
        lostAt={disconnectedAt}
      />

      {warningVisible && (
        <SessionExpiryWarning minutesLeft={minutesLeft} onExtend={extend} />
      )}

      <MenuBar
        settings={settings}
        onUpdateSettings={updateSettings}
        onNewGame={handleNewGame}
        onToggleLog={() => setLogOpen((v) => !v)}
        spectatorZoneViewing={gameState?.spectator_zone_viewing ?? false}
        onToggleSpectatorZoneViewing={handleToggleSpectatorZoneViewing}
      />

      {/* Beta notice banner */}
      {!betaDismissed && (
        <div className="fixed top-12 left-0 right-0 z-20 flex items-center justify-center gap-3 bg-amber-900/80 border-b border-amber-700/50 px-4 py-1.5 text-amber-200 text-xs backdrop-blur-sm">
          <span>
            <span className="font-semibold">Beta</span> — vPlaymat is under active development. You may encounter bugs or unexpected behaviour.{' '}
            <a
              href="https://github.com/jkielsgaard/vPlaymat/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Report an issue
            </a>
          </span>
          <button
            aria-label="Dismiss beta notice"
            className="ml-2 text-amber-400 hover:text-white text-base leading-none"
            onClick={dismissBeta}
          >
            ×
          </button>
        </div>
      )}

      {!gameState ? (
        <div
          className="flex items-center justify-center"
          style={{
            background: settings.pageBackground,
            minHeight: '100vh',
          }}
        >
          <div className="text-center">
            <div className="text-gold text-2xl font-bold mb-2">vPlaymat</div>
            <div className="text-gray-400 text-sm">
              {connected ? 'Loading game state…' : 'Connecting to server…'}
            </div>
          </div>
        </div>
      ) : (
        <Playmat gameState={gameState} logOpen={logOpen} onCloseLog={() => setLogOpen(false)} betaBannerVisible={!betaDismissed} />
      )}

      {showAutoWizard && (
        <StartGameWizard onClose={() => setWizardDismissed(true)} showWelcome />
      )}
    </SettingsContext.Provider>
    </ToastProvider>
  )
}
