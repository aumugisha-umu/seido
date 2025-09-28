import { vi, beforeEach, afterEach } from 'vitest'
import type { Database } from '../../database.types'

// Mock Supabase clients for services
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })),
    getSession: vi.fn(() => Promise.resolve({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null
    })),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    }))
  },
  from: vi.fn((table: string) => createMockQueryBuilder(table)),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'mock-url' } }))
    }))
  }
}

// Mock query builder with chainable methods
function createMockQueryBuilder(table: string) {
  const mockData = getMockDataForTable(table)

  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({
      data: Array.isArray(mockData) ? mockData[0] : mockData,
      error: null
    })),
    maybeSingle: vi.fn(() => Promise.resolve({
      data: Array.isArray(mockData) ? mockData[0] : mockData,
      error: null
    })),
    then: vi.fn((resolve) => resolve({
      data: mockData,
      error: null,
      count: Array.isArray(mockData) ? mockData.length : 1
    }))
  }

  return builder
}

// Mock data for different tables
function getMockDataForTable(table: string) {
  switch (table) {
    case 'users':
      return [
        {
          id: 'user-1',
          auth_user_id: 'auth-user-1',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'admin',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'user-2',
          auth_user_id: 'auth-user-2',
          email: 'manager@test.com',
          name: 'Manager User',
          role: 'gestionnaire',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

    case 'buildings':
      return [
        {
          id: 'building-1',
          name: 'Test Building 1',
          address: '123 Test Street',
          manager_id: 'user-2',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

    case 'lots':
      return [
        {
          id: 'lot-1',
          building_id: 'building-1',
          reference: 'A001',
          type: 'apartment',
          size: 75,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

    case 'interventions':
      return [
        {
          id: 'intervention-1',
          lot_id: 'lot-1',
          title: 'Test Intervention',
          description: 'Test description',
          status: 'pending',
          priority: 'medium',
          category: 'maintenance',
          requested_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

    case 'contacts':
      return [
        {
          id: 'contact-1',
          user_id: 'user-1',
          lot_id: 'lot-1',
          type: 'tenant',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

    default:
      return []
  }
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  // Reset mock implementations to default
  mockSupabaseClient.from = vi.fn((table: string) => createMockQueryBuilder(table))
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Utility functions for tests
export function createMockUser(overrides: Partial<Database['public']['Tables']['users']['Row']> = {}) {
  return {
    id: 'mock-user-id',
    auth_user_id: 'mock-auth-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin' as const,
    status: 'active' as const,
    phone: null,
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

export function createMockBuilding(overrides: Partial<Database['public']['Tables']['buildings']['Row']> = {}) {
  return {
    id: 'mock-building-id',
    name: 'Test Building',
    address: '123 Test Street',
    description: null,
    manager_id: 'mock-manager-id',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

export function createMockLot(overrides: Partial<Database['public']['Tables']['lots']['Row']> = {}) {
  return {
    id: 'mock-lot-id',
    building_id: 'mock-building-id',
    reference: 'A001',
    type: 'apartment' as const,
    size: 75,
    description: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

export function createMockIntervention(overrides: Partial<Database['public']['Tables']['interventions']['Row']> = {}) {
  return {
    id: 'mock-intervention-id',
    lot_id: 'mock-lot-id',
    title: 'Test Intervention',
    description: 'Test description',
    status: 'pending' as const,
    priority: 'medium' as const,
    category: 'maintenance',
    requested_by: 'mock-user-id',
    assigned_to: null,
    scheduled_date: null,
    completed_date: null,
    estimated_duration: null,
    actual_duration: null,
    notes: null,
    attachments: null,
    quote_amount: null,
    final_amount: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

export function createMockContact(overrides: Partial<Database['public']['Tables']['contacts']['Row']> = {}) {
  return {
    id: 'mock-contact-id',
    user_id: 'mock-user-id',
    lot_id: 'mock-lot-id',
    building_id: null,
    type: 'tenant' as const,
    status: 'active' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

// Mock error scenarios
export function mockSupabaseError(code: string, message: string) {
  return {
    code,
    message,
    details: null,
    hint: null
  }
}

export function mockRepositoryError(operation: string) {
  const error = mockSupabaseError('MOCK_ERROR', `Mock error for ${operation}`)
  mockSupabaseClient.from = vi.fn(() => ({
    ...createMockQueryBuilder(''),
    single: vi.fn(() => Promise.resolve({ data: null, error })),
    then: vi.fn((resolve) => resolve({ data: null, error, count: 0 }))
  }))
}

// Type helpers for tests
export type MockUser = ReturnType<typeof createMockUser>
export type MockBuilding = ReturnType<typeof createMockBuilding>
export type MockLot = ReturnType<typeof createMockLot>
export type MockIntervention = ReturnType<typeof createMockIntervention>
export type MockContact = ReturnType<typeof createMockContact>