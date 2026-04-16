// Tests for the CardView component — rendering, tap state, counters, and hover callbacks.
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CardView } from '../components/cards/CardView'
import type { Card } from '../types/game'

const baseCard: Card = {
  id: 'card-1',
  name: 'Lightning Bolt',
  image_uri: 'https://example.com/lightning-bolt.jpg',
  zone: 'hand',
  tapped: false,
  counters: {},
  x: 0,
  y: 0,
  is_commander: false,
  is_token: false,
}

describe('CardView', () => {
  it('renders the card image with correct src and alt', () => {
    render(<CardView card={baseCard} />)
    const img = screen.getByRole('img', { name: /lightning bolt/i })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', baseCard.image_uri)
  })

  it('does not apply tapped class when card is untapped', () => {
    render(<CardView card={baseCard} />)
    const wrapper = screen.getByTestId('card-view')
    expect(wrapper).not.toHaveClass('rotate-90')
  })

  it('applies rotation transform when card is tapped', () => {
    render(<CardView card={{ ...baseCard, tapped: true }} />)
    // Rotation is now on an inner div (not the outer wrapper) so the outer div
    // does NOT have rotate-90 — instead its first child has a rotate transform style.
    const wrapper = screen.getByTestId('card-view')
    expect(wrapper).not.toHaveClass('rotate-90')
    const inner = wrapper.firstElementChild as HTMLElement
    expect(inner?.style.transform).toMatch(/rotate\(90deg\)/)
  })

  it('calls onTap callback when clicked', () => {
    const onTap = vi.fn()
    render(<CardView card={baseCard} onTap={onTap} />)
    fireEvent.click(screen.getByTestId('card-view'))
    expect(onTap).toHaveBeenCalledWith(baseCard.id)
  })

  it('calls onContextMenu callback on right-click', () => {
    const onContextMenu = vi.fn()
    render(<CardView card={baseCard} onContextMenu={onContextMenu} />)
    fireEvent.contextMenu(screen.getByTestId('card-view'))
    expect(onContextMenu).toHaveBeenCalled()
  })
})
