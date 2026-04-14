import { useState } from 'react'

export type SpectatorPreviewCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface SpectatorSettings {
  previewEnabled: boolean
  previewScale: number
  previewCorner: SpectatorPreviewCorner
}

const DEFAULTS: SpectatorSettings = {
  previewEnabled: true,
  previewScale: 1.5,
  previewCorner: 'bottom-right',
}

const STORAGE_KEY = 'vmagic-spectator-prefs'

function load(): SpectatorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // Corrupt storage — use defaults
  }
  return { ...DEFAULTS }
}

export function useSpectatorSettings() {
  const [settings, setSettings] = useState<SpectatorSettings>(load)

  function update(partial: Partial<SpectatorSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage write failed — still update in-memory state
      }
      return next
    })
  }

  return { settings, update }
}
