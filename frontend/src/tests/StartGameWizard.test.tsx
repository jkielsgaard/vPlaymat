// Tests for the StartGameWizard — step navigation, deck import flow, and non-dismissable welcome screen.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StartGameWizard } from '../components/ui/StartGameWizard'

const mockImportDeck = vi.fn().mockResolvedValue({ loaded: 10, errors: [] })

vi.mock('../api/rest', () => ({
  importDeck: (...args: unknown[]) => mockImportDeck(...args),
}))

async function advanceToCommander(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId('decklist-input'), '1 Atraxa\n1 Forest')
  await user.click(screen.getByRole('button', { name: /next →/i }))
  // Step 2: choose Commander
  await user.click(screen.getByRole('radio', { name: /commander/i }))
  await user.click(screen.getByRole('button', { name: /next →/i }))
}

describe('StartGameWizard', () => {
  beforeEach(() => {
    mockImportDeck.mockClear()
  })

  it('renders step 1 on open', () => {
    render(<StartGameWizard onClose={vi.fn()} />)
    expect(screen.getByTestId('decklist-input')).toBeInTheDocument()
  })

  it('advances to step 2 with valid decklist', async () => {
    const user = userEvent.setup()
    render(<StartGameWizard onClose={vi.fn()} />)
    await user.type(screen.getByTestId('decklist-input'), '1 Forest')
    await user.click(screen.getByRole('button', { name: /next →/i }))
    expect(screen.getByRole('radio', { name: /normal/i })).toBeInTheDocument()
  })

  it('back button returns to step 1', async () => {
    const user = userEvent.setup()
    render(<StartGameWizard onClose={vi.fn()} />)
    await user.type(screen.getByTestId('decklist-input'), '1 Forest')
    await user.click(screen.getByRole('button', { name: /next →/i }))
    await user.click(screen.getByRole('button', { name: /← back/i }))
    expect(screen.getByTestId('decklist-input')).toBeInTheDocument()
  })

  it('normal mode submits on step 2', async () => {
    const user = userEvent.setup()
    render(<StartGameWizard onClose={vi.fn()} />)
    await user.type(screen.getByTestId('decklist-input'), '1 Forest')
    await user.click(screen.getByRole('button', { name: /next →/i }))
    await user.click(screen.getByRole('button', { name: /import & start/i }))
    await waitFor(() => expect(mockImportDeck).toHaveBeenCalled())
    expect(mockImportDeck).toHaveBeenCalledWith(
      expect.any(String),
      'normal',
      undefined,
      expect.any(Number),
      [],
    )
  })

  it('commander mode advances to step 3', async () => {
    const user = userEvent.setup()
    render(<StartGameWizard onClose={vi.fn()} />)
    await advanceToCommander(user)
    expect(screen.getByTestId('commander-select')).toBeInTheDocument()
  })

  it('step 3 shows name inputs for each opponent', async () => {
    const user = userEvent.setup()
    render(<StartGameWizard onClose={vi.fn()} />)
    await advanceToCommander(user)
    // Default 3 opponents → 3 name inputs
    expect(screen.getByTestId('opponent-name-0')).toBeInTheDocument()
    expect(screen.getByTestId('opponent-name-1')).toBeInTheDocument()
    expect(screen.getByTestId('opponent-name-2')).toBeInTheDocument()
  })

  it('changing opponent count updates number of name inputs', async () => {
    const user = userEvent.setup()
    render(<StartGameWizard onClose={vi.fn()} />)
    await advanceToCommander(user)
    await user.click(screen.getByTestId('opponent-count-1'))
    expect(screen.getByTestId('opponent-name-0')).toBeInTheDocument()
    expect(screen.queryByTestId('opponent-name-1')).not.toBeInTheDocument()
  })

  it('submit sends opponent names to api', async () => {
    const user = userEvent.setup()
    render(<StartGameWizard onClose={vi.fn()} />)
    await advanceToCommander(user)

    // Clear and type custom name for opponent 0
    await user.clear(screen.getByTestId('opponent-name-0'))
    await user.type(screen.getByTestId('opponent-name-0'), 'Alice')

    await user.click(screen.getByRole('button', { name: /import & start/i }))
    await waitFor(() => expect(mockImportDeck).toHaveBeenCalled())

    const call = mockImportDeck.mock.calls[0]
    const opponentNames = call[4] as string[]
    expect(opponentNames[0]).toBe('Alice')
  })
})
