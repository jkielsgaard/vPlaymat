import { useCallback, useEffect, useRef, useState } from 'react'
import { getLastActivity, touchSession } from '../api/rest'

// ---------------------------------------------------------------------------
// Timing constants
const WARN_AFTER_MS   = 50 * 60 * 1000  // show warning after 50 min idle
const EXPIRE_AFTER_MS = 60 * 60 * 1000  // expire session after 60 min idle
const POLL_MS         = 10 * 1000      // check every 10 seconds

interface UseSessionExpiryOptions {
  enabled?: boolean
}

export function useSessionExpiry({ enabled = true }: UseSessionExpiryOptions = {}) {
  const [warningVisible, setWarningVisible] = useState(false)
  const [minutesLeft, setMinutesLeft] = useState(5)
  const [sessionExpired, setSessionExpired] = useState(false)
  const firedRef = useRef(false)

  const extend = useCallback(async () => {
    await touchSession()
    firedRef.current = false
    setWarningVisible(false)
    setSessionExpired(false)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      const elapsed = Date.now() - getLastActivity()

      if (elapsed >= EXPIRE_AFTER_MS) {
        if (!firedRef.current) {
          firedRef.current = true
          setWarningVisible(false)
          setSessionExpired(true)
        }
        return
      }

      if (elapsed >= WARN_AFTER_MS) {
        const minsLeft = Math.ceil((EXPIRE_AFTER_MS - elapsed) / 60_000)
        setMinutesLeft(minsLeft)
        setWarningVisible(true)
      } else {
        setWarningVisible(false)
      }
    }, POLL_MS)

    return () => clearInterval(id)
  }, [enabled])

  return { warningVisible, minutesLeft, extend, sessionExpired }
}
