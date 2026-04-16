// Tests for the LibraryBrowser component — card display and search filtering.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LibraryBrowser } from '../components/overlays/LibraryBrowser'
import type { Card } from '../types/game'

function makeCard(name: string, i: number): Card {
  return {
    id: `id-${i}`,
    name,
    image_uri: `https://example.com/${i}.jpg`,
    zone: 'library',
    tapped: false,
    counters: {},
    x: 0,
    y: 0,
    is_commander: false,
    is_token: false,
  }
}

const CARDS = [
  makeCard('Lightning Bolt', 0),
  makeCard('Counterspell', 1),
  makeCard('Dark Ritual', 2),
  makeCard('Llanowar Elves', 3),
]

function renderBrowser(overrides = {}) {
  const props = {
    cards: CARDS,
    cardScale: 1,
    arenaWidth: 1280,
    maxHeight: 200,
    shuffleAfter: false,
    onShuffleAfterChange: vi.fn(),
    onContextMenu: vi.fn(),
    onHover: vi.fn(),
    onShuffle: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<LibraryBrowser {...props} />)
  return props
}

describe('LibraryBrowser', () => {
  it('renders the title and card count', () => {
    renderBrowser()
    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('(4 cards)')).toBeInTheDocument()
  })

  it('shows all card names in draw order', () => {
    renderBrowser()
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
    expect(screen.getByText('Counterspell')).toBeInTheDocument()
    expect(screen.getByText('Dark Ritual')).toBeInTheDocument()
    expect(screen.getByText('Llanowar Elves')).toBeInTheDocument()
  })

  it('shows position badges starting at 1', () => {
    renderBrowser()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('filters cards by search query', () => {
    renderBrowser()
    fireEvent.change(screen.getByTestId('library-search'), { target: { value: 'bolt' } })
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
    expect(screen.queryByText('Counterspell')).not.toBeInTheDocument()
  })

  it('shows original position number when filtered', () => {
    renderBrowser()
    fireEvent.change(screen.getByTestId('library-search'), { target: { value: 'dark' } })
    // Dark Ritual is position 3 in the original order
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows no-results message when search matches nothing', () => {
    renderBrowser()
    fireEvent.change(screen.getByTestId('library-search'), { target: { value: 'zzz' } })
    expect(screen.getByText('No cards match your search')).toBeInTheDocument()
  })

  it('calls onClose when × button is clicked', () => {
    const { onClose } = renderBrowser()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', () => {
    const { onClose } = renderBrowser()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onShuffle and onClose when "Shuffle & Close" is clicked', () => {
    const { onShuffle, onClose } = renderBrowser()
    fireEvent.click(screen.getByText('Shuffle & Close'))
    expect(onShuffle).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onShuffleAfterChange when toggle is clicked', () => {
    const { onShuffleAfterChange } = renderBrowser()
    fireEvent.click(screen.getByTestId('shuffle-after-toggle'))
    expect(onShuffleAfterChange).toHaveBeenCalledWith(true)
  })

  it('calls onShuffle after context menu when shuffleAfter is true (viewer stays open)', () => {
    const { onContextMenu, onShuffle, onClose } = renderBrowser({ shuffleAfter: true })
    const images = screen.getAllByRole('img')
    fireEvent.contextMenu(images[0])
    expect(onContextMenu).toHaveBeenCalled()
    expect(onShuffle).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does NOT call onShuffle after context menu when shuffleAfter is false', () => {
    const { onContextMenu, onShuffle } = renderBrowser({ shuffleAfter: false })
    const images = screen.getAllByRole('img')
    fireEvent.contextMenu(images[0])
    expect(onContextMenu).toHaveBeenCalled()
    expect(onShuffle).not.toHaveBeenCalled()
  })

  it('shows empty-library message when no cards', () => {
    renderBrowser({ cards: [] })
    expect(screen.getByText('Library is empty')).toBeInTheDocument()
  })
})
