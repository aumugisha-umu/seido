/**
 * Building Service Tests - Phase 2
 * Comprehensive CRUD tests for BuildingService with User relations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { BuildingService } from '../../domain/building.service'
import { BuildingRepository } from '../../repositories/building.repository'
import { UserService } from '../../domain/user.service'
import { BuildingTestDataFactory, UserTestDataFactory, MockedObject } from '../helpers/test-data'
import {
  ValidationException,
  ConflictException,
  NotFoundException,
  PermissionException
} from '../../core/error-handler'

// Mock the repositories
vi.mock('../../repositories/building.repository')
vi.mock('../../domain/user.service')

describe('BuildingService', () => {
  let service: BuildingService
  let mockRepository: MockedObject<BuildingRepository>
  let mockUserService: MockedObject<UserService>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock repository
    mockRepository = {
      findAll: vi.fn(),
      findAllWithRelations: vi.fn(),
      findById: vi.fn(),
      findByIdWithRelations: vi.fn(),
      findByTeam: vi.fn(),
      findByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
      nameExists: vi.fn(),
      findWithLotStats: vi.fn(),
      updateTeam: vi.fn(),
      updateTeamBulk: vi.fn(),
      findByCity: vi.fn(),
      findNearby: vi.fn()
    }

    // Create mock user service
    mockUserService = {
      getById: vi.fn()
    }

    // Create service with mocked dependencies
    service = new BuildingService(
      mockRepository as BuildingRepository,
      mockUserService as UserService
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('CRUD Operations', () => {
    describe('CREATE', () => {
      it('should create building with valid data', async () => {
        const newBuilding = BuildingTestDataFactory.create()
        const createdBuilding = { ...newBuilding, id: 'building-123' }

        mockRepository.nameExists.mockResolvedValueOnce({
          success: true,
          data: false
        })
        mockRepository.create.mockResolvedValueOnce({
          success: true,
          data: createdBuilding
        })

        const result = await service.create(newBuilding)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(createdBuilding)
        expect(mockRepository.nameExists).toHaveBeenCalledWith(
          newBuilding.name,
          newBuilding.team_id
        )
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...newBuilding,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        )
      })

      it('should throw ConflictException if name already exists in team', async () => {
        const newBuilding = BuildingTestDataFactory.create()

        mockRepository.nameExists.mockResolvedValueOnce({
          success: true,
          data: true
        })

        await expect(service.create(newBuilding)).rejects.toThrow(ConflictException)
        expect(mockRepository.create).not.toHaveBeenCalled()
      })

      it('should set default values for optional fields', async () => {
        const minimalBuilding = {
          name: 'Test Building',
          address: '123 Test St',
          city: 'Test City',
          postal_code: '12345',
          team_id: 'team-123'
        }

        mockRepository.nameExists.mockResolvedValueOnce({
          success: true,
          data: false
        })
        mockRepository.create.mockResolvedValueOnce({
          success: true,
          data: { ...minimalBuilding, id: 'building-123' }
        })

        await service.create(minimalBuilding)

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...minimalBuilding,
            total_lots: 0,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        )
      })
    })

    describe('READ', () => {
      it('should get building by ID', async () => {
        const building = BuildingTestDataFactory.create()
        building.id = 'building-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: building
        })

        const result = await service.getById('building-123')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(building)
        expect(mockRepository.findById).toHaveBeenCalledWith('building-123')
      })

      it('should return error if building not found', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: null
        })

        const result = await service.getById('non-existent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })

      it('should get all buildings with relations and pagination', async () => {
        const buildings = [
          BuildingTestDataFactory.create(),
          BuildingTestDataFactory.create()
        ]

        mockRepository.findAllWithRelations.mockResolvedValueOnce({
          success: true,
          data: buildings,
          pagination: {
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        })

        const result = await service.getAll({ page: 1, limit: 10 })

        expect(result.success).toBe(true)
        expect(result.data).toEqual(buildings)
        expect(mockRepository.findAllWithRelations).toHaveBeenCalledWith({ page: 1, limit: 10 })
      })

      it('should get building with full relations', async () => {
        const building = BuildingTestDataFactory.create()
        building.id = 'building-123'
        building.lots = []
        building.manager = UserTestDataFactory.createManager()

        mockRepository.findByIdWithRelations.mockResolvedValueOnce({
          success: true,
          data: building
        })

        const result = await service.getByIdWithRelations('building-123')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(building)
        expect(mockRepository.findByIdWithRelations).toHaveBeenCalledWith('building-123')
      })

      it('should get buildings by team', async () => {
        const buildings = [
          BuildingTestDataFactory.create(),
          BuildingTestDataFactory.create()
        ]

        mockRepository.findByTeam.mockResolvedValueOnce({
          success: true,
          data: buildings
        })

        const result = await service.getBuildingsByTeam('team-123')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(buildings)
        expect(mockRepository.findByTeam).toHaveBeenCalledWith('team-123')
      })

      it('should search buildings with filters', async () => {
        const buildings = [BuildingTestDataFactory.create()]

        mockRepository.search.mockResolvedValueOnce({
          success: true,
          data: buildings
        })

        const result = await service.searchBuildings('residence', { city: 'Paris' })

        expect(result.success).toBe(true)
        expect(result.data).toEqual(buildings)
        expect(mockRepository.search).toHaveBeenCalledWith('residence', { city: 'Paris' })
      })

      it('should throw ValidationException for short search query', async () => {
        await expect(service.searchBuildings('a')).rejects.toThrow(ValidationException)
        expect(mockRepository.search).not.toHaveBeenCalled()
      })
    })

    describe('UPDATE', () => {
      it('should update building properties', async () => {
        const existingBuilding = BuildingTestDataFactory.create()
        existingBuilding.id = 'building-123'

        const updates = {
          name: 'Updated Building',
          total_lots: 50
        }

        const updatedBuilding = { ...existingBuilding, ...updates }

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingBuilding
        })
        mockRepository.nameExists.mockResolvedValueOnce({
          success: true,
          data: false
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: updatedBuilding
        })

        const result = await service.update('building-123', updates)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(updatedBuilding)
        expect(mockRepository.update).toHaveBeenCalledWith(
          'building-123',
          expect.objectContaining({
            ...updates,
            updated_at: expect.any(String)
          })
        )
      })

      it('should check name uniqueness when updating name', async () => {
        const existingBuilding = BuildingTestDataFactory.create()
        existingBuilding.id = 'building-123'
        existingBuilding.name = 'Old Name'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingBuilding
        })
        mockRepository.nameExists.mockResolvedValueOnce({
          success: true,
          data: false
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: { ...existingBuilding, name: 'New Name' }
        })

        await service.update('building-123', { name: 'New Name' })

        expect(mockRepository.nameExists).toHaveBeenCalledWith(
          'New Name',
          existingBuilding.team_id,
          'building-123'
        )
      })

      it('should throw ConflictException if new name already exists', async () => {
        const existingBuilding = BuildingTestDataFactory.create()
        existingBuilding.id = 'building-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingBuilding
        })
        mockRepository.nameExists.mockResolvedValueOnce({
          success: true,
          data: true
        })

        await expect(
          service.update('building-123', { name: 'Taken Name' })
        ).rejects.toThrow(ConflictException)
      })
    })

    describe('DELETE', () => {
      it('should delete building without lots', async () => {
        const building = BuildingTestDataFactory.create()
        building.id = 'building-123'
        building.lots = []

        mockRepository.findByIdWithRelations.mockResolvedValueOnce({
          success: true,
          data: building
        })
        mockRepository.delete.mockResolvedValueOnce({
          success: true,
          data: true
        })

        const result = await service.delete('building-123')

        expect(result.success).toBe(true)
        expect(mockRepository.delete).toHaveBeenCalledWith('building-123')
      })

      it('should prevent deleting building with lots', async () => {
        const building = BuildingTestDataFactory.create()
        building.id = 'building-123'
        building.lots = [{ id: 'lot-1' }, { id: 'lot-2' }] as any

        mockRepository.findByIdWithRelations.mockResolvedValueOnce({
          success: true,
          data: building
        })

        await expect(service.delete('building-123')).rejects.toThrow(ValidationException)
        expect(mockRepository.delete).not.toHaveBeenCalled()
      })

      it('should return error if building not found', async () => {
        mockRepository.findByIdWithRelations.mockResolvedValueOnce({
          success: true,
          data: null
        })

        const result = await service.delete('non-existent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
        expect(mockRepository.delete).not.toHaveBeenCalled()
      })
    })
  })

  describe('Business Logic with User Relations', () => {
    describe('Team Management', () => {
      it('should assign building to team', async () => {
        const building = BuildingTestDataFactory.create()
        building.id = 'building-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: building
        })
        mockRepository.updateTeam.mockResolvedValueOnce({
          success: true,
          data: { ...building, team_id: 'team-456' }
        })

        const result = await service.assignToTeam('building-123', 'team-456')

        expect(result.success).toBe(true)
        expect(result.data?.team_id).toBe('team-456')
      })

      it('should bulk assign buildings to team', async () => {
        const buildingIds = ['building-1', 'building-2']
        const building1 = BuildingTestDataFactory.create()
        const building2 = BuildingTestDataFactory.create()

        mockRepository.findById
          .mockResolvedValueOnce({ success: true, data: building1 })
          .mockResolvedValueOnce({ success: true, data: building2 })

        mockRepository.updateTeamBulk.mockResolvedValueOnce({
          success: true,
          data: [
            { ...building1, team_id: 'team-123' },
            { ...building2, team_id: 'team-123' }
          ]
        })

        const result = await service.assignBulkToTeam(buildingIds, 'team-123')

        expect(result.success).toBe(true)
        expect(mockRepository.updateTeamBulk).toHaveBeenCalledWith(buildingIds, 'team-123')
      })

      it('should validate all buildings exist before bulk assignment', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: null // Building doesn't exist
        })

        const result = await service.assignBulkToTeam(['non-existent'], 'team-123')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
        expect(mockRepository.updateTeamBulk).not.toHaveBeenCalled()
      })
    })

    describe('Manager Assignment', () => {
      it('should assign manager to building', async () => {
        const building = BuildingTestDataFactory.create()
        building.id = 'building-123'
        const manager = UserTestDataFactory.createManager()
        manager.id = 'manager-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: building
        })
        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: manager
        })

        const result = await service.assignManager('building-123', 'manager-123')

        expect(result.success).toBe(true)
        expect(result.data).toMatchObject({
          building_id: 'building-123',
          manager_id: 'manager-123',
          assigned_at: expect.any(String)
        })
      })

      it('should throw PermissionException if user is not a manager', async () => {
        const building = BuildingTestDataFactory.create()
        building.id = 'building-123'
        const tenant = UserTestDataFactory.createTenant()
        tenant.id = 'tenant-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: building
        })
        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: tenant
        })

        await expect(
          service.assignManager('building-123', 'tenant-123')
        ).rejects.toThrow(PermissionException)
      })

      it('should throw NotFoundException if manager not found', async () => {
        const building = BuildingTestDataFactory.create()
        building.id = 'building-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: building
        })
        mockUserService.getById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' }
        })

        await expect(
          service.assignManager('building-123', 'non-existent')
        ).rejects.toThrow(NotFoundException)
      })
    })

    describe('Location Services', () => {
      it('should get buildings by city', async () => {
        const buildings = [
          BuildingTestDataFactory.create(),
          BuildingTestDataFactory.create()
        ]

        mockRepository.findByCity.mockResolvedValueOnce({
          success: true,
          data: buildings
        })

        const result = await service.getBuildingsByCity('Paris')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(buildings)
        expect(mockRepository.findByCity).toHaveBeenCalledWith('Paris', undefined)
      })

      it('should get nearby buildings by postal code', async () => {
        const buildings = [
          BuildingTestDataFactory.create(),
          BuildingTestDataFactory.create()
        ]

        mockRepository.findNearby.mockResolvedValueOnce({
          success: true,
          data: buildings
        })

        const result = await service.getNearbyBuildings('75001', 2)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(buildings)
        expect(mockRepository.findNearby).toHaveBeenCalledWith('75001', 2)
      })

      it('should validate postal code format', async () => {
        await expect(service.getNearbyBuildings('invalid')).rejects.toThrow(ValidationException)
        await expect(service.getNearbyBuildings('750')).rejects.toThrow(ValidationException)
        expect(mockRepository.findNearby).not.toHaveBeenCalled()
      })

      it('should validate range for nearby search', async () => {
        await expect(service.getNearbyBuildings('75001', 0)).rejects.toThrow(ValidationException)
        await expect(service.getNearbyBuildings('75001', 15)).rejects.toThrow(ValidationException)
      })
    })

    describe('Statistics', () => {
      it('should calculate building statistics', async () => {
        const buildings = [
          {
            ...BuildingTestDataFactory.create(),
            lot_stats: { total: 10, occupied: 8, vacant: 2 }
          },
          {
            ...BuildingTestDataFactory.create(),
            lot_stats: { total: 5, occupied: 3, vacant: 2 }
          }
        ]

        mockRepository.findWithLotStats.mockResolvedValueOnce({
          success: true,
          data: buildings
        })

        const result = await service.getBuildingStats()

        expect(result.success).toBe(true)
        expect(result.data).toMatchObject({
          total_buildings: 2,
          total_lots: 15,
          occupied_lots: 11,
          vacant_lots: 4,
          occupancy_rate: (11 / 15) * 100
        })
      })

      it('should get buildings with lot statistics', async () => {
        const buildings = [
          {
            ...BuildingTestDataFactory.create(),
            lots: [
              { id: 'lot-1', is_occupied: true },
              { id: 'lot-2', is_occupied: false },
              { id: 'lot-3', is_occupied: true }
            ]
          }
        ]

        mockRepository.findWithLotStats.mockResolvedValueOnce({
          success: true,
          data: buildings
        })

        const result = await service.getBuildingsWithStats('team-123')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(buildings)
        expect(mockRepository.findWithLotStats).toHaveBeenCalledWith('team-123')
      })
    })
  })
})
