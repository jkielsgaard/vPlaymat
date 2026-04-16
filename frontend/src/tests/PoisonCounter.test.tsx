// Tests for the PoisonCounter component — increment, decrement, and read-only mode.
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PoisonCounter } from '../components/ui/PoisonCounter'

describe('PoisonCounter', () => {
  it('renders the current poison count', () => {
    render(<PoisonCounter count={3} onAdjust={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onAdjust with +1 when increment button is clicked', () => {
    const onAdjust = vi.fn()
    render(<PoisonCounter count={0} onAdjust={onAdjust} />)
    fireEvent.click(screen.getByRole('button', { name: /\+/i }))
    expect(onAdjust).toHaveBeenCalledWith(1)
  })

  it('calls onAdjust with -1 when decrement button is clicked', () => {
    const onAdjust = vi.fn()
    render(<PoisonCounter count={3} onAdjust={onAdjust} />)
    fireEvent.click(screen.getByRole('button', { name: /−|-/i }))
    expect(onAdjust).toHaveBeenCalledWith(-1)
  })

  it('hides buttons in read-only mode', () => {
    render(<PoisonCounter count={3} onAdjust={vi.fn()} readOnly />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('displays updated count from props', () => {
    const { rerender } = render(<PoisonCounter count={0} onAdjust={vi.fn()} />)
    rerender(<PoisonCounter count={7} onAdjust={vi.fn()} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
