/**
 * Composite Service Tests - Phase 4.1
 * Comprehensive testing for multi-service orchestration operations
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { CompositeService } from '../../domain/composite.service'
import type { UserService } from '../../domain/user.service'
import type { BuildingService } from '../../domain/building.service'
import type { LotService } from '../../domain/lot.service'
import type { TeamService } from '../../domain/team.service'
import type { ContactService } from '../../domain/contact.service'
import type { User, Team, Building, Lot, Contact } from '../../core/service-types'
import { ValidationException, BusinessLogicException } from '../../core/error-handler'

// Mock services
const mockUserService = {
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getByEmail: vi.fn(),
  updateRole: vi.fn(),
  updateTeam: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn(),
  getByRole: vi.fn()
} as Partial<UserService> as UserService

const mockBuildingService = {
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getByTeam: vi.fn(),
  addManager: vi.fn(),
  removeManager: vi.fn(),
  updateAddress: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn()
} as Partial<BuildingService> as BuildingService

const mockLotService = {
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getByBuilding: vi.fn(),
  assignTenant: vi.fn(),
  removeTenant: vi.fn(),
  updateRent: vi.fn()
} as Partial<LotService> as LotService

const mockTeamService = {
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  getMembers: vi.fn(),
  updateMemberRole: vi.fn()
} as Partial<TeamService> as TeamService

const mockContactService = {
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getByTeam: vi.fn(),
  invite: vi.fn(),
  updateInvitationStatus: vi.fn(),
  resendInvitation: vi.fn()
} as Partial<ContactService> as ContactService

describe('CompositeService', () => {
  let compositeService: CompositeService

  // Test data
  const mockUser: User = {
    id: 'user-1',
    email: 'john@example.com',
    role: 'gestionnaire',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+33123456789',
    team_id: 'team-1',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockTeam: Team = {
    id: 'team-1',
    name: 'John Doe Team',
    description: 'Personal team for John Doe',
    created_by: 'user-1',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockBuilding: Building = {
    id: 'building-1',
    name: 'Test Building',
    address: '123 Test St',
    city: 'Paris',
    postal_code: '75001',
    country: 'France',
    team_id: 'team-1',
    created_by: 'user-1',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockLot: Lot = {
    id: 'lot-1',
    name: 'Apt 101',
    type: 'apartment',
    floor: 1,
    surface_area: 50,
    rent_amount: 1000,
    charges_amount: 100,
    deposit_amount: 1000,
    building_id: 'building-1',
    tenant_id: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockContact: Contact = {
    id: 'contact-1',
    email: 'contact@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    phone: '+33987654321',
    role: 'prestataire',
    team_id: 'team-1',
    created_by: 'user-1',
    invitation_status: 'pending',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    compositeService = new CompositeService(
      mockUserService,
      mockBuildingService,
      mockLotService,
      mockTeamService,
      mockContactService
    )
  })

  describe('createCompleteUser', () => {
    const completeUserData = {
      user: {
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+33123456789',
        role: 'gestionnaire' as const
      },
      team: {
        name: 'John Doe Team',
        description: 'Personal team for John Doe'
      },
      building: {
        name: 'Test Building',
        address: '123 Test St',
        city: 'Paris',
        postal_code: '75001',
        country: 'France'
      },
      lots: [
        {
          name: 'Apt 101',
          type: 'apartment' as const,
          floor: 1,
          surface_area: 50,
          rent_amount: 1000,
          charges_amount: 100,
          deposit_amount: 1000
        }
      ]
    }

    it('should successfully create complete user setup', async () => {
      // Setup mocks
      ;(mockUserService.create as Mock).mockResolvedValue({ success: true, data: mockUser })
      ;(mockTeamService.create as Mock).mockResolvedValue({ success: true, data: mockTeam })
      ;(mockBuildingService.create as Mock).mockResolvedValue({ success: true, data: mockBuilding })
      ;(mockLotService.create as Mock).mockResolvedValue({ success: true, data: mockLot })
      ;(mockUserService.update as Mock).mockResolvedValue({ success: true, data: { ...mockUser, team_id: 'team-1' } })

      const result = await compositeService.createCompleteUser(completeUserData)

      expect(result.success).toBe(true)
      expect(result.data.user).toEqual(expect.objectContaining({ email: 'john@example.com' }))
      expect(result.data.team).toEqual(expect.objectContaining({ name: 'John Doe Team' }))
      expect(result.data.building).toEqual(expect.objectContaining({ name: 'Test Building' }))
      expect(result.data.lots).toHaveLength(1)
      expect(result.operations).toHaveLength(5) // user, team, user update, building, lot

      // Verify all services called correctly
      expect(mockUserService.create).toHaveBeenCalledWith(completeUserData.user)
      expect(mockTeamService.create).toHaveBeenCalledWith({
        ...completeUserData.team,
        created_by: mockUser.id
      })
      expect(mockBuildingService.create).toHaveBeenCalledWith({
        ...completeUserData.building,
        team_id: mockTeam.id,
        created_by: mockUser.id
      })
      expect(mockLotService.create).toHaveBeenCalledWith({
        ...completeUserData.lots[0],
        building_id: mockBuilding.id
      })
    })

    it('should handle user creation failure', async () => {
      ;(mockUserService.create as Mock).mockRejectedValue(new ValidationException('Invalid email', 'user', 'email'))

      const result = await compositeService.createCompleteUser(completeUserData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('User creation failed')
      expect(result.operations).toHaveLength(1)
      expect(result.operations[0].status).toBe('failed')
    })

    it('should rollback on team creation failure', async () => {
      ;(mockUserService.create as Mock).mockResolvedValue({ success: true, data: mockUser })
      ;(mockTeamService.create as Mock).mockRejectedValue(new ValidationException('Team name taken', 'team', 'name'))
      ;(mockUserService.delete as Mock).mockResolvedValue({ success: true, data: true })

      const result = await compositeService.createCompleteUser(completeUserData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Team creation failed')
      expect(mockUserService.delete).toHaveBeenCalledWith(mockUser.id)
      expect(result.rollbackOperations).toHaveLength(1)
    })

    it('should handle building creation failure with rollback', async () => {
      ;(mockUserService.create as Mock).mockResolvedValue({ success: true, data: mockUser })
      ;(mockTeamService.create as Mock).mockResolvedValue({ success: true, data: mockTeam })
      ;(mockUserService.update as Mock).mockResolvedValue({ success: true, data: { ...mockUser, team_id: 'team-1' } })
      ;(mockBuildingService.create as Mock).mockRejectedValue(new ValidationException('Invalid address', 'building', 'address'))
      ;(mockTeamService.delete as Mock).mockResolvedValue({ success: true, data: true })
      ;(mockUserService.delete as Mock).mockResolvedValue({ success: true, data: true })

      const result = await compositeService.createCompleteUser(completeUserData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Building creation failed')
      expect(result.rollbackOperations).toHaveLength(2) // rollback team and user
    })
  })

  describe('createCompleteBuilding', () => {
    const buildingData = {
      building: {
        name: 'New Building',
        address: '456 New St',
        city: 'Lyon',
        postal_code: '69001',
        country: 'France',
        team_id: 'team-1',
        created_by: 'user-1'
      },
      lots: [
        {
          name: 'Apt 201',
          type: 'apartment' as const,
          floor: 2,
          surface_area: 60,
          rent_amount: 1200,
          charges_amount: 120,
          deposit_amount: 1200
        },
        {
          name: 'Apt 202',
          type: 'apartment' as const,
          floor: 2,
          surface_area: 45,
          rent_amount: 900,
          charges_amount: 90,
          deposit_amount: 900
        }
      ]
    }

    it('should successfully create building with lots', async () => {
      ;(mockBuildingService.create as Mock).mockResolvedValue({ success: true, data: mockBuilding })
      ;(mockLotService.create as Mock)
        .mockResolvedValueOnce({ success: true, data: { ...mockLot, id: 'lot-1', name: 'Apt 201' } })
        .mockResolvedValueOnce({ success: true, data: { ...mockLot, id: 'lot-2', name: 'Apt 202' } })

      const result = await compositeService.createCompleteBuilding(buildingData)

      expect(result.success).toBe(true)
      expect(result.data.building).toEqual(expect.objectContaining({ name: 'New Building' }))
      expect(result.data.lots).toHaveLength(2)
      expect(result.operations).toHaveLength(3) // building + 2 lots

      expect(mockBuildingService.create).toHaveBeenCalledWith(buildingData.building)
      expect(mockLotService.create).toHaveBeenCalledTimes(2)
    })

    it('should rollback lots on building creation failure', async () => {
      ;(mockBuildingService.create as Mock).mockRejectedValue(new ValidationException('Invalid data', 'building', 'address'))

      const result = await compositeService.createCompleteBuilding(buildingData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Building creation failed')
      expect(mockLotService.create).not.toHaveBeenCalled()
    })

    it('should handle partial lot creation failure', async () => {
      ;(mockBuildingService.create as Mock).mockResolvedValue({ success: true, data: mockBuilding })
      ;(mockLotService.create as Mock)
        .mockResolvedValueOnce({ success: true, data: { ...mockLot, id: 'lot-1', name: 'Apt 201' } })
        .mockRejectedValueOnce(new ValidationException('Invalid lot data', 'lot', 'surface_area'))
      ;(mockBuildingService.delete as Mock).mockResolvedValue({ success: true, data: true })
      ;(mockLotService.delete as Mock).mockResolvedValue({ success: true, data: true })

      const result = await compositeService.createCompleteBuilding(buildingData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Lot creation failed')
      expect(result.rollbackOperations).toHaveLength(2) // rollback building and created lot
    })
  })

  describe('inviteTeamContacts', () => {
    const invitationData = {
      teamId: 'team-1',
      contacts: [
        {
          email: 'contact1@example.com',
          first_name: 'Contact',
          last_name: 'One',
          role: 'prestataire' as const
        },
        {
          email: 'contact2@example.com',
          first_name: 'Contact',
          last_name: 'Two',
          role: 'locataire' as const
        }
      ],
      invitedBy: 'user-1'
    }

    it('should successfully invite multiple contacts', async () => {
      ;(mockContactService.create as Mock)
        .mockResolvedValueOnce({ success: true, data: { ...mockContact, id: 'contact-1', email: 'contact1@example.com' } })
        .mockResolvedValueOnce({ success: true, data: { ...mockContact, id: 'contact-2', email: 'contact2@example.com' } })
      ;(mockContactService.invite as Mock)
        .mockResolvedValueOnce({ success: true, data: true })
        .mockResolvedValueOnce({ success: true, data: true })

      const result = await compositeService.inviteTeamContacts(invitationData)

      expect(result.success).toBe(true)
      expect(result.data.invitations).toHaveLength(2)
      expect(result.operations).toHaveLength(4) // 2 creates + 2 invites

      expect(mockContactService.create).toHaveBeenCalledTimes(2)
      expect(mockContactService.invite).toHaveBeenCalledTimes(2)
    })

    it('should handle contact creation failure', async () => {
      ;(mockContactService.create as Mock)
        .mockResolvedValueOnce({ success: true, data: { ...mockContact, id: 'contact-1' } })
        .mockRejectedValueOnce(new ValidationException('Duplicate email', 'contact', 'email'))

      const result = await compositeService.inviteTeamContacts(invitationData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Contact creation failed')
      expect(result.partialSuccess).toBe(true)
      expect(result.data.invitations).toHaveLength(1) // Only successful ones
    })

    it('should handle invitation sending failure', async () => {
      ;(mockContactService.create as Mock)
        .mockResolvedValueOnce({ success: true, data: { ...mockContact, id: 'contact-1' } })
        .mockResolvedValueOnce({ success: true, data: { ...mockContact, id: 'contact-2' } })
      ;(mockContactService.invite as Mock)
        .mockResolvedValueOnce({ success: true, data: true })
        .mockRejectedValueOnce(new BusinessLogicException('Email service unavailable', 'invitation', 'email'))

      const result = await compositeService.inviteTeamContacts(invitationData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invitation sending failed')
      expect(result.partialSuccess).toBe(true)
    })
  })

  describe('transferLotTenant', () => {
    const transferData = {
      lotId: 'lot-1',
      fromTenantId: 'tenant-1',
      toTenantId: 'tenant-2',
      transferDate: '2024-06-01',
      reason: 'Tenant requested transfer',
      transferredBy: 'user-1'
    }

    it('should successfully transfer lot tenant', async () => {
      const mockLotWithTenant = { ...mockLot, tenant_id: 'tenant-1' }
      const mockUpdatedLot = { ...mockLot, tenant_id: 'tenant-2' }

      ;(mockLotService.getById as Mock).mockResolvedValue({ success: true, data: mockLotWithTenant })
      ;(mockUserService.getById as Mock)
        .mockResolvedValueOnce({ success: true, data: { ...mockUser, id: 'tenant-1' } })
        .mockResolvedValueOnce({ success: true, data: { ...mockUser, id: 'tenant-2' } })
      ;(mockLotService.assignTenant as Mock).mockResolvedValue({ success: true, data: mockUpdatedLot })

      const result = await compositeService.transferLotTenant(transferData)

      expect(result.success).toBe(true)
      expect(result.data.lot.tenant_id).toBe('tenant-2')
      expect(result.operations).toHaveLength(1)

      expect(mockLotService.assignTenant).toHaveBeenCalledWith('lot-1', 'tenant-2')
    })

    it('should validate lot exists', async () => {
      ;(mockLotService.getById as Mock).mockResolvedValue({ success: false, error: 'Not found' })

      const result = await compositeService.transferLotTenant(transferData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Lot not found')
    })

    it('should validate current tenant', async () => {
      const mockLotWithDifferentTenant = { ...mockLot, tenant_id: 'different-tenant' }
      ;(mockLotService.getById as Mock).mockResolvedValue({ success: true, data: mockLotWithDifferentTenant })

      const result = await compositeService.transferLotTenant(transferData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Current tenant mismatch')
    })

    it('should validate new tenant exists', async () => {
      const mockLotWithTenant = { ...mockLot, tenant_id: 'tenant-1' }
      ;(mockLotService.getById as Mock).mockResolvedValue({ success: true, data: mockLotWithTenant })
      ;(mockUserService.getById as Mock)
        .mockResolvedValueOnce({ success: true, data: { ...mockUser, id: 'tenant-1' } })
        .mockResolvedValueOnce({ success: false, error: 'Not found' })

      const result = await compositeService.transferLotTenant(transferData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('New tenant not found')
    })
  })

  describe('bulkUserOperations', () => {
    const bulkData = {
      operations: [
        {
          type: 'create' as const,
          data: {
            email: 'new1@example.com',
            first_name: 'New',
            last_name: 'User1',
            role: 'locataire' as const
          }
        },
        {
          type: 'update' as const,
          id: 'user-1',
          data: { phone: '+33999888777' }
        },
        {
          type: 'delete' as const,
          id: 'user-2'
        }
      ],
      performedBy: 'admin-1'
    }

    it('should successfully perform bulk operations', async () => {
      ;(mockUserService.create as Mock).mockResolvedValue({ success: true, data: { ...mockUser, email: 'new1@example.com' } })
      ;(mockUserService.update as Mock).mockResolvedValue({ success: true, data: { ...mockUser, phone: '+33999888777' } })
      ;(mockUserService.delete as Mock).mockResolvedValue({ success: true, data: true })

      const result = await compositeService.bulkUserOperations(bulkData)

      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(3)
      expect(result.operations).toHaveLength(3)

      expect(mockUserService.create).toHaveBeenCalledTimes(1)
      expect(mockUserService.update).toHaveBeenCalledTimes(1)
      expect(mockUserService.delete).toHaveBeenCalledTimes(1)
    })

    it('should handle mixed success/failure operations', async () => {
      ;(mockUserService.create as Mock).mockResolvedValue({ success: true, data: { ...mockUser, email: 'new1@example.com' } })
      ;(mockUserService.update as Mock).mockRejectedValue(new ValidationException('Invalid phone', 'user', 'phone'))
      ;(mockUserService.delete as Mock).mockResolvedValue({ success: true, data: true })

      const result = await compositeService.bulkUserOperations(bulkData)

      expect(result.success).toBe(false)
      expect(result.partialSuccess).toBe(true)
      expect(result.data.results).toHaveLength(3)
      expect(result.data.results[0].success).toBe(true)
      expect(result.data.results[1].success).toBe(false)
      expect(result.data.results[2].success).toBe(true)
    })

    it('should validate operation types', async () => {
      const invalidBulkData = {
        operations: [
          {
            type: 'invalid' as any,
            data: {}
          }
        ],
        performedBy: 'admin-1'
      }

      const result = await compositeService.bulkUserOperations(invalidBulkData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid operation type')
    })
  })

  describe('getCompositeStats', () => {
    const statsRequest = {
      teamId: 'team-1',
      period: '30d' as const,
      includeDetails: true,
      requestedBy: 'user-1'
    }

    it('should successfully aggregate stats from multiple services', async () => {
      const mockTeamStats = { memberCount: 5, buildingsCount: 2 }
      const mockBuildingStats = [{ id: 'building-1', occupancyRate: 85 }]
      const mockUserStats = [{ id: 'user-1', activityScore: 92 }]

      ;(mockTeamService.getById as Mock).mockResolvedValue({ success: true, data: mockTeam })
      ;(mockBuildingService.getByTeam as Mock).mockResolvedValue({ success: true, data: mockBuildingStats })
      ;(mockUserService.getAll as Mock).mockResolvedValue({ success: true, data: mockUserStats })

      const result = await compositeService.getCompositeStats(statsRequest)

      expect(result.success).toBe(true)
      expect(result.data.team).toEqual(expect.objectContaining(mockTeamStats))
      expect(result.data.buildings).toEqual(mockBuildingStats)
      expect(result.data.users).toEqual(mockUserStats)
      expect(result.operations).toHaveLength(3)
    })

    it('should handle service failures gracefully', async () => {
      ;(mockTeamService.getById as Mock).mockResolvedValue({ success: true, data: mockTeam })
      ;(mockBuildingService.getByTeam as Mock).mockRejectedValue(new Error('Database error'))
      ;(mockUserService.getAll as Mock).mockResolvedValue({ success: true, data: [] })

      const result = await compositeService.getCompositeStats(statsRequest)

      expect(result.success).toBe(false)
      expect(result.partialSuccess).toBe(true)
      expect(result.data.team).toBeDefined()
      expect(result.data.users).toBeDefined()
      expect(result.error).toContain('Failed to fetch buildings stats')
    })
  })

  describe('rollback operations', () => {
    it('should track all operations for rollback', async () => {
      const completeUserData = {
        user: {
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'gestionnaire' as const
        }
      }

      ;(mockUserService.create as Mock).mockResolvedValue({ success: true, data: mockUser })
      ;(mockTeamService.create as Mock).mockRejectedValue(new Error('Team creation failed'))
      ;(mockUserService.delete as Mock).mockResolvedValue({ success: true, data: true })

      const result = await compositeService.createCompleteUser(completeUserData)

      expect(result.success).toBe(false)
      expect(result.rollbackOperations).toHaveLength(1)
      expect(result.rollbackOperations[0].type).toBe('delete')
      expect(result.rollbackOperations[0].service).toBe('user')
    })

    it('should handle rollback failures', async () => {
      const completeUserData = {
        user: {
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'gestionnaire' as const
        }
      }

      ;(mockUserService.create as Mock).mockResolvedValue({ success: true, data: mockUser })
      ;(mockTeamService.create as Mock).mockRejectedValue(new Error('Team creation failed'))
      ;(mockUserService.delete as Mock).mockRejectedValue(new Error('Rollback failed'))

      const result = await compositeService.createCompleteUser(completeUserData)

      expect(result.success).toBe(false)
      expect(result.rollbackErrors).toHaveLength(1)
      expect(result.rollbackErrors[0]).toContain('Failed to rollback')
    })
  })

  describe('error handling', () => {
    it('should handle validation errors properly', async () => {
      const invalidData = {
        user: {
          email: 'invalid-email',
          first_name: '',
          last_name: '',
          role: 'invalid_role' as any
        }
      }

      ;(mockUserService.create as Mock).mockRejectedValue(
        new ValidationException('Invalid user data', 'user', 'email')
      )

      const result = await compositeService.createCompleteUser(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('User creation failed')
      expect(result.validationErrors).toBeDefined()
    })

    it('should handle business logic errors', async () => {
      const userData = {
        user: {
          email: 'existing@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'gestionnaire' as const
        }
      }

      ;(mockUserService.create as Mock).mockRejectedValue(
        new BusinessLogicException('User already exists', 'user', 'email')
      )

      const result = await compositeService.createCompleteUser(userData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('User creation failed')
    })
  })
})
