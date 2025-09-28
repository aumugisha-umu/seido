/**
 * Lot Service Tests - Phase 2 (Simplified)
 * Tests compatibles avec notre interface Lot actuelle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LotService } from '../../domain/lot.service'
import { LotRepository } from '../../repositories/lot.repository'
import { BuildingService } from '../../domain/building.service'
import { LotTestDataFactory, BuildingTestDataFactory } from '../helpers/test-data'
import {
  ValidationException,
  NotFoundException
} from '../../core/error-handler'

// Mock the repositories
vi.mock('../../repositories/lot.repository')
vi.mock('../../domain/building.service')

describe('LotService (Simplified)', () => {
  let service: LotService
  let mockRepository: Partial<LotRepository>
  let mockBuildingService: Partial<BuildingService>

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
      referenceExists: vi.fn()
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
      })

      it('should validate building exists', async () => {
        const newLot = LotTestDataFactory.create()

        mockBuildingService.getById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Building not found' }
        })

        await expect(service.create(newLot)).rejects.toThrow(NotFoundException)
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

        mockRepository.findByIdWithRelations.mockResolvedValueOnce({
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
        mockRepository.findByIdWithRelations.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Lot not found' }
        })

        const result = await service.delete('nonexistent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })
    })
  })

  describe('Validation', () => {
    it('should validate required fields', async () => {
      const invalidLot = {
        building_id: '',
        reference: '',
        type: 'apartment',
        size: 75
      }

      await expect(service.create(invalidLot)).rejects.toThrow(ValidationException)
    })
  })
})
