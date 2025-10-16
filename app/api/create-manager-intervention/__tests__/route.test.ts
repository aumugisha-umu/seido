/**
 * Create Manager Intervention API Route Tests
 * Tests for the manager intervention creation endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { NotFoundException, ValidationException } from '@/lib/services/core/error-handler'

// Mock the services
vi.mock('@/lib/services', () => ({
  createServerActionInterventionService: vi.fn(),
  createServerActionUserService: vi.fn(),
  createServerActionBuildingService: vi.fn(),
  createServerActionLotService: vi.fn()
}))

// Mock authentication
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    }
  }))
}))

describe('Create Manager Intervention API', () => {
  let mockInterventionService: any
  let mockUserService: any
  let mockBuildingService: any
  let mockLotService: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock services
    mockInterventionService = {
      create: vi.fn()
    }

    mockUserService = {
      getById: vi.fn()
    }

    mockBuildingService = {
      getById: vi.fn()
    }

    mockLotService = {
      getById: vi.fn()
    }

    // Import mocks
    const services = require('@/lib/services')
    services.createServerActionInterventionService.mockResolvedValue(mockInterventionService)
    services.createServerActionUserService.mockResolvedValue(mockUserService)
    services.createServerActionBuildingService.mockResolvedValue(mockBuildingService)
    services.createServerActionLotService.mockResolvedValue(mockLotService)
  })

  describe('User Validation', () => {
    it('should throw NotFoundException with correct format when tenant not found', async () => {
      const mockRequest = new NextRequest('http://localhost/api/create-manager-intervention', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'invalid-tenant-id',
          lot_id: 'lot-123',
          title: 'Test Intervention',
          description: 'Test Description',
          urgency: 'medium'
        })
      })

      // Mock auth
      const supabase = require('@/lib/supabase-server')
      supabase.createServerClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'manager-id', role: 'gestionnaire' } }
          })
        }
      })

      // Mock tenant not found
      mockUserService.getById.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found' }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain("User with identifier 'invalid-tenant-id' not found")
      expect(data.error).not.toContain("User not found with identifier 'users' not found")
    })

    it('should validate tenant role correctly', async () => {
      const mockRequest = new NextRequest('http://localhost/api/create-manager-intervention', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'tenant-123',
          lot_id: 'lot-123',
          title: 'Test Intervention',
          description: 'Test Description',
          urgency: 'medium'
        })
      })

      // Mock auth
      const supabase = require('@/lib/supabase-server')
      supabase.createServerClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'manager-id', role: 'gestionnaire' } }
          })
        }
      })

      // Mock tenant with wrong role
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: { id: 'tenant-123', role: 'gestionnaire' } // Wrong role
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('must have role "locataire"')
    })
  })

  describe('Lot Validation', () => {
    it('should throw NotFoundException with correct format when lot not found', async () => {
      const mockRequest = new NextRequest('http://localhost/api/create-manager-intervention', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'tenant-123',
          lot_id: 'invalid-lot-id',
          title: 'Test Intervention',
          description: 'Test Description',
          urgency: 'medium'
        })
      })

      // Mock auth
      const supabase = require('@/lib/supabase-server')
      supabase.createServerClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'manager-id', role: 'gestionnaire' } }
          })
        }
      })

      // Mock tenant found
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: { id: 'tenant-123', role: 'locataire' }
      })

      // Mock lot not found
      mockLotService.getById.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found' }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain("Lot with identifier 'invalid-lot-id' not found")
      expect(data.error).not.toContain("Lot not found with identifier 'lots' not found")
    })
  })

  describe('Successful Creation', () => {
    it('should create intervention successfully with all validations passing', async () => {
      const mockRequest = new NextRequest('http://localhost/api/create-manager-intervention', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'tenant-123',
          lot_id: 'lot-123',
          title: 'Test Intervention',
          description: 'Test Description',
          urgency: 'medium',
          category: 'plomberie'
        })
      })

      // Mock auth
      const supabase = require('@/lib/supabase-server')
      supabase.createServerClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'manager-id', role: 'gestionnaire' } }
          })
        }
      })

      // Mock tenant found with correct role
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: { id: 'tenant-123', role: 'locataire' }
      })

      // Mock lot found
      mockLotService.getById.mockResolvedValue({
        success: true,
        data: {
          id: 'lot-123',
          building_id: 'building-123',
          team_id: 'team-123'
        }
      })

      // Mock building found
      mockBuildingService.getById.mockResolvedValue({
        success: true,
        data: {
          id: 'building-123',
          team_id: 'team-123'
        }
      })

      // Mock intervention creation
      mockInterventionService.create.mockResolvedValue({
        success: true,
        data: {
          id: 'new-intervention-id',
          title: 'Test Intervention',
          status: 'demande',
          tenant_id: 'tenant-123',
          lot_id: 'lot-123'
        }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new-intervention-id')
      expect(data.status).toBe('demande')
      expect(mockInterventionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Intervention',
          description: 'Test Description',
          urgency: 'medium',
          category: 'plomberie',
          tenant_id: 'tenant-123',
          lot_id: 'lot-123',
          building_id: 'building-123',
          team_id: 'team-123',
          status: 'demande'
        }),
        'manager-id'
      )
    })
  })

  describe('Error Message Format', () => {
    it('should never generate malformed error messages', async () => {
      // Test various error scenarios to ensure proper format
      const testCases = [
        { resource: 'User', id: 'abc-123' },
        { resource: 'Lot', id: 'lot-456' },
        { resource: 'Building', id: 'building-789' },
        { resource: 'Team', id: 'team-xyz' }
      ]

      for (const testCase of testCases) {
        const error = new NotFoundException(testCase.resource, testCase.id)

        // Verify correct format
        expect(error.message).toBe(`${testCase.resource} with identifier '${testCase.id}' not found`)

        // Verify no malformed messages
        expect(error.message).not.toContain('not found with identifier')
        expect(error.message).not.toContain(`${testCase.resource} not found with identifier '${testCase.resource}'`)
      }
    })
  })
})