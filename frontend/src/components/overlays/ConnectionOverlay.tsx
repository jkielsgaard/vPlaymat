import { useEffect, useState } from 'react'

interface ConnectionOverlayProps {
  connected: boolean
  hasGameState: boolean
  lostAt: number | null
}

export function ConnectionOverlay({ connected, hasGameState, lostAt }: ConnectionOverlayProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!lostAt) return
    setSeconds(Math.floor((Date.now() - lostAt) / 1000))
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - lostAt) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [lostAt])

  if (connected) return null

  const isFirstLoad = !hasGameState

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-mtg-card border border-gold/30 rounded-xl p-8 text-center max-w-sm shadow-2xl">
        <div className="w-10 h-10 border-2 border-gold/20 border-t-gold rounded-full animate-spin mx-auto mb-5" />
        <h2 className="text-gold font-semibold text-lg mb-2">
          {isFirstLoad ? 'Connecting to server…' : 'Reconnecting to server…'}
        </h2>
        <p className="text-gray-400 text-sm">
          {isFirstLoad
            ? 'Establishing connection — this usually takes a moment.'
            : `Connection lost${lostAt ? ` — ${seconds}s ago` : ''}. Retrying automatically.`}
        </p>
      </div>
    </div>
  )
}
