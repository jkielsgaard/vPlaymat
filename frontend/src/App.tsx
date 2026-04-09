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

export default function App() {
  const { gameState, connected } = useBoard()
  const { settings, updateSettings } = useSettings()
  const [wizardDismissed, setWizardDismissed] = useState(false)
  const [logOpen, setLogOpen] = useState(false)

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
        <Playmat gameState={gameState} logOpen={logOpen} onCloseLog={() => setLogOpen(false)} />
      )}

      {showAutoWizard && (
        <StartGameWizard onClose={() => setWizardDismissed(true)} />
      )}
    </SettingsContext.Provider>
  )
}
