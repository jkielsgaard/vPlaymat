// In development VITE_API_BASE=http://localhost:8000 (set in .env)
// In production it is empty and nginx proxies the paths to the backend
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

import { getOrCreateSessionId } from '../hooks/useSession'

// ---------------------------------------------------------------------------
// Activity tracking — updated on every REST call so useSessionExpiry can
// measure how long the session has been idle.
// ---------------------------------------------------------------------------
let _lastActivityAt = Date.now()
export function getLastActivity(): number { return _lastActivityAt }

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  _lastActivityAt = Date.now()
  const sessionId = getOrCreateSessionId()
  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}${path}${sep}session_id=${encodeURIComponent(sessionId)}`
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(detail?.detail ?? res.statusText)
  }
  return res.json()
}

export const importDeck = (
  decklist: string,
  game_mode: 'normal' | 'commander' = 'normal',
  commander_name?: string,
  opponent_count = 3,
  opponent_names: string[] = [],
) =>
  request<{ loaded: number; errors: string[] }>('POST', '/deck/import', {
    decklist,
    game_mode,
    commander_name: commander_name ?? null,
    opponent_count,
    opponent_names,
  })

export const getState = () =>
  request<import('../types/game').GameState>('GET', '/deck/state')

export const drawCards = (count = 1) =>
  request<{ drawn: import('../types/game').Card[] }>('POST', '/game/draw', { count })

export const shuffleLibrary = () =>
  request<{ library_size: number }>('POST', '/game/shuffle')

export const untapAll = () =>
  request<{ ok: boolean }>('POST', '/game/untap-all')

export const adjustLife = (delta: number) =>
  request<{ life: number }>('PUT', '/game/life', { delta })

export const mulligan = () =>
  request<{ hand: import('../types/game').Card[] }>('POST', '/game/mulligan')

export const revealTop = (count: number) =>
  request<{ cards: import('../types/game').Card[] }>('POST', '/game/reveal', { count })

export const tapCard = (cardId: string) =>
  request<import('../types/game').Card>('POST', `/cards/${cardId}/tap`)

export const moveCard = (cardId: string, zone: string, x = 0, y = 0, toTop = false) =>
  request<import('../types/game').Card>('POST', `/cards/${cardId}/move`, { zone, x, y, to_top: toTop })

export const updatePosition = (cardId: string, x: number, y: number) =>
  request<import('../types/game').Card>('POST', `/cards/${cardId}/position`, { x, y })

export const addCounter = (cardId: string, type: string, delta: number) =>
  request<import('../types/game').Card>('POST', `/cards/${cardId}/counter`, { type, delta })

export const newGame = () =>
  request<{ ok: boolean }>('POST', '/game/new')

export const setGameMode = (mode: 'normal' | 'commander') =>
  request<{ mode: string; life: number }>('POST', '/game/mode', { mode })

export const addCommanderDamage = (source: string, amount: number) =>
  request<{ source: string; total: number; commander_loss: string | null }>(
    'POST', '/game/commander-damage', { source, amount }
  )

export const nextTurn = () =>
  request<{ turn: number; drawn: import('../types/game').Card | null }>('POST', '/game/next-turn')

export const scryDecide = (keepTop: string[], sendBottom: string[]) =>
  request<{ library_size: number }>('POST', '/game/scry', { keep_top: keepTop, send_bottom: sendBottom })

export const adjustPoison = (delta: number) =>
  request<{ poison_counters: number }>('POST', '/game/poison', { delta })

export const removeAllCounters = (cardId: string) =>
  request<import('../types/game').Card>('DELETE', `/cards/${cardId}/counters`)

export const searchTokens = (q: string) =>
  request<{ results: { name: string; image_uri: string }[] }>('GET', `/game/tokens/search?q=${encodeURIComponent(q)}`)

export const createToken = (name: string, image_uri: string, x = 0.5, y = 0.5) =>
  request<import('../types/game').Card>('POST', '/game/create-token', { name, image_uri, x, y })

export const flipCard = (cardId: string) =>
  request<import('../types/game').Card>('POST', `/cards/${cardId}/flip`)

export const transformCard = (cardId: string) =>
  request<import('../types/game').Card>('POST', `/cards/${cardId}/transform`)

export const resetCommanderReturns = () =>
  request<{ ok: boolean }>('POST', '/game/commander-returns/reset')

export const setActiveViewer = (zone: 'graveyard' | 'exile' | null) =>
  request<{ ok: boolean }>('POST', '/game/active-viewer', { zone })

export const setSpectatorZoneViewing = (enabled: boolean) =>
  request<{ ok: boolean }>('POST', '/game/spectator-zone-viewing', { enabled })

export const touchSession = () =>
  request<{ ok: boolean }>('POST', '/game/touch')

export const clearGame = () =>
  request<{ ok: boolean }>('POST', '/game/clear')

export const getSpectatorToken = () =>
  request<{ token: string }>('POST', '/game/spectator-token')

export const updateArenaSize = (arenaWidth: number, arenaHeight: number, cardScale: number) =>
  request<{ ok: boolean }>('POST', '/game/arena-size', { arena_width: arenaWidth, arena_height: arenaHeight, card_scale: cardScale })

export const updateZOrder = (ids: string[]) =>
  request<{ ok: boolean }>('POST', '/game/z-order', { ids })

