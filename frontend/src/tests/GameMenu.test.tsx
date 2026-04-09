import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameMenu } from '../components/menu/GameMenu'

vi.mock('../api/rest', () => ({
  importDeck: vi.fn().mockResolvedValue({ loaded: 10, errors: [] }),
}))

describe('GameMenu', () => {
  const onNewGame = vi.fn()

  beforeEach(() => {
    onNewGame.mockClear()
  })

  it('renders the Game menu button', () => {
    render(<GameMenu onNewGame={onNewGame} onToggleLog={vi.fn()} />)
    expect(screen.getByRole('button', { name: /game/i })).toBeInTheDocument()
  })

  it('opens the dropdown when clicked', async () => {
    render(<GameMenu onNewGame={onNewGame} onToggleLog={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /game/i }))
    expect(screen.getByText(/new game/i)).toBeInTheDocument()
    expect(screen.getByText(/import new deck/i)).toBeInTheDocument()
  })

  it('shows confirmation dialog before starting new game', async () => {
    render(<GameMenu onNewGame={onNewGame} onToggleLog={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /game/i }))
    await userEvent.click(screen.getByText(/new game/i))
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })

  it('calls onNewGame after confirmation', async () => {
    render(<GameMenu onNewGame={onNewGame} onToggleLog={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /game/i }))
    await userEvent.click(screen.getByText(/new game/i))
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onNewGame).toHaveBeenCalledTimes(1)
  })

  it('does not call onNewGame when confirmation is cancelled', async () => {
    render(<GameMenu onNewGame={onNewGame} onToggleLog={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /game/i }))
    await userEvent.click(screen.getByText(/new game/i))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onNewGame).not.toHaveBeenCalled()
  })
})
