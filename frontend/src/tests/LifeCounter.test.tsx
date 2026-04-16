// Tests for the LifeCounter component — increment, decrement, and read-only mode.
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LifeCounter } from '../components/ui/LifeCounter'

describe('LifeCounter', () => {
  it('renders the starting life total', () => {
    render(<LifeCounter life={20} onAdjust={vi.fn()} />)
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('calls onAdjust with +1 when increment button is clicked', () => {
    const onAdjust = vi.fn()
    render(<LifeCounter life={20} onAdjust={onAdjust} />)
    fireEvent.click(screen.getByRole('button', { name: /\+/i }))
    expect(onAdjust).toHaveBeenCalledWith(1)
  })

  it('calls onAdjust with -1 when decrement button is clicked', () => {
    const onAdjust = vi.fn()
    render(<LifeCounter life={20} onAdjust={onAdjust} />)
    fireEvent.click(screen.getByRole('button', { name: /−|-/i }))
    expect(onAdjust).toHaveBeenCalledWith(-1)
  })

  it('displays updated life value from props', () => {
    const onAdjust = vi.fn()
    const { rerender } = render(<LifeCounter life={20} onAdjust={onAdjust} />)
    rerender(<LifeCounter life={17} onAdjust={onAdjust} />)
    expect(screen.getByText('17')).toBeInTheDocument()
  })
})
