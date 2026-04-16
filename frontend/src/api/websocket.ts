// WebSocket helper — builds the connection URL from env vars or derives it from window.location.
import type { GameState } from '../types/game'

// In development VITE_WS_URL=ws://localhost:8000/ws (set in .env)
// In production it is empty — derive from window.location so it works on any host.
// Uses wss:// when the page is served over https, ws:// otherwise.
function getWsUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (envUrl) return envUrl
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

const RECONNECT_DELAY_MS = 2000

export function createWebSocket(
  onMessage: (state: GameState) => void,
  onStatusChange?: (connected: boolean) => void,
): () => void {
  let ws: WebSocket | null = null
  let stopped = false

  function connect() {
    ws = new WebSocket(getWsUrl())

    ws.onopen = () => onStatusChange?.(true)

    ws.onmessage = (event: MessageEvent) => {
      try {
        const state: GameState = JSON.parse(event.data as string)
        onMessage(state)
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      onStatusChange?.(false)
      if (!stopped) {
        setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  connect()

  // Returns a cleanup / stop function
  return () => {
    stopped = true
    ws?.close()
  }
}
