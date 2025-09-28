/**
 * Lot Service Tests - Phase 2
 * Tests pour les services de gestion des lots avec relations Building
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LotService } from '../../domain/lot.service'
import { LotRepository } from '../../repositories/lot.repository'
import { BuildingService } from '../../domain/building.service'
import { LotTestDataFactory, BuildingTestDataFactory } from '../helpers/test-data'
import {
  ValidationException,
  ConflictException,
  NotFoundException
} from '../../core/error-handler'

// Mock the repositories
vi.mock('../../repositories/lot.repository')
vi.mock('../../domain/building.service')

describe('LotService', () => {
  let service: LotService
  let mockRepository: any
  let mockBuildingService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockRepository = {
      findAll: vi.fn(),
      findAllWithRelations: vi.fn(),
      findById: vi.fn(),
      findByIdWithRelations: vi.fn(),
      findByIdWithContacts: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
      referenceExists: vi.fn(),
      findByBuilding: vi.fn(),
      findByType: vi.fn(),
      findAvailable: vi.fn(),
      findOccupied: vi.fn(),
      findByTenant: vi.fn(),
      getOccupancyStats: vi.fn(),
      getRevenueStats: vi.fn()
    }

    mockBuildingService = {
      getById: vi.fn()
    }

    service = new LotService(
      mockRepository as LotRepository,
      mockBuildingService as BuildingService
    )
  })

  describe('CRUD Operations', () => {
    describe('CREATE', () => {
      it('should create lot with valid data', async () => {
        const building = BuildingTestDataFactory.create()
        const newLot = LotTestDataFactory.createForBuilding(building)
        const createdLot = { ...newLot, id: 'lot-123' }

        mockBuildingService.getById.mockResolvedValueOnce({
          success: true,
          data: building
        })
        mockRepository.referenceExists.mockResolvedValueOnce({
          success: true,
          data: false
        })
        mockRepository.create.mockResolvedValueOnce({
          success: true,
          data: createdLot
        })

        const result = await service.create(newLot)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(createdLot)
        expect(mockBuildingService.getById).toHaveBeenCalledWith(newLot.building_id)
        expect(mockRepository.referenceExists).toHaveBeenCalledWith(
          newLot.reference,
          newLot.building_id
        )
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining(newLot)
        )
      })

      it('should throw NotFoundException if building not found', async () => {
        const newLot = LotTestDataFactory.create()

        mockBuildingService.getById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Building not found' }
        })

        await expect(service.create(newLot)).rejects.toThrow(NotFoundException)
      })

      it('should validate reference uniqueness in building', async () => {
        const building = BuildingTestDataFactory.create()
        const newLot = LotTestDataFactory.createForBuilding(building)

        mockBuildingService.getById.mockResolvedValueOnce({
          success: true,
          data: building
        })
        mockRepository.referenceExists.mockResolvedValueOnce({
          success: true,
          data: true // Reference already exists
        })

        const result = await service.create(newLot)

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('CONFLICT')
      })
    })

    describe('READ', () => {
      it('should get lot by ID', async () => {
        const lot = LotTestDataFactory.create()
        lot.id = 'lot-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: lot
        })

        const result = await service.getById('lot-123')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(lot)
        expect(mockRepository.findById).toHaveBeenCalledWith('lot-123')
      })

      it('should return error if lot not found', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Lot not found' }
        })

        const result = await service.getById('nonexistent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })

      it('should get lot with relations', async () => {
        const lot = LotTestDataFactory.create()
        const building = BuildingTestDataFactory.create()

        mockRepository.findByIdWithRelations.mockResolvedValueOnce({
          success: true,
          data: { ...lot, building }
        })

        const result = await service.getByIdWithRelations('lot-123')

        expect(result.success).toBe(true)
        expect(result.data?.building).toEqual(building)
        expect(mockRepository.findByIdWithRelations).toHaveBeenCalledWith('lot-123')
      })

      it('should get all lots', async () => {
        const lots = LotTestDataFactory.createMultiple(3)

        mockRepository.findAllWithRelations.mockResolvedValueOnce({
          success: true,
          data: lots
        })

        const result = await service.getAll()

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(3)
        expect(mockRepository.findAllWithRelations).toHaveBeenCalled()
      })
    })

    describe('UPDATE', () => {
      it('should update lot properties', async () => {
        const existingLot = LotTestDataFactory.create()
        const updateData = { size: 85, description: 'Updated description' }
        const updatedLot = { ...existingLot, ...updateData }

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingLot
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: updatedLot
        })

        const result = await service.update('lot-123', updateData)

        expect(result.success).toBe(true)
        expect(result.data?.size).toBe(85)
        expect(result.data?.description).toBe('Updated description')
        expect(mockRepository.update).toHaveBeenCalledWith('lot-123', updateData)
      })

      it('should return error if lot not found for update', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Lot not found' }
        })

        const result = await service.update('nonexistent', { size: 85 })

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })
    })

    describe('DELETE', () => {
      it('should delete lot successfully', async () => {
        const lot = LotTestDataFactory.create()

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: lot
        })
        mockRepository.delete.mockResolvedValueOnce({
          success: true,
          data: true
        })

        const result = await service.delete('lot-123')

        expect(result.success).toBe(true)
        expect(mockRepository.delete).toHaveBeenCalledWith('lot-123')
      })

      it('should return error if lot not found for deletion', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Lot not found' }
        })

        const result = await service.delete('nonexistent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })
    })
  })

  describe('Business Logic', () => {
    describe('Lot Types', () => {
      it('should get lots by type', async () => {
        const apartments = LotTestDataFactory.createMultiple(2)
        apartments.forEach(lot => lot.type = 'apartment')

        mockRepository.findByType.mockResolvedValueOnce({
          success: true,
          data: apartments
        })

        const result = await service.getByType('apartment')

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockRepository.findByType).toHaveBeenCalledWith('apartment')
      })
    })

    describe('Building Relations', () => {
      it('should get lots by building', async () => {
        const building = BuildingTestDataFactory.create()
        const lots = LotTestDataFactory.createMultiple(3, building.id)

        mockRepository.findByBuilding.mockResolvedValueOnce({
          success: true,
          data: lots
        })

        const result = await service.getByBuilding(building.id)

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(3)
        expect(mockRepository.findByBuilding).toHaveBeenCalledWith(building.id)
      })

      it('should validate building exists when moving lot', async () => {
        const lot = LotTestDataFactory.create()
        const newBuilding = BuildingTestDataFactory.create()

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: lot
        })
        mockBuildingService.getById.mockResolvedValueOnce({
          success: true,
          data: newBuilding
        })
        mockRepository.referenceExists.mockResolvedValueOnce({
          success: true,
          data: false
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: { ...lot, building_id: newBuilding.id }
        })

        const result = await service.moveToBuilding('lot-123', newBuilding.id)

        expect(result.success).toBe(true)
        expect(mockBuildingService.getById).toHaveBeenCalledWith(newBuilding.id)
      })
    })

    describe('Occupancy Management', () => {
      it('should get available lots', async () => {
        const availableLots = LotTestDataFactory.createMultiple(2)

        mockRepository.findAvailable.mockResolvedValueOnce({
          success: true,
          data: availableLots
        })

        const result = await service.getAvailable()

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockRepository.findAvailable).toHaveBeenCalled()
      })

      it('should get occupied lots', async () => {
        const occupiedLots = LotTestDataFactory.createMultiple(3)

        mockRepository.findOccupied.mockResolvedValueOnce({
          success: true,
          data: occupiedLots
        })

        const result = await service.getOccupied()

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(3)
        expect(mockRepository.findOccupied).toHaveBeenCalled()
      })
    })

    describe('Statistics', () => {
      it('should get occupancy statistics', async () => {
        const stats = {
          total: 10,
          occupied: 7,
          available: 3,
          occupancy_rate: 0.7
        }

        mockRepository.getOccupancyStats.mockResolvedValueOnce({
          success: true,
          data: stats
        })

        const result = await service.getOccupancyStats()

        expect(result.success).toBe(true)
        expect(result.data?.occupancy_rate).toBe(0.7)
        expect(mockRepository.getOccupancyStats).toHaveBeenCalled()
      })

      it('should count lots', async () => {
        mockRepository.count.mockResolvedValueOnce({
          success: true,
          data: 25
        })

        const result = await service.count()

        expect(result.success).toBe(true)
        expect(result.data).toBe(25)
        expect(mockRepository.count).toHaveBeenCalled()
      })
    })
  })

  describe('Validation', () => {
    it('should validate lot data on creation', async () => {
      const invalidData = {
        building_id: '',
        reference: '',
        type: 'invalid' as any,
        size: -1
      }

      await expect(service.create(invalidData)).rejects.toThrow(ValidationException)
    })

    it('should validate reference format', async () => {
      const building = BuildingTestDataFactory.create()
      const lotWithInvalidRef = LotTestDataFactory.createForBuilding(building, {
        reference: '' // Empty reference should be invalid
      })

      await expect(service.create(lotWithInvalidRef)).rejects.toThrow(ValidationException)
    })
  })
})