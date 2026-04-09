import { useState } from 'react'
import type { CommanderZoneCorner, Settings } from '../../hooks/useSettings'

const ARENA_MIN_W = 800
const ARENA_MAX_W = 3840
const ARENA_MIN_H = 450
const ARENA_MAX_H = 2160

const BG_PRESETS = [
  { label: 'Felt green', value: '#1a2e1a' },
  { label: 'Black', value: '#000000' },
  { label: 'Dark blue', value: '#0d1a3a' },
  { label: 'Dark brown', value: '#2a1a0a' },
  { label: 'Dark grey', value: '#1a1a1a' },
]

const PAGE_BG_PRESETS = [
  { label: 'Deep green', value: '#0d1a0d' },
  { label: 'Black', value: '#000000' },
  { label: 'Dark', value: '#111111' },
]

interface SettingsPanelProps {
  settings: Settings
  onUpdate: (partial: Partial<Settings>) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onUpdate, onClose }: SettingsPanelProps) {
  const [widthInput, setWidthInput] = useState(String(settings.arenaWidth))
  const [heightInput, setHeightInput] = useState(String(settings.arenaHeight))

  function commitWidth() {
    const v = Math.max(ARENA_MIN_W, Math.min(ARENA_MAX_W, parseInt(widthInput) || ARENA_MIN_W))
    setWidthInput(String(v))
    onUpdate({ arenaWidth: v })
  }

  function commitHeight() {
    const v = Math.max(ARENA_MIN_H, Math.min(ARENA_MAX_H, parseInt(heightInput) || ARENA_MIN_H))
    setHeightInput(String(v))
    onUpdate({ arenaHeight: v })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-end"
      onClick={onClose}
    >
      <div
        className="h-full w-80 bg-mtg-card border-l border-gold/30 p-6 overflow-y-auto flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-gold font-semibold text-lg">Settings</h2>
          <button
            aria-label="Close"
            className="text-gray-400 hover:text-gold text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Card scale */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Card Scale — {settings.cardScale.toFixed(1)}×
          </h3>
          <input
            type="range"
            aria-label="Card scale"
            min={0.5}
            max={2.0}
            step={0.1}
            value={settings.cardScale}
            onChange={(e) => onUpdate({ cardScale: parseFloat(e.target.value) })}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>0.5×</span><span>2.0×</span>
          </div>
        </section>

        {/* Arena size */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Arena Size</h3>
          <div className="flex gap-3 items-center">
            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor="arena-width" className="text-gray-400 text-xs">Width (px)</label>
              <input
                id="arena-width"
                aria-label="Width"
                type="number"
                min={ARENA_MIN_W}
                max={ARENA_MAX_W}
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                onBlur={commitWidth}
                onKeyDown={(e) => e.key === 'Enter' && commitWidth()}
                className="bg-mtg-bg border border-felt-light rounded px-2 py-1 text-sm text-gray-200 w-full"
              />
            </div>
            <span className="text-gray-500 mt-4">×</span>
            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor="arena-height" className="text-gray-400 text-xs">Height (px)</label>
              <input
                id="arena-height"
                aria-label="Height"
                type="number"
                min={ARENA_MIN_H}
                max={ARENA_MAX_H}
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                onBlur={commitHeight}
                onKeyDown={(e) => e.key === 'Enter' && commitHeight()}
                className="bg-mtg-bg border border-felt-light rounded px-2 py-1 text-sm text-gray-200 w-full"
              />
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-1">Min {ARENA_MIN_W}×{ARENA_MIN_H} — Max {ARENA_MAX_W}×{ARENA_MAX_H}</p>
        </section>

        {/* Arena background */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Arena Background</h3>
          <div className="flex gap-2 flex-wrap mb-2">
            {BG_PRESETS.map((p) => (
              <button
                key={p.value}
                title={p.label}
                className={`w-7 h-7 rounded border-2 transition-all ${
                  settings.arenaBackground === p.value ? 'border-gold' : 'border-transparent hover:border-gold/40'
                }`}
                style={{ background: p.value }}
                onClick={() => onUpdate({ arenaBackground: p.value })}
              />
            ))}
          </div>
          <input
            type="color"
            value={settings.arenaBackground}
            onChange={(e) => onUpdate({ arenaBackground: e.target.value })}
            className="w-full h-8 rounded cursor-pointer border border-felt-light bg-transparent"
            title="Custom colour"
          />
        </section>

        {/* Commander zone */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Commander Zone
          </h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">
                Card size — {settings.commanderCardScale.toFixed(1)}×
              </label>
              <input
                type="range"
                aria-label="Commander card scale"
                min={0.4}
                max={1.5}
                step={0.1}
                value={settings.commanderCardScale}
                onChange={(e) => onUpdate({ commanderCardScale: parseFloat(e.target.value) })}
                className="w-full accent-gold"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-0.5">
                <span>0.4×</span><span>1.5×</span>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Position</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'top-left',     label: '↖ Top left' },
                    { value: 'top-right',    label: '↗ Top right' },
                    { value: 'bottom-left',  label: '↙ Bottom left' },
                    { value: 'bottom-right', label: '↘ Bottom right' },
                  ] as { value: CommanderZoneCorner; label: string }[]
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                      settings.commanderZoneCorner === value
                        ? 'bg-gold text-black border-gold font-semibold'
                        : 'bg-felt border-felt-light text-gray-300 hover:border-gold/40'
                    }`}
                    onClick={() => onUpdate({ commanderZoneCorner: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Hover card preview */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Hover Card Preview — {settings.cardPreviewScale.toFixed(1)}×
          </h3>
          <input
            type="range"
            aria-label="Hover card preview scale"
            min={0.5}
            max={3.0}
            step={0.1}
            value={settings.cardPreviewScale}
            onChange={(e) => onUpdate({ cardPreviewScale: parseFloat(e.target.value) })}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>0.5×</span><span>3.0×</span>
          </div>
          <p className="text-gray-600 text-[10px] mt-1">Shown in the private side panel — also controls panel width</p>
        </section>

        {/* Reveal overlay */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Reveal Overlay — {settings.revealCardScale.toFixed(1)}×
          </h3>
          <input
            type="range"
            aria-label="Reveal card scale"
            min={0.5}
            max={3.0}
            step={0.1}
            value={settings.revealCardScale}
            onChange={(e) => onUpdate({ revealCardScale: parseFloat(e.target.value) })}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>0.5×</span><span>3.0×</span>
          </div>
        </section>

        {/* Tapped card tint */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Tapped Card Tint</h3>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.tappedCardTint}
              onChange={(e) => onUpdate({ tappedCardTint: e.target.checked })}
              className="accent-gold"
            />
            <span className="text-gray-300 text-xs">Amber tint on tapped cards</span>
          </label>
          <p className="text-gray-600 text-[10px] mt-1">Makes tapped vs untapped obvious at stream resolution</p>
        </section>

        {/* Card stack gap */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Stack Gap — {settings.stackGap} px
          </h3>
          <input
            type="range"
            aria-label="Stack gap"
            min={20}
            max={60}
            step={1}
            value={settings.stackGap}
            onChange={(e) => onUpdate({ stackGap: parseInt(e.target.value) })}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>20 px</span><span>60 px</span>
          </div>
          <p className="text-gray-600 text-[10px] mt-1">Offset between overlapping cards — 0 = fully stacked, higher = more of each card visible</p>
        </section>

        {/* Attachment gap */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Attachment Gap — {settings.attachGap} px
          </h3>
          <input
            type="range"
            aria-label="Attachment gap"
            min={20}
            max={60}
            step={1}
            value={settings.attachGap}
            onChange={(e) => onUpdate({ attachGap: parseInt(e.target.value) })}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>20 px</span><span>60 px</span>
          </div>
          <p className="text-gray-600 text-[10px] mt-1">Diagonal offset for equipment/aura attached to a card</p>
        </section>

        {/* Counter badges */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Counter Badges — {settings.counterBadgeScale.toFixed(1)}×
          </h3>
          <input
            type="range"
            aria-label="Counter badge scale"
            min={0.5}
            max={3.0}
            step={0.1}
            value={settings.counterBadgeScale}
            onChange={(e) => onUpdate({ counterBadgeScale: parseFloat(e.target.value) })}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>0.5×</span><span>3.0×</span>
          </div>
        </section>

        {/* Zone viewer (Graveyard & Exile) */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Zone Viewer (GY &amp; Exile)
          </h3>
          <label className="text-gray-400 text-xs block mb-1">
            Card size — {settings.zoneViewerCardScale.toFixed(1)}×
          </label>
          <input
            type="range"
            aria-label="Zone viewer card scale"
            min={0.5}
            max={2.5}
            step={0.1}
            value={settings.zoneViewerCardScale}
            onChange={(e) => onUpdate({ zoneViewerCardScale: parseFloat(e.target.value) })}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>0.5×</span><span>2.5×</span>
          </div>
        </section>

        {/* Library browser */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
            Library Browser
          </h3>
          <label className="text-gray-400 text-xs block mb-1">
            Height — {settings.libraryBrowserHeight} px
          </label>
          <input
            type="range"
            aria-label="Library browser height"
            min={120}
            max={600}
            step={20}
            value={settings.libraryBrowserHeight}
            onChange={(e) => onUpdate({ libraryBrowserHeight: parseInt(e.target.value) })}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-gray-500 text-xs mt-1">
            <span>120 px</span><span>600 px</span>
          </div>
        </section>

        {/* Page background */}
        <section>
          <h3 className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Page Background</h3>
          <div className="flex gap-2 flex-wrap mb-2">
            {PAGE_BG_PRESETS.map((p) => (
              <button
                key={p.value}
                title={p.label}
                className={`w-7 h-7 rounded border-2 transition-all ${
                  settings.pageBackground === p.value ? 'border-gold' : 'border-transparent hover:border-gold/40'
                }`}
                style={{ background: p.value }}
                onClick={() => onUpdate({ pageBackground: p.value })}
              />
            ))}
          </div>
          <input
            type="color"
            value={settings.pageBackground}
            onChange={(e) => onUpdate({ pageBackground: e.target.value })}
            className="w-full h-8 rounded cursor-pointer border border-felt-light bg-transparent"
            title="Custom colour"
          />
        </section>
      </div>
    </div>
  )
}
