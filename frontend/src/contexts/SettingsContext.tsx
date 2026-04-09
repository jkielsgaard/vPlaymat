import { createContext, useContext } from 'react'
import type { Settings } from '../hooks/useSettings'
import { SETTINGS_DEFAULTS } from '../hooks/useSettings'

interface SettingsContextValue {
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => void
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: SETTINGS_DEFAULTS,
  updateSettings: () => {},
})

export function useSettingsContext() {
  return useContext(SettingsContext)
}
