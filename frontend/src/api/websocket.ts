import type { GameState } from '../types/game'

const WS_URL = 'ws://localhost:8000/ws'
const RECONNECT_DELAY_MS = 2000

export function createWebSocket(
  onMessage: (state: GameState) => void,
  onStatusChange?: (connected: boolean) => void,
): () => void {
  let ws: WebSocket | null = null
  let stopped = false

  function connect() {
    ws = new WebSocket(WS_URL)

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
