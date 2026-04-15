import { useState } from 'react'
import { importDeck } from '../../api/rest'
import { Portal } from './Portal'

const DEMO_DECK = `1 Nahiri, the Lithomancer (CMM) 45
1 Adanto Vanguard (PLST) XLN-1
1 Angelic Destiny (FDN) 565
1 Anointer Priest (AKH) 3
1 Arcane Signet (ZNC) 106
1 Baneslayer Angel (M21) 6
1 Dauntless Bodyguard (DOM) 14
1 Emeria, the Sky Ruin (PLIST) 287
1 Flickering Ward (TMP) 19
1 Heliod, Sun-Crowned (PTHB) 18p
1 Hyena Umbra (2X2) 13
1 Lightning Greaves (PLST) C19-217
1 Linden, the Steadfast Queen (PLST) ELD-20
1 Luminarch Aspirant (ZNR) 24
1 Lyra Dawnbringer (FDN) 707
10 Plains (J25) 81
1 Resplendent Angel (LCI) 334
1 Secluded Steppe (CM2) 266
1 Selfless Spirit (TDC) 129
1 Serra Angel (DVD) 10
1 Sol Ring (C21) 263
1 Thraben Inspector (SOI) 44`

interface StartGameWizardProps {
  onClose: () => void
  showWelcome?: boolean
}

type Step = 'welcome' | 'decklist' | 'mode' | 'commander'
type GameMode = 'normal' | 'commander'

export function StartGameWizard({ onClose, showWelcome = false }: StartGameWizardProps) {
  const [step, setStep] = useState<Step>(showWelcome ? 'welcome' : 'decklist')
  const [decklist, setDecklist] = useState('')
  const [gameMode, setGameMode] = useState<GameMode>('normal')
  const [commanderName, setCommanderName] = useState('')
  const [opponentCount, setOpponentCount] = useState(3)
  const [opponentNames, setOpponentNames] = useState<string[]>(['Opponent 1', 'Opponent 2', 'Opponent 3'])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  // Card names parsed from the decklist for the commander dropdown
  const deckCardNames = parseDecklistNames(decklist)

  function handleDecklistNext() {
    if (!decklist.trim()) {
      setError('Decklist cannot be empty')
      return
    }
    setError(null)
    setStep('mode')
  }

  function handleModeNext() {
    if (gameMode === 'commander') {
      setCommanderName(deckCardNames[0] ?? '')
      setStep('commander')
    } else {
      handleSubmit()
    }
  }

  function handleOpponentCountChange(n: number) {
    setOpponentCount(n)
    setOpponentNames((prev) => {
      const next = [...prev]
      while (next.length < n) next.push(`Opponent ${next.length + 1}`)
      return next.slice(0, n)
    })
  }

  async function handleSubmit() {
    setError(null)
    setImportStatus(null)
    setLoading(true)
    const uniqueCount = parseDecklistNames(decklist).length
    setImportStatus(`Fetching ${uniqueCount} cards from Scryfall…`)
    try {
      const result = await importDeck(
        decklist.trim(),
        gameMode,
        gameMode === 'commander' ? commanderName : undefined,
        opponentCount,
        gameMode === 'commander' ? opponentNames.slice(0, opponentCount) : [],
      )
      if (result.errors.length > 0) {
        setImportStatus(`Imported ${result.loaded} cards (${result.errors.length} not found)`)
        setError(result.errors.slice(0, 3).join(', ') + (result.errors.length > 3 ? '…' : ''))
        setLoading(false)
      } else {
        setImportStatus(`Imported ${result.loaded} cards`)
        onClose()
      }
    } catch (err) {
      setImportStatus(null)
      setError(err instanceof Error ? err.message : 'Import failed')
      setLoading(false)
    }
  }

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
        onClick={loading || showWelcome ? undefined : onClose}
      >
        <div
          className="bg-mtg-card border border-gold/40 rounded-xl w-[620px] max-w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'welcome' ? (
            <>
              <img
                src="/og-image.png"
                alt="vPlaymat"
                className="w-full object-cover"
                style={{ maxHeight: 220 }}
              />
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <h2 className="text-gold font-bold text-2xl mb-1">Welcome to vPlaymat</h2>
                  <p className="text-gray-500 text-xs">MTG Virtual Playmat — please read before continuing</p>
                </div>

                <ul className="text-gray-400 text-xs space-y-1">
                  <li>– Drag &amp; drop cards freely on the battlefield</li>
                  <li>– Track life, counters, and commander damage</li>
                  <li>– Share a Spectator URL with opponents or use it as an OBS Browser Source for Spelltable</li>
                  <li>– No account needed, free to use</li>
                </ul>

                <div className="space-y-3 text-xs text-gray-400 leading-relaxed border-t border-gold/10 pt-4">
                  <p>
                    vPlaymat is a personal, non-commercial tool for use during online Magic: The Gathering games.
                    It is not affiliated with, endorsed by, or connected to Wizards of the Coast.
                  </p>
                  <p>
                    Magic: The Gathering, its card names, and all related IP are trademarks of{' '}
                    <strong className="text-gray-200">Wizards of the Coast LLC</strong>.
                    Card images and data are provided by{' '}
                    <strong className="text-gray-200">Scryfall</strong> under their{' '}
                    <a
                      href="https://scryfall.com/docs/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    >
                      API terms
                    </a>
                    . This application is non-commercial and makes no claim of ownership over any card artwork.
                  </p>
                  <p>
                    By using vPlaymat you confirm you own or have the right to use the cards you import, and that
                    you will use the application only for personal, non-commercial play.
                  </p>
                </div>

                <div className="flex justify-end items-center pt-2">
                  <button
                    className="px-5 py-2 text-sm bg-gold text-black font-semibold rounded hover:bg-gold-light transition-colors"
                    onClick={() => setStep('decklist')}
                  >
                    I understand — let me play →
                  </button>
                </div>
              </div>
            </>
          ) : (
          <div className="p-6">
          <h2 className="text-gold font-semibold text-lg mb-1">Import New Deck</h2>
          <p className="text-gray-500 text-xs mb-4">
            Step {step === 'decklist' ? 1 : step === 'mode' ? 2 : 3} of {gameMode === 'commander' || step === 'commander' ? 3 : 2}
          </p>

          {step === 'decklist' && (
            <>
              <textarea
                data-testid="decklist-input"
                className="w-full h-64 bg-mtg-bg border border-felt-light rounded p-3 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-gold/60"
                placeholder={"Paste decklist here (MTGA format)\ne.g. 4 Lightning Bolt (M21) 164"}
                value={decklist}
                onChange={(e) => setDecklist(e.target.value)}
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              <div className="flex justify-between gap-3 mt-4">
                <button
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded transition-colors"
                  onClick={() => setDecklist(DEMO_DECK)}
                >
                  Try demo deck
                </button>
                <div className="flex gap-3">
                  {!showWelcome && (
                    <button
                      className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="px-4 py-2 text-sm bg-gold text-black font-semibold rounded hover:bg-gold-light transition-colors"
                    onClick={handleDecklistNext}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'mode' && (
            <>
              <p className="text-gray-300 text-sm mb-4">Choose your game style:</p>
              <div className="flex flex-col gap-3 mb-6">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-felt-light cursor-pointer hover:border-gold/40 transition-colors">
                  <input
                    type="radio"
                    name="gameMode"
                    value="normal"
                    checked={gameMode === 'normal'}
                    onChange={() => setGameMode('normal')}
                    className="accent-gold"
                  />
                  <div>
                    <div className="text-gray-200 text-sm font-semibold">Normal</div>
                    <div className="text-gray-500 text-xs">Start with 20 life</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-felt-light cursor-pointer hover:border-gold/40 transition-colors">
                  <input
                    type="radio"
                    name="gameMode"
                    value="commander"
                    checked={gameMode === 'commander'}
                    onChange={() => setGameMode('commander')}
                    className="accent-gold"
                  />
                  <div>
                    <div className="text-gray-200 text-sm font-semibold">Commander</div>
                    <div className="text-gray-500 text-xs">Start with 40 life, commander zone</div>
                  </div>
                </label>
              </div>
              {importStatus && <p className="text-gold/80 text-sm mt-2">{importStatus}</p>}
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              <div className="flex justify-between gap-3 mt-4">
                <button
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  onClick={() => { setStep('decklist'); setError(null) }}
                  disabled={loading}
                >
                  ← Back
                </button>
                <div className="flex gap-3">
                  {!showWelcome && (
                    <button
                      className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="px-4 py-2 text-sm bg-gold text-black font-semibold rounded hover:bg-gold-light transition-colors disabled:opacity-50"
                    onClick={handleModeNext}
                    disabled={loading}
                  >
                    {gameMode === 'normal' ? (loading ? 'Importing…' : 'Import & Start') : 'Next →'}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'commander' && (
            <>
              <div className="flex flex-col gap-4 mb-4">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Commander card</label>
                  <select
                    data-testid="commander-select"
                    value={commanderName}
                    onChange={(e) => setCommanderName(e.target.value)}
                    className="w-full bg-mtg-bg border border-felt-light rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold/60"
                  >
                    {deckCardNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-2">Number of opponents</label>
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        data-testid={`opponent-count-${n}`}
                        className={`px-4 py-2 text-sm rounded border transition-colors ${
                          opponentCount === n
                            ? 'bg-gold text-black border-gold font-semibold'
                            : 'bg-felt border-felt-light text-gray-300 hover:border-gold/40'
                        }`}
                        onClick={() => handleOpponentCountChange(n)}
                      >
                        {n} ({n + 1}-player pod)
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {opponentNames.slice(0, opponentCount).map((name, i) => (
                      <input
                        key={i}
                        data-testid={`opponent-name-${i}`}
                        type="text"
                        value={name}
                        onChange={(e) => {
                          const next = [...opponentNames]
                          next[i] = e.target.value
                          setOpponentNames(next)
                        }}
                        className="bg-mtg-bg border border-felt-light rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gold/60"
                        placeholder={`Opponent ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {importStatus && <p className="text-gold/80 text-sm mt-2">{importStatus}</p>}
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              <div className="flex justify-between gap-3 mt-4">
                <button
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  onClick={() => { setStep('mode'); setError(null) }}
                  disabled={loading}
                >
                  ← Back
                </button>
                <div className="flex gap-3">
                  {!showWelcome && (
                    <button
                      className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="px-4 py-2 text-sm bg-gold text-black font-semibold rounded hover:bg-gold-light transition-colors disabled:opacity-50"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Importing…' : 'Import & Start'}
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
          )}
        </div>
      </div>
    </Portal>
  )
}

/** Extract unique card names from an MTGA-format decklist string */
function parseDecklistNames(decklist: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const line of decklist.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//') || /^(Deck|Sideboard|Commander)$/i.test(trimmed)) continue
    const match = trimmed.match(/^\d+\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?$/)
    if (match) {
      const name = match[1].trim()
      if (!seen.has(name)) {
        seen.add(name)
        names.push(name)
      }
    }
  }
  return names
}
