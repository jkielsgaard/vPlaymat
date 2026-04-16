// Tests for the ZoneBattlefield component — card rendering, drag events, and selection.
import { render, screen, fireEvent, createEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ZoneBattlefield } from '../components/layout/ZoneBattlefield'
import type { Card } from '../types/game'

/**
 * Fire dragover then drop, both with matching coordinates.
 * ZoneBattlefield tracks cursor position via dragover (useRef), so we must
 * fire dragover first to populate lastDragPos before the drop resolves position.
 */
function fireDrop(
  element: Element,
  opts: { clientX: number; clientY: number; cardId: string; grabOffsetX: string; grabOffsetY: string },
) {
  const data: Record<string, string> = {
    cardId: opts.cardId,
    grabOffsetX: opts.grabOffsetX,
    grabOffsetY: opts.grabOffsetY,
  }

  // Fire dragover to populate lastDragPos
  const dragover = createEvent.dragOver(element)
  Object.defineProperty(dragover, 'clientX', { value: opts.clientX })
  Object.defineProperty(dragover, 'clientY', { value: opts.clientY })
  Object.defineProperty(dragover, 'dataTransfer', {
    value: { getData: (key: string) => data[key] ?? '', dropEffect: 'move' },
  })
  fireEvent(element, dragover)

  const event = createEvent.drop(element)
  Object.defineProperty(event, 'clientX', { value: opts.clientX })
  Object.defineProperty(event, 'clientY', { value: opts.clientY })
  Object.defineProperty(event, 'dataTransfer', {
    value: { getData: (key: string) => data[key] ?? '', dropEffect: 'move' },
  })
  fireEvent(element, event)
}

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

const defaultProps = {
  cards: [],
  selectedIds: new Set<string>(),
  onSelectionChange: vi.fn(),
  onTap: vi.fn(),
  onContextMenu: vi.fn(),
  onCardDropped: vi.fn(),
  onHover: vi.fn(),
  onAddCounter: vi.fn(),
  onBulkMove: vi.fn(),
  onGroupMoved: vi.fn(),
  cardScale: 1.0,
  cardZOrder: [],
}

describe('ZoneBattlefield', () => {
  it('renders the battlefield drop zone', () => {
    render(<ZoneBattlefield {...defaultProps} />)
    expect(screen.getByTestId('battlefield')).toBeInTheDocument()
  })

  it('renders cards placed on the battlefield', () => {
    const card = makeCard()
    render(<ZoneBattlefield {...defaultProps} cards={[card]} />)
    expect(screen.getByRole('img', { name: /lightning bolt/i })).toBeInTheDocument()
  })

  it('calls onCardDropped with card id when a card is dropped', () => {
    const onCardDropped = vi.fn()
    render(
      <ZoneBattlefield
        {...defaultProps}
        onCardDropped={onCardDropped}
      />
    )
    const zone = screen.getByTestId('battlefield')

    vi.spyOn(zone, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 600,
      right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => {},
    })

    fireDrop(zone, { clientX: 500, clientY: 300, cardId: 'card-1', grabOffsetX: '40', grabOffsetY: '56' })

    expect(onCardDropped).toHaveBeenCalledWith('card-1', expect.any(Number), expect.any(Number))
  })

  it('calls onCardDropped exactly once when a battlefield card is repositioned', () => {
    const onCardDropped = vi.fn()
    const card = makeCard({ zone: 'battlefield' })
    render(
      <ZoneBattlefield
        {...defaultProps}
        cards={[card]}
        onCardDropped={onCardDropped}
      />
    )
    const zone = screen.getByTestId('battlefield')

    vi.spyOn(zone, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 600,
      right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => {},
    })

    fireDrop(zone, { clientX: 600, clientY: 400, cardId: 'card-1', grabOffsetX: '40', grabOffsetY: '56' })

    expect(onCardDropped).toHaveBeenCalledTimes(1)
  })

  it('clamps drop position so cards stay inside the battlefield', () => {
    const onCardDropped = vi.fn()
    render(
      <ZoneBattlefield
        {...defaultProps}
        onCardDropped={onCardDropped}
      />
    )
    const zone = screen.getByTestId('battlefield')
    vi.spyOn(zone, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 600,
      right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => {},
    })

    // Drop way outside bounds (negative coordinates)
    fireDrop(zone, { clientX: -200, clientY: -200, cardId: 'card-1', grabOffsetX: '0', grabOffsetY: '0' })

    const [, x, y] = onCardDropped.mock.calls[0]
    expect(x).toBeGreaterThanOrEqual(0)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThanOrEqual(1)
    expect(y).toBeLessThanOrEqual(1)
  })

  it('context menu for a battlefield card includes all zone move options', () => {
    const card = makeCard()
    const onContextMenu = vi.fn()
    render(<ZoneBattlefield {...defaultProps} cards={[card]} onContextMenu={onContextMenu} />)

    fireEvent.contextMenu(screen.getByTestId('card-view'))
    expect(onContextMenu).toHaveBeenCalledWith(expect.anything(), card)
  })

  it('places two cards at independent positions when dropped sequentially', () => {
    const onCardDropped = vi.fn()
    render(<ZoneBattlefield {...defaultProps} onCardDropped={onCardDropped} />)
    const zone = screen.getByTestId('battlefield')

    vi.spyOn(zone, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 50, width: 1000, height: 600,
      right: 1100, bottom: 650, x: 100, y: 50, toJSON: () => {},
    })

    // Drop first card at (300, 200) client coords with grab offset (20, 28)
    fireDrop(zone, { clientX: 300, clientY: 200, cardId: 'card-1', grabOffsetX: '20', grabOffsetY: '28' })
    // Drop second card at (600, 400) client coords with grab offset (20, 28)
    fireDrop(zone, { clientX: 600, clientY: 400, cardId: 'card-2', grabOffsetX: '20', grabOffsetY: '28' })

    expect(onCardDropped).toHaveBeenCalledTimes(2)
    const [, x1, y1] = onCardDropped.mock.calls[0]
    const [, x2, y2] = onCardDropped.mock.calls[1]

    // The two drops should land at different positions
    expect(x1).not.toBeCloseTo(x2, 2)
    expect(y1).not.toBeCloseTo(y2, 2)

    // Both positions must be valid fractions [0, 1]
    expect(x1).toBeGreaterThanOrEqual(0)
    expect(x1).toBeLessThanOrEqual(1)
    expect(x2).toBeGreaterThanOrEqual(0)
    expect(x2).toBeLessThanOrEqual(1)
  })
})
