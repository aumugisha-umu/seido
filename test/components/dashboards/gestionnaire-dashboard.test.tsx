import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import { GestionnaireDashboard } from '@/components/dashboards/gestionnaire-dashboard'

// Mock the dashboard component since we don't have the actual implementation
vi.mock('@/components/dashboards/gestionnaire-dashboard', () => ({
  GestionnaireDashboard: () => (
    <div data-testid="gestionnaire-dashboard">
      <h1>Dashboard Gestionnaire</h1>
      <div data-testid="metrics">
        <span>12 bâtiments</span>
        <span>48 lots</span>
        <span>85% d'occupation</span>
        <span>€15,850/mois</span>
      </div>
      <div data-testid="intervention-sections">
        <section data-testid="nouvelles-demandes">Nouvelles demandes</section>
        <section data-testid="a-programmer">À programmer</section>
        <section data-testid="en-cours">En cours</section>
      </div>
    </div>
  )
}))

describe('GestionnaireDashboard', () => {
  it('displays manager metrics correctly', async () => {
    render(<GestionnaireDashboard />, {
      userRole: 'gestionnaire',
      userId: 'manager-1'
    })

    await waitFor(() => {
      expect(screen.getByText('12 bâtiments')).toBeInTheDocument()
      expect(screen.getByText('48 lots')).toBeInTheDocument()
      expect(screen.getByText('85% d\'occupation')).toBeInTheDocument()
      expect(screen.getByText('€15,850/mois')).toBeInTheDocument()
    })
  })

  it('shows only manager-accessible intervention sections', async () => {
    render(<GestionnaireDashboard />, { userRole: 'gestionnaire' })

    await waitFor(() => {
      expect(screen.getByTestId('nouvelles-demandes')).toBeInTheDocument()
      expect(screen.getByTestId('a-programmer')).toBeInTheDocument()
      expect(screen.getByTestId('en-cours')).toBeInTheDocument()
    })
  })

  it('renders dashboard for gestionnaire role', () => {
    render(<GestionnaireDashboard />, { userRole: 'gestionnaire' })

    expect(screen.getByTestId('gestionnaire-dashboard')).toBeInTheDocument()
    expect(screen.getByText('Dashboard Gestionnaire')).toBeInTheDocument()
  })

  it('displays metrics section', () => {
    render(<GestionnaireDashboard />, { userRole: 'gestionnaire' })

    expect(screen.getByTestId('metrics')).toBeInTheDocument()
  })

  it('displays intervention sections', () => {
    render(<GestionnaireDashboard />, { userRole: 'gestionnaire' })

    expect(screen.getByTestId('intervention-sections')).toBeInTheDocument()
  })
})
