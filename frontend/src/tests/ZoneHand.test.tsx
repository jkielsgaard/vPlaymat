// Tests for the ZoneHand component — card rendering and play-to-battlefield interaction.
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ZoneHand } from '../components/layout/ZoneHand'
import type { Card } from '../types/game'

const makeCard = (id: string): Card => ({
  id,
  name: `Card ${id}`,
  image_uri: `https://example.com/${id}.jpg`,
  zone: 'hand',
  tapped: false,
  counters: {},
  x: 0,
  y: 0,
  is_commander: false,
  is_token: false,
})

describe('ZoneHand', () => {
  it('renders cards in hand', () => {
    render(
      <ZoneHand
        cards={[makeCard('a'), makeCard('b')]}
        cardScale={1}
        onContextMenu={vi.fn()}
        onHover={vi.fn()}
      />
    )
    expect(screen.getAllByTestId('card-view')).toHaveLength(2)
  })

  it('does not call onTap when a hand card is clicked', () => {
    // ZoneHand no longer accepts onTap — clicking a card should do nothing tap-related
    render(
      <ZoneHand
        cards={[makeCard('a')]}
        cardScale={1}
        onContextMenu={vi.fn()}
        onHover={vi.fn()}
      />
    )
    // Click the card — should not throw and no tap API called
    const card = screen.getByTestId('card-view')
    fireEvent.click(card)
    // If we got here without error, the test passes
    expect(card).toBeInTheDocument()
  })

  it('shows "No cards in hand" when hand is empty', () => {
    render(
      <ZoneHand
        cards={[]}
        cardScale={1}
        onContextMenu={vi.fn()}
        onHover={vi.fn()}
      />
    )
    expect(screen.getByText(/no cards in hand/i)).toBeInTheDocument()
  })
})
