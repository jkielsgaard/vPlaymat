import { useEffect, useRef, useState } from 'react'
import { useBoard } from './hooks/useBoard'
import { useSettings } from './hooks/useSettings'
import { SettingsContext } from './contexts/SettingsContext'
import { MenuBar } from './components/menu/MenuBar'
import { Playmat } from './components/layout/Playmat'
import { OBSView } from './components/layout/OBSView'
import { StartGameWizard } from './components/ui/StartGameWizard'
import { DisclaimerModal } from './components/overlays/DisclaimerModal'
import { ReconnectBanner } from './components/overlays/ReconnectBanner'
import * as api from './api/rest'

// Detect OBS mode — ?obs=1 in the URL
const urlParams = new URLSearchParams(window.location.search)
const IS_OBS = urlParams.get('obs') === '1'

const DISCLAIMER_KEY = 'vmagic-disclaimer-accepted'
const BETA_DISMISSED_KEY = 'vmagic-beta-dismissed'

export default function App() {
  // OBS mode — render only the arena, no UI chrome
  if (IS_OBS) return <OBSView />

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
