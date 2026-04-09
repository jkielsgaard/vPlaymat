import { useEffect, useRef, useState } from 'react'
import { useActions } from '../../hooks/useActions'

interface TokenResult {
  name: string
  image_uri: string
}

interface TokenCreatorProps {
  onClose: () => void
  onHover: (card: import('../../types/game').Card | null) => void
}

const COLORS: { label: string; value: string }[] = [
  { label: 'Green', value: '#1a3a1a' },
  { label: 'White', value: '#3a3a2a' },
  { label: 'Blue', value: '#1a1a3a' },
  { label: 'Black', value: '#1a1a1a' },
  { label: 'Red', value: '#3a1a1a' },
  { label: 'Gold', value: '#3a2a0a' },
  { label: 'Colourless', value: '#2a2a2a' },
]

function buildPlaceholderUri(name: string, pt: string, bg: string): string {
  const safeName = name.replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c)
  )
  const safePt = pt.replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c)
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280">
    <rect width="200" height="280" rx="12" fill="${bg}" stroke="#d4af37" stroke-width="3"/>
    <rect x="8" y="8" width="184" height="264" rx="9" fill="none" stroke="#d4af37" stroke-width="1" opacity="0.4"/>
    <text x="100" y="120" text-anchor="middle" fill="#ffffff" font-size="15" font-family="Georgia,serif" font-weight="bold">${safeName}</text>
    ${safePt ? `<text x="100" y="175" text-anchor="middle" fill="#d4af37" font-size="26" font-family="Georgia,serif" font-weight="bold">${safePt}</text>` : ''}
    <text x="100" y="250" text-anchor="middle" fill="#d4af37" font-size="11" font-family="Georgia,serif" letter-spacing="2">TOKEN</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function TokenCreator({ onClose, onHover }: TokenCreatorProps) {
  const actions = useActions()
  const [tab, setTab] = useState<'search' | 'custom'>('search')

  // Search tab state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TokenResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Custom tab state
  const [customName, setCustomName] = useState('')
  const [customPt, setCustomPt] = useState('')
  const [customColor, setCustomColor] = useState(COLORS[0].value)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setSearchError(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const data = await actions.searchTokens(query.trim())
        setResults(data.results)
        if (data.results.length === 0) setSearchError('No tokens found')
      } catch {
        setSearchError('Search failed')
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [query])

  async function placeToken(name: string, image_uri: string) {
    await actions.createToken(name, image_uri)
    onClose()
  }

  async function placeCustomToken() {
    if (!customName.trim()) return
    const uri = buildPlaceholderUri(customName.trim(), customPt.trim(), customColor)
    await actions.createToken(customName.trim(), uri)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-mtg-card border border-gold/40 rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-gold font-semibold text-base">Create Token</h2>
          <button
            aria-label="Close"
            className="text-gray-400 hover:text-gold text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 shrink-0">
          {(['search', 'custom'] as const).map((t) => (
            <button
              key={t}
              className={`px-4 py-1.5 text-xs rounded-t border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-gold text-gold font-semibold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setTab(t)}
            >
              {t === 'search' ? 'Search Scryfall' : 'Custom Token'}
            </button>
          ))}
        </div>
        <div className="border-b border-gold/20 shrink-0" />

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'search' ? (
            <div className="flex flex-col gap-4">
              <input
                autoFocus
                type="text"
                placeholder="Search for a token (e.g. Goblin, Soldier, Treasure…)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-mtg-bg border border-felt-light rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gold/60"
              />
              {searching && (
                <p className="text-gray-500 text-xs text-center py-4">Searching…</p>
              )}
              {!searching && searchError && (
                <p className="text-gray-500 text-xs text-center py-4">{searchError}</p>
              )}
              {!searching && results.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {results.map((r) => (
                    <button
                      key={r.name + r.image_uri}
                      className="flex flex-col items-center gap-1 group"
                      onClick={() => placeToken(r.name, r.image_uri)}
                      onMouseEnter={() => onHover({ id: '', name: r.name, image_uri: r.image_uri, zone: 'battlefield', tapped: false, counters: {}, x: 0, y: 0, is_commander: false, is_token: true })}
                      onMouseLeave={() => onHover(null)}
                      title={`Place ${r.name}`}
                    >
                      <img
                        src={r.image_uri}
                        alt={r.name}
                        className="w-20 rounded-lg shadow-md group-hover:ring-2 group-hover:ring-gold transition-all"
                      />
                      <span className="text-gray-300 text-[9px] text-center leading-tight max-w-[80px] truncate">
                        {r.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!searching && !searchError && results.length === 0 && (
                <p className="text-gray-600 text-xs text-center py-8">
                  Type a token name to search
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Name *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Goblin"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-mtg-bg border border-felt-light rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gold/60"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Power/Toughness</label>
                <input
                  type="text"
                  placeholder="e.g. 1/1 or 3/3"
                  value={customPt}
                  onChange={(e) => setCustomPt(e.target.value)}
                  className="w-48 bg-mtg-bg border border-felt-light rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gold/60"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-2">Colour</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        customColor === c.value ? 'border-gold' : 'border-gray-600 hover:border-gold/40'
                      }`}
                      style={{ background: c.value }}
                      onClick={() => setCustomColor(c.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              {customName && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <p className="text-gray-500 text-xs">Preview</p>
                  <img
                    src={buildPlaceholderUri(customName, customPt, customColor)}
                    alt={customName}
                    className="w-24 rounded-lg shadow-md"
                  />
                </div>
              )}

              <button
                disabled={!customName.trim()}
                className="px-4 py-2 bg-gold text-black text-sm font-semibold rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={placeCustomToken}
              >
                Place Token
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
