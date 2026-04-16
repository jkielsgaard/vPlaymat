// Tests for the ZoneViewer overlay — card display, close button, and read-only mode.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ZoneViewer } from '../components/overlays/ZoneViewer'
import type { Card } from '../types/game'

function makeCard(name: string): Card {
  return {
    id: name,
    name,
    image_uri: `https://example.com/${name}.jpg`,
    zone: 'graveyard',
    tapped: false,
    counters: {},
    x: 0,
    y: 0,
    is_commander: false,
    is_token: false,
  }
}

const CARDS = [makeCard('Lightning Bolt'), makeCard('Counterspell'), makeCard('Dark Ritual')]

describe('ZoneViewer', () => {
  it('renders the title and card count', () => {
    render(
      <ZoneViewer title="Graveyard" cards={CARDS} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('Graveyard')).toBeInTheDocument()
    expect(screen.getByText('(3 cards)')).toBeInTheDocument()
  })

  it('shows card names under each card', () => {
    render(
      <ZoneViewer title="Graveyard" cards={CARDS} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
    expect(screen.getByText('Counterspell')).toBeInTheDocument()
    expect(screen.getByText('Dark Ritual')).toBeInTheDocument()
  })

  it('shows singular "card" when only one card', () => {
    render(
      <ZoneViewer title="Exile" cards={[CARDS[0]]} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('(1 card)')).toBeInTheDocument()
  })

  it('shows empty state when no cards', () => {
    render(
      <ZoneViewer title="Graveyard" cards={[]} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('No cards here')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <ZoneViewer title="Graveyard" cards={CARDS} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={onClose} />
    )
    fireEvent.click(screen.getByTestId('zone-viewer-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn()
    render(
      <ZoneViewer title="Graveyard" cards={CARDS} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={onClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <ZoneViewer title="Graveyard" cards={CARDS} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={onClose} />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when clicking inside the panel', () => {
    const onClose = vi.fn()
    render(
      <ZoneViewer title="Graveyard" cards={CARDS} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={onClose} />
    )
    // Click the panel heading — should NOT call onClose
    fireEvent.click(screen.getByText('Graveyard'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onContextMenu when right-clicking a card (viewer stays open)', () => {
    const onClose = vi.fn()
    const onContextMenu = vi.fn()
    render(
      <ZoneViewer title="Graveyard" cards={CARDS} cardScale={1} onContextMenu={onContextMenu} onHover={vi.fn()} onClose={onClose} />
    )
    const images = screen.getAllByRole('img')
    fireEvent.contextMenu(images[0])
    expect(onContextMenu).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders cards in the order supplied (graveyard_order from backend is newest-first)', () => {
    // Backend sends graveyard cards newest-first; ZoneViewer renders them as-is.
    const newestFirst = [makeCard('Dark Ritual'), makeCard('Counterspell'), makeCard('Lightning Bolt')]
    render(
      <ZoneViewer title="Graveyard" cards={newestFirst} cardScale={1} onContextMenu={vi.fn()} onHover={vi.fn()} onClose={vi.fn()} />
    )
    const names = screen.getAllByText(/Lightning Bolt|Counterspell|Dark Ritual/)
    expect(names[0].textContent).toBe('Dark Ritual')
  })
})
