/**
 * Building Service Tests - Phase 2 (Simplified)
 * Tests compatibles avec notre interface Building actuelle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BuildingService } from '../../domain/building.service'
import { BuildingRepository } from '../../repositories/building.repository'
import { UserService } from '../../domain/user.service'
import { BuildingTestDataFactory, UserTestDataFactory, MockedObject } from '../helpers/test-data'
import {
  ValidationException
} from '../../core/error-handler'

// Mock the repositories
vi.mock('../../repositories/building.repository')
vi.mock('../../domain/user.service')

describe('BuildingService (Simplified)', () => {
  let service: BuildingService
  let mockRepository: MockedObject<BuildingRepository>
  let mockUserService: MockedObject<UserService>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      count: vi.fn()
    }

    mockUserService = {
      getById: vi.fn()
    }

    service = new BuildingService(
      mockRepository as BuildingRepository,
      mockUserService as UserService
    )
  })

  describe('CRUD Operations', () => {
    describe('CREATE', () => {
      it('should create building with valid data', async () => {
        const newBuilding = BuildingTestDataFactory.create()
        const createdBuilding = { ...newBuilding, id: 'building-123' }

        mockRepository.create.mockResolvedValueOnce({
          success: true,
          data: createdBuilding
        })

        const result = await service.create(newBuilding)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(createdBuilding)
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining(newBuilding)
        )
      })

      it('should validate required fields', async () => {
        const invalidBuilding = { name: '', address: '', manager_id: '' }

        await expect(service.create(invalidBuilding)).rejects.toThrow(ValidationException)
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
          success: false,
          error: { code: 'NOT_FOUND', message: 'Building not found' }
        })

        const result = await service.getById('nonexistent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })

      it('should get all buildings', async () => {
        const buildings = BuildingTestDataFactory.createMultiple(3)

        mockRepository.findAll.mockResolvedValueOnce({
          success: true,
          data: buildings
        })

        const result = await service.getAll()

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(3)
        expect(mockRepository.findAll).toHaveBeenCalled()
      })
    })

    describe('UPDATE', () => {
      it('should update building properties', async () => {
        const existingBuilding = BuildingTestDataFactory.create()
        const updateData = { name: 'Updated Building Name' }
        const updatedBuilding = { ...existingBuilding, ...updateData }

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingBuilding
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: updatedBuilding
        })

        const result = await service.update('building-123', updateData)

        expect(result.success).toBe(true)
        expect(result.data?.name).toBe('Updated Building Name')
        expect(mockRepository.update).toHaveBeenCalledWith('building-123', updateData)
      })

      it('should throw NotFoundException if building not found', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Building not found' }
        })

        const result = await service.update('nonexistent', { name: 'New Name' })

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })
    })

    describe('DELETE', () => {
      it('should delete building successfully', async () => {
        const building = BuildingTestDataFactory.create()

        mockRepository.findById.mockResolvedValueOnce({
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

      it('should throw NotFoundException if building not found', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Building not found' }
        })

        const result = await service.delete('nonexistent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })
    })
  })

  describe('Business Logic', () => {
    describe('Manager Assignment', () => {
      it('should assign manager to building', async () => {
        const building = BuildingTestDataFactory.create()
        const manager = UserTestDataFactory.createManager()

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: building
        })
        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: manager
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: { ...building, manager_id: manager.id }
        })

        const result = await service.update(building.id, { manager_id: manager.id })

        expect(result.success).toBe(true)
        expect(result.data?.manager_id).toBe(manager.id)
      })
    })

    describe('Validation', () => {
      it('should validate building data', async () => {
        const invalidData = {
          name: '', // Empty name should be invalid
          address: 'Valid Address',
          manager_id: 'valid-manager-id'
        }

        await expect(service.create(invalidData)).rejects.toThrow(ValidationException)
      })

      it('should validate manager exists', async () => {
        const buildingData = BuildingTestDataFactory.create()
        buildingData.manager_id = 'nonexistent-manager'

        mockUserService.getById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' }
        })

        const result = await service.create(buildingData)

        expect(result.success).toBe(false)
      })
    })
  })

  describe('Statistics', () => {
    it('should count buildings', async () => {
      mockRepository.count.mockResolvedValueOnce({
        success: true,
        data: 15
      })

      const result = await service.count()

      expect(result.success).toBe(true)
      expect(result.data).toBe(15)
      expect(mockRepository.count).toHaveBeenCalled()
    })
  })
})
