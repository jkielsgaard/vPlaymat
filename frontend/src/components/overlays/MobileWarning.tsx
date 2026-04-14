import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'vmagic-mobile-dismissed'

export function MobileWarning() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (window.innerWidth < 768 && !sessionStorage.getItem(DISMISSED_KEY)) {
      setShow(true)
    }
  }, [])

  if (!show) return null

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, 'true')
    setShow(false)
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-6">
      <div className="bg-mtg-card border border-gold/30 rounded-xl p-8 text-center max-w-xs shadow-2xl">
        <div className="text-3xl mb-4">🖥️</div>
        <h2 className="text-gold font-semibold text-lg mb-2">Desktop recommended</h2>
        <p className="text-gray-400 text-sm mb-6">
          vPlaymat is designed for desktop browsers. On small screens the board
          may be difficult to use.
        </p>
        <button
          className="px-4 py-2 bg-felt border border-gold/40 text-gold rounded hover:bg-felt-light transition-colors text-sm"
          onClick={dismiss}
        >
          Continue anyway
        </button>
      </div>
    </div>
  )
}
