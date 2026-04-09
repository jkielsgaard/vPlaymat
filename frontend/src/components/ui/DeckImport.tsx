import { useState } from 'react'
import { importDeck } from '../../api/rest'

interface DeckImportProps {
  /** When true, renders the modal open without showing the trigger button */
  forceOpen?: boolean
  /** Called after a successful import (used when forceOpen=true) */
  onImported?: () => void
}

export function DeckImport({ forceOpen = false, onImported }: DeckImportProps) {
  const [open, setOpen] = useState(false)
  const [decklist, setDecklist] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isOpen = forceOpen || open

  async function handleImport() {
    if (!decklist.trim()) {
      setError('Decklist cannot be empty')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await importDeck(decklist.trim())
      setDecklist('')
      setOpen(false)
      onImported?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setError(null)
    onImported?.()
  }

  return (
    <>
      {!forceOpen && (
        <button
          className="px-3 py-1.5 text-sm bg-felt border border-gold/50 text-gold rounded hover:bg-felt-light transition-colors"
          onClick={() => { setOpen(true); setError(null) }}
        >
          Import Deck
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={handleClose}
        >
          <div
            className="bg-mtg-card border border-gold/40 rounded-xl p-6 w-[480px] max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-gold font-semibold text-lg mb-4">Import Deck</h2>

            <textarea
              className="w-full h-64 bg-mtg-bg border border-felt-light rounded p-3 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-gold/60"
              placeholder="Paste decklist here (MTGA format)&#10;e.g. 4 Lightning Bolt (M21) 164"
              value={decklist}
              onChange={(e) => setDecklist(e.target.value)}
              autoFocus
            />

            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-gold text-black font-semibold rounded hover:bg-gold-light transition-colors disabled:opacity-50"
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
