import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'

describe('App', () => {
  it('renders the command center title', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText(/Quantum Command Center/i)).toBeInTheDocument()
  })

  it('renders the landing system alive panel', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText(/Unified EMS/i)).toBeInTheDocument()
    expect(screen.getByText(/System Alive/i)).toBeInTheDocument()
  })

  it('renders the HEMS mission board with action', () => {
    render(
      <MemoryRouter initialEntries={['/hems/missions']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText(/Live Mission Queue/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Simulate Mission/i })).toBeInTheDocument()
  })
})
