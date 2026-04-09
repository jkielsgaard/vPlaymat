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
})

describe('SettingsPanel', () => {
  it('renders the settings dialog', () => {
    render(<SettingsPanel {...makeProps()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('updates card scale when slider changes', () => {
    const { onUpdate, settings } = makeProps()
    render(<SettingsPanel settings={settings} onUpdate={onUpdate} onClose={vi.fn()} />)
    const slider = screen.getByRole('slider', { name: /^card scale$/i })
    fireEvent.change(slider, { target: { value: '1.5' } })
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ cardScale: 1.5 }))
  })

  it('shows the current arena width and allows typing without immediate clamping', async () => {
    const { onUpdate, settings } = makeProps()
    render(<SettingsPanel settings={settings} onUpdate={onUpdate} onClose={vi.fn()} />)
    const widthInput = screen.getByLabelText(/width/i)
    // Type a partial value — should NOT call onUpdate mid-type
    await userEvent.clear(widthInput)
    await userEvent.type(widthInput, '2')
    expect(onUpdate).not.toHaveBeenCalled()
    // Blur commits the value (clamped to minimum since "2" < 800)
    fireEvent.blur(widthInput)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ arenaWidth: 800 }))
  })

  it('clamps arena width to minimum on blur', () => {
    const { onUpdate, settings } = makeProps()
    render(<SettingsPanel settings={settings} onUpdate={onUpdate} onClose={vi.fn()} />)
    const widthInput = screen.getByLabelText(/width/i)
    fireEvent.change(widthInput, { target: { value: '400' } })
    fireEvent.blur(widthInput)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ arenaWidth: 800 }))
  })

  it('calls onClose when close button is clicked', async () => {
    const { onClose, settings } = makeProps()
    render(<SettingsPanel settings={settings} onUpdate={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
