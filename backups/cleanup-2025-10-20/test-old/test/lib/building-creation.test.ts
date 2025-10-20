/**
 * Test Unitaire: Création de Building avec Lots et Contacts
 * Valide le workflow complet de création d'immeuble via CompositeService.createCompleteProperty
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { CompositeService } from '@/lib/services/domain/composite.service'
import { BuildingService } from '@/lib/services/domain/building.service'
import { LotService } from '@/lib/services/domain/lot.service'

// Mock des services pour éviter les appels réels à la base de données
vi.mock('@/lib/services/core/supabase-client', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    from: vi.fn(),
    auth: {
      getSession: vi.fn()
    }
  })),
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(),
    auth: {
      getSession: vi.fn()
    }
  }))
}))

describe('Building Creation - Complete Workflow', () => {
  let compositeService: CompositeService
  let mockBuildingService: any
  let mockLotService: any
  let mockSupabase: any

  beforeAll(() => {
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }))
      }))
    }

    // Setup mock services
    mockBuildingService = {
      create: vi.fn(),
      delete: vi.fn(),
      repository: {
        supabase: mockSupabase
      }
    }

    mockLotService = {
      create: vi.fn(),
      delete: vi.fn()
    }

    // Create composite service with mocked dependencies
    compositeService = new CompositeService(
      mockSupabase,
      mockBuildingService as unknown as BuildingService,
      mockLotService as unknown as LotService
    )
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  describe('Success Scenarios', () => {
    it('should create building with lots successfully', async () => {
      // Mock successful building creation
      const mockBuilding = {
        id: 'building-123',
        name: 'Test Building',
        address: 'Rue de Test 123',
        city: 'Brussels',
        postal_code: '1000',
        country: 'BE',
        team_id: 'team-456'
      }

      mockBuildingService.create.mockResolvedValue({
        success: true,
        data: mockBuilding
      })

      // Mock successful lot creation
      const mockLot = {
        id: 'lot-789',
        reference: 'Appartement 1',
        floor: 1,
        apartment_number: '1A',
        category: 'apartment',
        building_id: 'building-123',
        team_id: 'team-456'
      }

      mockLotService.create.mockResolvedValue({
        success: true,
        data: mockLot
      })

      // Mock successful lot_contacts insert
      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { lot_id: 'lot-789', user_id: 'user-123' },
              error: null
            }))
          }))
        }))
      })

      // Execute
      const result = await compositeService.createCompleteProperty({
        building: {
          name: 'Test Building',
          address: 'Rue de Test 123',
          city: 'Brussels',
          postal_code: '1000',
          country: 'BE',
          team_id: 'team-456'
        },
        lots: [{
          reference: 'Appartement 1',
          floor: 1,
          apartment_number: '1A',
          category: 'apartment'
        }],
        contacts: [],
        lotContactAssignments: [{
          lotId: 'temp-lot-1',
          lotIndex: 0,
          assignments: [{
            contactId: 'user-123',
            contactType: 'locataire',
            isPrimary: true
          }]
        }]
      })

      // Assertions
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.building).toBeDefined()
      expect(result.data.building.name).toBe('Test Building')
      expect(result.data.lots).toHaveLength(1)
      expect(result.data.lots[0].reference).toBe('Appartement 1')
      expect(result.operations).toHaveLength(3) // building + lot + contact assignment
    })

    it('should return proper data structure with nested data object', async () => {
      const mockBuilding = {
        id: 'building-456',
        name: 'Building 2',
        address: 'Avenue Test 456',
        city: 'Antwerp',
        postal_code: '2000',
        country: 'BE',
        team_id: 'team-789'
      }

      mockBuildingService.create.mockResolvedValue({
        success: true,
        data: mockBuilding
      })

      mockLotService.create.mockResolvedValue({
        success: true,
        data: {
          id: 'lot-456',
          reference: 'Studio 1',
          category: 'apartment',
          building_id: 'building-456',
          team_id: 'team-789'
        }
      })

      const result = await compositeService.createCompleteProperty({
        building: {
          name: 'Building 2',
          address: 'Avenue Test 456',
          city: 'Antwerp',
          postal_code: '2000',
          country: 'BE',
          team_id: 'team-789'
        },
        lots: [{
          reference: 'Studio 1',
          category: 'apartment'
        }],
        contacts: [],
        lotContactAssignments: []
      })

      // Critical: Verify data structure is correct (not result.building but result.data.building)
      expect(result.data.building).toBeDefined()
      expect(result.data.building.name).toBe('Building 2')
      expect(result.data.lots).toBeDefined()
      expect(result.data.lots).toHaveLength(1)
    })
  })

  describe('Failure Scenarios', () => {
    it('should return error structure when building creation fails', async () => {
      mockBuildingService.create.mockResolvedValue({
        success: false,
        error: 'Building creation failed: database error'
      })

      const result = await compositeService.createCompleteProperty({
        building: {
          name: '',
          address: '',
          city: '',
          country: 'BE',
          team_id: 'team-123'
        },
        lots: [],
        contacts: [],
        lotContactAssignments: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Building creation failed')
    })

    it('should return error when lot creation fails', async () => {
      const mockBuilding = {
        id: 'building-999',
        name: 'Test Building',
        address: 'Test Address',
        city: 'Test City',
        country: 'BE',
        team_id: 'team-999'
      }

      mockBuildingService.create.mockResolvedValue({
        success: true,
        data: mockBuilding
      })

      mockLotService.create.mockResolvedValue({
        success: false,
        error: 'Lot creation failed: invalid data'
      })

      const result = await compositeService.createCompleteProperty({
        building: {
          name: 'Test Building',
          address: 'Test Address',
          city: 'Test City',
          country: 'BE',
          team_id: 'team-999'
        },
        lots: [{
          reference: 'Invalid Lot',
          category: 'apartment'
        }],
        contacts: [],
        lotContactAssignments: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Lot creation failed')
    })

    it('should trigger rollback when contact assignment fails', async () => {
      const mockBuilding = {
        id: 'building-rollback',
        name: 'Rollback Test',
        address: 'Rollback Street',
        city: 'Brussels',
        country: 'BE',
        team_id: 'team-rollback'
      }

      mockBuildingService.create.mockResolvedValue({
        success: true,
        data: mockBuilding
      })

      mockLotService.create.mockResolvedValue({
        success: true,
        data: {
          id: 'lot-rollback',
          reference: 'Lot Rollback',
          category: 'apartment',
          building_id: 'building-rollback',
          team_id: 'team-rollback'
        }
      })

      // Mock failed contact assignment
      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Contact assignment failed: foreign key violation' }
            }))
          }))
        }))
      })

      const result = await compositeService.createCompleteProperty({
        building: {
          name: 'Rollback Test',
          address: 'Rollback Street',
          city: 'Brussels',
          country: 'BE',
          team_id: 'team-rollback'
        },
        lots: [{
          reference: 'Lot Rollback',
          category: 'apartment'
        }],
        contacts: [],
        lotContactAssignments: [{
          lotId: 'temp-lot',
          lotIndex: 0,
          assignments: [{
            contactId: 'invalid-user',
            contactType: 'locataire',
            isPrimary: true
          }]
        }]
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.rollbackOperations).toBeDefined()
    })
  })

  describe('Validation Scenarios', () => {
    it('should throw error for invalid lot index', async () => {
      const mockBuilding = {
        id: 'building-validation',
        name: 'Validation Test',
        address: 'Validation Street',
        city: 'Brussels',
        country: 'BE',
        team_id: 'team-validation'
      }

      mockBuildingService.create.mockResolvedValue({
        success: true,
        data: mockBuilding
      })

      mockLotService.create.mockResolvedValue({
        success: true,
        data: {
          id: 'lot-validation',
          reference: 'Lot 1',
          category: 'apartment',
          building_id: 'building-validation',
          team_id: 'team-validation'
        }
      })

      const result = await compositeService.createCompleteProperty({
        building: {
          name: 'Validation Test',
          address: 'Validation Street',
          city: 'Brussels',
          country: 'BE',
          team_id: 'team-validation'
        },
        lots: [{
          reference: 'Lot 1',
          category: 'apartment'
        }],
        contacts: [],
        lotContactAssignments: [{
          lotId: 'temp-lot',
          lotIndex: 99, // Invalid index (out of bounds)
          assignments: [{
            contactId: 'user-123',
            contactType: 'locataire',
            isPrimary: true
          }]
        }]
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid lot index')
    })
  })
})
