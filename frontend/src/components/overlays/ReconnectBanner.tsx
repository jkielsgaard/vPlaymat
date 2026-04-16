// Reconnect banner — blocking overlay shown while the WebSocket is disconnected.
import { useEffect, useState } from 'react'

interface ReconnectBannerProps {
  /** Unix-ms timestamp of when the connection was lost */
  lostAt: number
}

export function ReconnectBanner({ lostAt }: ReconnectBannerProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    setSeconds(Math.floor((Date.now() - lostAt) / 1000))
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - lostAt) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [lostAt])

  return (
    <div className="fixed top-12 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="bg-red-900/90 border border-red-500/60 text-red-200 text-xs font-semibold px-4 py-1.5 rounded-b-lg shadow-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
        Reconnecting to server… ({seconds}s)
      </div>
    </div>
  )
}
