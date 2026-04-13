import { useState } from 'react'

export type CommanderZoneCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export interface Settings {
  gameMode: 'normal' | 'commander'
  arenaWidth: number
  arenaHeight: number
  cardScale: number
  arenaBackground: string
  pageBackground: string
  commanderCardScale: number
  commanderZoneCorner: CommanderZoneCorner
  cardPreviewScale: number
  zoneViewerCardScale: number
  libraryBrowserHeight: number
  counterBadgeScale: number
  revealCardScale: number
  tappedCardTint: boolean
  stackGap: number
  attachGap: number
}

export const SETTINGS_DEFAULTS: Settings = {
  gameMode: 'normal',
  arenaWidth: 1280,
  arenaHeight: 720,
  cardScale: 1.3,
  arenaBackground: '#1a2e1a',
  pageBackground: '#0d1a0d',
  commanderCardScale: 1.2,
  commanderZoneCorner: 'top-right',
  cardPreviewScale: 1.0,
  zoneViewerCardScale: 1.0,
  libraryBrowserHeight: 160,
  counterBadgeScale: 1.5,
  revealCardScale: 1.8,
  tappedCardTint: false,
  stackGap: 20,
  attachGap: 20,
}

const STORAGE_KEY = 'vmagic-settings'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // Corrupt storage — use defaults
  }
  return { ...SETTINGS_DEFAULTS }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  function updateSettings(partial: Partial<Settings>) {
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

  return { settings, updateSettings }
}
