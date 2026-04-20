// Tests for the SettingsPanel component — preset buttons, custom inputs, and slider settings.
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPanel } from '../components/menu/SettingsPanel'
import type { Settings } from '../hooks/useSettings'
import { SETTINGS_DEFAULTS } from '../hooks/useSettings'

const makeProps = (overrides: Partial<Settings> = {}) => ({
  settings: { ...SETTINGS_DEFAULTS, ...overrides },
  onUpdate: vi.fn(),
  onClose: vi.fn(),
  spectatorZoneViewing: false,
  onToggleSpectatorZoneViewing: vi.fn(),
})

describe('SettingsPanel', () => {
  it('renders the settings dialog', () => {
    render(<SettingsPanel {...makeProps()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('updates card scale when slider changes', () => {
    const props = makeProps()
    render(<SettingsPanel {...props} />)
    const slider = screen.getByRole('slider', { name: /^card scale$/i })
    fireEvent.change(slider, { target: { value: '1.5' } })
    expect(props.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ cardScale: 1.5 }))
  })

  it('calls onClose when close button is clicked', async () => {
    const props = makeProps()
    render(<SettingsPanel {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})

describe('SettingsPanel — arena size presets', () => {
  it('renders S, M, L, and Custom buttons', () => {
    render(<SettingsPanel {...makeProps()} />)
    // Accessible names include dimensions, e.g. "S 1200×700"
    expect(screen.getByRole('button', { name: /^s /i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^m /i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^l /i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^custom$/i })).toBeInTheDocument()
  })

  it('highlights S when dimensions match the default (1200×700)', () => {
    render(<SettingsPanel {...makeProps({ arenaWidth: 1200, arenaHeight: 700 })} />)
    const sBtn = screen.getByRole('button', { name: /^s /i })
    expect(sBtn.className).toContain('bg-gold')
  })

  it('clicking M calls onUpdate with 1440×840', async () => {
    const props = makeProps()
    render(<SettingsPanel {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^m /i }))
    expect(props.onUpdate).toHaveBeenCalledWith({ arenaWidth: 1440, arenaHeight: 840 })
  })

  it('clicking L calls onUpdate with 1680×980', async () => {
    const props = makeProps()
    render(<SettingsPanel {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^l /i }))
    expect(props.onUpdate).toHaveBeenCalledWith({ arenaWidth: 1680, arenaHeight: 980 })
  })

  it('custom inputs are hidden when a preset is active', () => {
    render(<SettingsPanel {...makeProps({ arenaWidth: 1200, arenaHeight: 700 })} />)
    expect(screen.queryByLabelText(/^width \(px\)$/i)).not.toBeInTheDocument()
  })

  it('clicking Custom shows the width and height inputs', async () => {
    render(<SettingsPanel {...makeProps({ arenaWidth: 1200, arenaHeight: 700 })} />)
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    expect(screen.getByLabelText(/^width \(px\)$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^height \(px\)$/i)).toBeInTheDocument()
  })

  it('custom inputs are shown by default when dimensions do not match any preset', () => {
    render(<SettingsPanel {...makeProps({ arenaWidth: 1600, arenaHeight: 900 })} />)
    expect(screen.getByLabelText(/^width \(px\)$/i)).toBeInTheDocument()
  })

  it('custom width input clamps to minimum on blur', async () => {
    const props = makeProps({ arenaWidth: 1600, arenaHeight: 900 })
    render(<SettingsPanel {...props} />)
    const widthInput = screen.getByLabelText(/^width \(px\)$/i)
    await userEvent.clear(widthInput)
    await userEvent.type(widthInput, '2')
    fireEvent.blur(widthInput)
    expect(props.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ arenaWidth: 800 }))
  })

  it('selecting a preset after Custom hides the custom inputs', async () => {
    render(<SettingsPanel {...makeProps({ arenaWidth: 1600, arenaHeight: 900 })} />)
    expect(screen.getByLabelText(/^width \(px\)$/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^m /i }))
    expect(screen.queryByLabelText(/^width \(px\)$/i)).not.toBeInTheDocument()
  })
})
