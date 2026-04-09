import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ContextMenu } from '../components/overlays/ContextMenu'
import type { Card } from '../types/game'

const makeCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'card-1',
  name: 'Lightning Bolt',
  image_uri: 'https://example.com/bolt.jpg',
  zone: 'battlefield',
  tapped: false,
  counters: {},
  x: 0.5,
  y: 0.5,
  is_commander: false,
  is_token: false,
  ...overrides,
})

describe('ContextMenu', () => {
  it('renders card name in header', () => {
    render(
      <ContextMenu
        card={makeCard()}
        position={{ x: 100, y: 100 }}
        onMove={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
  })

  it('does not show "To Command Zone" for a normal card', () => {
    render(
      <ContextMenu
        card={makeCard({ is_commander: false })}
        position={{ x: 100, y: 100 }}
        onMove={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText(/to command zone/i)).not.toBeInTheDocument()
  })

  it('shows "To Command Zone" for the commander card', () => {
    render(
      <ContextMenu
        card={makeCard({ is_commander: true, zone: 'battlefield' })}
        position={{ x: 100, y: 100 }}
        onMove={vi.fn()}
        onClose={vi.fn()}
        isCommander
      />
    )
    expect(screen.getByText(/to command zone/i)).toBeInTheDocument()
  })

  it('does not show current zone as an option', () => {
    render(
      <ContextMenu
        card={makeCard({ zone: 'graveyard' })}
        position={{ x: 100, y: 100 }}
        onMove={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText(/to graveyard/i)).not.toBeInTheDocument()
  })
})
