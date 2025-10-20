import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { UserRole } from '@/lib/auth'
import { ThemeProvider } from '@/components/theme-provider'

// Mock AuthContext since we don't have the actual one
const MockAuthProvider = ({ children, user }: {
  children: ReactNode,
  user?: unknown
}) => {
  return <>{children}</>
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  userRole?: UserRole
  userId?: string
  teamId?: string
}

const AllTheProviders = ({
  children,
  userRole = 'gestionnaire',
  userId = 'test-user-id',
  teamId = 'test-team-id'
}: unknown) => {
  const mockUser = {
    id: userId,
    email: `test@${userRole}.fr`,
    name: `Test ${userRole}`,
    first_name: 'Test',
    last_name: userRole.charAt(0).toUpperCase() + userRole.slice(1),
    role: userRole,
    team_id: teamId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <MockAuthProvider user={mockUser}>
        {children}
        <Toaster />
      </MockAuthProvider>
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => render(ui, {
  wrapper: (props) => AllTheProviders({...props, ...options}),
  ...options
})

// Helper functions for SEIDO testing
export const createMockUser = (role: UserRole = 'gestionnaire') => ({
  id: `test-${role}-id`,
  email: `test@${role}.fr`,
  name: `Test ${role}`,
  first_name: 'Test',
  last_name: role.charAt(0).toUpperCase() + role.slice(1),
  role,
  team_id: 'test-team-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const createMockIntervention = (status = 'nouvelle-demande', role: UserRole = 'gestionnaire') => ({
  id: 'test-intervention-id',
  reference: 'INT-2024-001',
  title: 'Test intervention',
  description: 'Test description',
  type: 'plomberie' as const,
  urgency: 'normale' as const,
  status,
  tenant_id: role === 'locataire' ? 'test-locataire-id' : 'tenant-id',
  manager_id: role === 'gestionnaire' ? 'test-gestionnaire-id' : 'manager-id',
  assigned_provider_id: role === 'prestataire' ? 'test-prestataire-id' : null,
  lot_id: 'test-lot-id',
  building_id: 'test-building-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const createMockBuilding = () => ({
  id: 'test-building-id',
  name: 'Test Building',
  address: '123 Test Street',
  city: 'Test City',
  postal_code: '12345',
  country: 'France',
  manager_id: 'test-manager-id',
  total_lots: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const createMockLot = () => ({
  id: 'test-lot-id',
  building_id: 'test-building-id',
  lot_number: 'A101',
  floor: 1,
  surface_area: 45.5,
  rooms: 2,
  rent_amount: 1200,
  charges_amount: 150,
  tenant_id: 'test-tenant-id',
  is_occupied: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

// Wait for async operations
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 100))

// Re-export everything from testing library
export * from '@testing-library/react'
export { customRender as render }
