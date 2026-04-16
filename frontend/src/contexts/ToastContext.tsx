// React context and hook for showing temporary toast notifications across the app.
import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface Toast {
  id: number
  message: string
}

interface ToastContextValue {
  addToast: (message: string) => void
  toasts: Toast[]
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {}, toasts: [] })

let _nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string) => {
    const id = ++_nextId
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, toasts }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

/** Render toasts wherever this is placed — put it inside the arena so OBS captures them. */
export function ToastDisplay() {
  const { toasts } = useContext(ToastContext)
  if (toasts.length === 0) return null
  return (
    <div className="absolute bottom-14 right-3 flex flex-col gap-1.5 z-20 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-black/80 border border-gold/30 text-gray-200 text-xs px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
