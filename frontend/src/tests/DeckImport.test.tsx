import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeckImport } from '../components/ui/DeckImport'

// ------------------------------------------------------------------
// Mock the REST API
// ------------------------------------------------------------------

vi.mock('../api/rest', () => ({
  importDeck: vi.fn(),
}))

import * as api from '../api/rest'
const mockImportDeck = vi.mocked(api.importDeck)

const VALID_DECKLIST = '4 Lightning Bolt\n4 Mountain\n1 Black Lotus'

describe('DeckImport', () => {
  beforeEach(() => {
    mockImportDeck.mockClear()
  })

  it('renders the import trigger button', () => {
    render(<DeckImport />)
    expect(screen.getByRole('button', { name: /import deck/i })).toBeInTheDocument()
  })

  it('opens the modal when trigger is clicked', async () => {
    render(<DeckImport />)
    await userEvent.click(screen.getByRole('button', { name: /import deck/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/paste decklist/i)).toBeInTheDocument()
  })

  it('calls importDeck with textarea content on submit', async () => {
    mockImportDeck.mockResolvedValueOnce({ loaded: 9, errors: [] })
    render(<DeckImport />)
    await userEvent.click(screen.getByRole('button', { name: /import deck/i }))
    await userEvent.type(screen.getByPlaceholderText(/paste decklist/i), VALID_DECKLIST)
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }))
    expect(mockImportDeck).toHaveBeenCalledWith(VALID_DECKLIST)
  })

  it('does not call importDeck when input is empty', async () => {
    render(<DeckImport />)
    await userEvent.click(screen.getByRole('button', { name: /import deck/i }))
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }))
    expect(mockImportDeck).not.toHaveBeenCalled()
    expect(screen.getByText(/decklist cannot be empty/i)).toBeInTheDocument()
  })

  it('closes the modal after successful import', async () => {
    mockImportDeck.mockResolvedValueOnce({ loaded: 9, errors: [] })
    render(<DeckImport />)
    await userEvent.click(screen.getByRole('button', { name: /import deck/i }))
    await userEvent.type(screen.getByPlaceholderText(/paste decklist/i), VALID_DECKLIST)
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('shows an error message when the API returns an error', async () => {
    mockImportDeck.mockRejectedValueOnce(new Error('No valid cards found in decklist'))
    render(<DeckImport />)
    await userEvent.click(screen.getByRole('button', { name: /import deck/i }))
    await userEvent.type(screen.getByPlaceholderText(/paste decklist/i), 'garbage input')
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }))
    await waitFor(() => {
      expect(screen.getByText(/no valid cards found/i)).toBeInTheDocument()
    })
  })
})
