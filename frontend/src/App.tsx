import { useEffect, useRef, useState } from 'react'
import { useBoard } from './hooks/useBoard'
import { useSettings } from './hooks/useSettings'
import { SettingsContext } from './contexts/SettingsContext'
import { MenuBar } from './components/menu/MenuBar'
import { Playmat } from './components/layout/Playmat'
import { StartGameWizard } from './components/ui/StartGameWizard'
import { DisclaimerModal } from './components/overlays/DisclaimerModal'
import { ReconnectBanner } from './components/overlays/ReconnectBanner'
import * as api from './api/rest'

const DISCLAIMER_KEY = 'vmagic-disclaimer-accepted'
const BETA_DISMISSED_KEY = 'vplaymat-beta-dismissed'

export default function App() {
  const { gameState, connected } = useBoard()
  const { settings, updateSettings } = useSettings()
  const [wizardDismissed, setWizardDismissed] = useState(false)
  const [logOpen, setLogOpen] = useState(false)

  // Beta notice — shown once per browser session, dismissed until next visit
  const [betaDismissed, setBetaDismissed] = useState(
    () => sessionStorage.getItem(BETA_DISMISSED_KEY) === 'true',
  )
  function dismissBeta() {
    sessionStorage.setItem(BETA_DISMISSED_KEY, 'true')
    setBetaDismissed(true)
  }

  // 3.1 — First-time disclaimer
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    () => localStorage.getItem(DISCLAIMER_KEY) === 'true',
  )
  function acceptDisclaimer() {
    localStorage.setItem(DISCLAIMER_KEY, 'true')
    setDisclaimerAccepted(true)
  }

  // 3.4 — Track when connection was lost so the banner can show elapsed time
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

  async function handleNewGame() {
    await api.newGame()
  }

  // Show the wizard automatically when the app loads and no deck has been imported yet
  const hasNoDeck = gameState !== null && Object.keys(gameState.cards).length === 0
  const showAutoWizard = connected && hasNoDeck && !wizardDismissed

  // 3.4 — Show reconnect banner when we have a game state but lost connection
  const showReconnectBanner = !connected && gameState !== null && disconnectedAt !== null

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {/* 3.1 — Disclaimer shown once on first visit */}
      {!disclaimerAccepted && <DisclaimerModal onAccept={acceptDisclaimer} />}

      <MenuBar
        settings={settings}
        onUpdateSettings={updateSettings}
        onNewGame={handleNewGame}
        connected={connected}
        onToggleLog={() => setLogOpen((v) => !v)}
      />

      {/* Beta notice — fixed strip just below the menu bar */}
      {!betaDismissed && (
        <div className="fixed top-12 left-0 right-0 z-20 flex items-center justify-between px-4 py-1 bg-amber-900/80 border-b border-amber-600/40 backdrop-blur-sm">
          <span className="text-amber-200 text-xs">
            <strong className="text-amber-400">Beta</strong> — vPlaymat is under active development.
            You may encounter bugs or unexpected behaviour.{' '}
            <a
              href="https://github.com/jkielsgaard/vPlaymat/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-amber-300 hover:text-amber-100"
            >
              Report an issue
            </a>
          </span>
          <button
            onClick={dismissBeta}
            className="text-amber-400 hover:text-amber-100 ml-4 text-sm leading-none transition-colors"
            aria-label="Dismiss beta notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3.4 — Reconnect banner (non-blocking) */}
      {showReconnectBanner && <ReconnectBanner lostAt={disconnectedAt!} />}

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
        <StartGameWizard onClose={() => setWizardDismissed(true)} />
      )}
    </SettingsContext.Provider>
  )
}
