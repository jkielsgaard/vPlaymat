import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../types/game'
import { getOrCreateSessionId } from './useSession'

const RECONNECT_DELAY_MS = 2000
const STATE_CACHE_KEY = 'vmagic-last-state'

function getWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined
  if (explicit) return explicit
  // Production: derive from current host so it works on any domain
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws`
}

// Defaults for fields added after the initial release — ensures old cached
// states are valid after a version upgrade.
const GAME_STATE_DEFAULTS: Partial<GameState> = {
  graveyard_order: [],
}

function loadCachedState(): GameState | null {
  try {
    const raw = localStorage.getItem(STATE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    return { ...GAME_STATE_DEFAULTS, ...parsed } as GameState
  } catch {
    return null
  }
}

function saveState(state: GameState): void {
  try {
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — skip silently
  }
}

export function useBoard() {
  // Initialise with cached state so the UI is immediately visible on reconnect
  const [gameState, setGameState] = useState<GameState | null>(loadCachedState)
  const [connected, setConnected] = useState(false)
  const stopRef = useRef(false)

  useEffect(() => {
    stopRef.current = false
    let ws: WebSocket
    // OBS view passes session_id in the URL — use it directly so the OBS browser
    // connects to the same session as the player's browser without sharing localStorage.
    const urlSessionId = new URLSearchParams(window.location.search).get('session_id')
    const sessionId = urlSessionId || getOrCreateSessionId()
    const wsUrl = `${getWsUrl()}?session_id=${encodeURIComponent(sessionId)}`

    function connect() {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => setConnected(true)

      ws.onmessage = (event: MessageEvent) => {
        try {
          const state = JSON.parse(event.data as string) as GameState
          setGameState(state)
          saveState(state)
        } catch {
          // Ignore malformed messages
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!stopRef.current) {
          setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      stopRef.current = true
      ws.close()
    }
  }, [])

  return { gameState, connected }
}
