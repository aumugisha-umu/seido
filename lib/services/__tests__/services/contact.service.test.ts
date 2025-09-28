/**
 * Contact Service Tests - Phase 3
 * Tests pour les services de gestion des contacts avec relations User/Lot/Building
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContactService } from '../../domain/contact.service'
import { ContactRepository } from '../../repositories/contact.repository'
import { UserService } from '../../domain/user.service'
import { LotService } from '../../domain/lot.service'
import { BuildingService } from '../../domain/building.service'
import { UserTestDataFactory, LotTestDataFactory, BuildingTestDataFactory } from '../helpers/test-data'
import {
  ValidationException,
  ConflictException,
  NotFoundException
} from '../../core/error-handler'

// Mock the repositories and services
vi.mock('../../repositories/contact.repository')
vi.mock('../../domain/user.service')
vi.mock('../../domain/lot.service')
vi.mock('../../domain/building.service')

describe('ContactService', () => {
  let service: ContactService
  let mockRepository: any
  let mockUserService: any
  let mockLotService: any
  let mockBuildingService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByIdWithRelations: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
      findByUser: vi.fn(),
      findByLot: vi.fn(),
      findByBuilding: vi.fn(),
      findByType: vi.fn(),
      userExists: vi.fn(),
      getContactStats: vi.fn(),
      addToLot: vi.fn(),
      addToBuilding: vi.fn(),
      removeFromLot: vi.fn(),
      removeFromBuilding: vi.fn()
    }

    mockUserService = {
      getById: vi.fn()
    }

    mockLotService = {
      getById: vi.fn()
    }

    mockBuildingService = {
      getById: vi.fn()
    }

    service = new ContactService(
      mockRepository as ContactRepository,
      mockUserService as UserService,
      mockLotService as LotService,
      mockBuildingService as BuildingService
    )

    // Default mock responses
    mockRepository.findById.mockResolvedValue({
      success: true,
      data: null
    })
    mockRepository.count.mockResolvedValue(0)
  })

  describe('CRUD Operations', () => {
    describe('CREATE', () => {
      it('should create contact with valid data', async () => {
        const user = UserTestDataFactory.create({ role: 'locataire' })
        const lot = LotTestDataFactory.create()
        const newContact = {
          user_id: user.id,
          lot_id: lot.id,
          type: 'tenant' as const,
          status: 'active' as const
        }
        const createdContact = { ...newContact, id: 'contact-123' }

        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockLotService.getById.mockResolvedValueOnce({
          success: true,
          data: lot
        })
        mockRepository.create.mockResolvedValueOnce({
          success: true,
          data: createdContact
        })

        const result = await service.create(newContact)

        expect(result.success).toBe(true)
        expect(result.data?.id).toBe('contact-123')
        expect(mockUserService.getById).toHaveBeenCalledWith(user.id)
        expect(mockLotService.getById).toHaveBeenCalledWith(lot.id)
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...newContact,
            status: 'active',
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        )
      })

      it('should throw NotFoundException if user not found', async () => {
        const newContact = {
          user_id: 'nonexistent',
          lot_id: 'lot-123',
          type: 'tenant' as const
        }

        mockUserService.getById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' }
        })

        await expect(service.create(newContact)).rejects.toThrow(NotFoundException)
      })

      it('should throw NotFoundException if lot not found', async () => {
        const user = UserTestDataFactory.create({ role: 'locataire' })
        const newContact = {
          user_id: user.id,
          lot_id: 'nonexistent',
          type: 'tenant' as const
        }

        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockLotService.getById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Lot not found' }
        })

        await expect(service.create(newContact)).rejects.toThrow(NotFoundException)
      })

      it('should validate role-based assignment rules', async () => {
        const user = UserTestDataFactory.create({ role: 'locataire' })
        const building = BuildingTestDataFactory.create()
        const newContact = {
          user_id: user.id,
          building_id: building.id,
          type: 'tenant' as const
        }

        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: user
        })

        await expect(service.create(newContact)).rejects.toThrow(ValidationException)
      })
    })

    describe('READ', () => {
      it('should get contact by ID', async () => {
        const contact = { id: 'contact-123', user_id: 'user-123', type: 'tenant' }

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: contact
        })

        const result = await service.getById('contact-123')

        expect(result.success).toBe(true)
        expect(result.data?.id).toBe('contact-123')
        expect(mockRepository.findById).toHaveBeenCalledWith('contact-123')
      })

      it('should return error if contact not found', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Contact not found' }
        })

        const result = await service.getById('nonexistent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })

      it('should get contact with relations', async () => {
        const contactWithRelations = {
          id: 'contact-123',
          user: { id: 'user-123', name: 'John Doe' },
          lot: { id: 'lot-123', reference: 'A101' }
        }

        mockRepository.findByIdWithRelations.mockResolvedValueOnce({
          success: true,
          data: contactWithRelations
        })

        const result = await service.getByIdWithRelations('contact-123')

        expect(result.success).toBe(true)
        expect(result.data?.user?.name).toBe('John Doe')
        expect(result.data?.lot?.reference).toBe('A101')
      })

      it('should get all contacts', async () => {
        const contacts = [
          { id: 'contact-1', type: 'tenant' },
          { id: 'contact-2', type: 'manager' }
        ]

        mockRepository.findAll.mockResolvedValueOnce(contacts)

        const result = await service.getAll()

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockRepository.findAll).toHaveBeenCalled()
      })
    })

    describe('UPDATE', () => {
      it('should update contact properties', async () => {
        const existingContact = { id: 'contact-123', type: 'tenant', status: 'active' }
        const updateData = { status: 'inactive' as const }
        const updatedContact = { ...existingContact, ...updateData }

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingContact
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: updatedContact
        })

        const result = await service.update('contact-123', updateData)

        expect(result.success).toBe(true)
        expect(result.data?.status).toBe('inactive')
        expect(mockRepository.update).toHaveBeenCalledWith('contact-123', expect.objectContaining({
          status: 'inactive',
          updated_at: expect.any(String)
        }))
      })

      it('should return error if contact not found for update', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Contact not found' }
        })

        const result = await service.update('nonexistent', { status: 'inactive' })

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })
    })

    describe('DELETE', () => {
      it('should delete contact successfully', async () => {
        const contact = { id: 'contact-123', type: 'tenant', user_id: 'user-123' }

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: contact
        })
        mockRepository.delete.mockResolvedValueOnce({
          success: true,
          data: true
        })

        const result = await service.delete('contact-123')

        expect(result.success).toBe(true)
        expect(mockRepository.delete).toHaveBeenCalledWith('contact-123')
      })

      it('should throw NotFoundException if contact not found for deletion', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: null
        })

        await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException)
      })
    })
  })

  describe('Business Logic', () => {
    describe('User Contacts', () => {
      it('should get contacts for a user', async () => {
        const userContacts = [
          { id: 'contact-1', user_id: 'user-123', lot_id: 'lot-1' },
          { id: 'contact-2', user_id: 'user-123', building_id: 'building-1' }
        ]

        mockRepository.findByUser.mockResolvedValueOnce({
          success: true,
          data: userContacts
        })

        const result = await service.getUserContacts('user-123')

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockRepository.findByUser).toHaveBeenCalledWith('user-123')
      })
    })

    describe('Lot Contacts', () => {
      it('should get contacts for a lot', async () => {
        const lotContacts = [
          { id: 'contact-1', lot_id: 'lot-123', type: 'tenant' },
          { id: 'contact-2', lot_id: 'lot-123', type: 'manager' }
        ]

        mockRepository.findByLot.mockResolvedValueOnce({
          success: true,
          data: lotContacts
        })

        const result = await service.getLotContacts('lot-123')

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockRepository.findByLot).toHaveBeenCalledWith('lot-123', undefined)
      })

      it('should get contacts for a lot by type', async () => {
        const tenantContacts = [
          { id: 'contact-1', lot_id: 'lot-123', type: 'tenant' }
        ]

        mockRepository.findByLot.mockResolvedValueOnce({
          success: true,
          data: tenantContacts
        })

        const result = await service.getLotContacts('lot-123', 'tenant')

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(1)
        expect(mockRepository.findByLot).toHaveBeenCalledWith('lot-123', 'tenant')
      })
    })

    describe('Building Contacts', () => {
      it('should get contacts for a building', async () => {
        const buildingContacts = [
          { id: 'contact-1', building_id: 'building-123', type: 'manager' },
          { id: 'contact-2', building_id: 'building-123', type: 'provider' }
        ]

        mockRepository.findByBuilding.mockResolvedValueOnce({
          success: true,
          data: buildingContacts
        })

        const result = await service.getBuildingContacts('building-123')

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockRepository.findByBuilding).toHaveBeenCalledWith('building-123', undefined)
      })
    })

    describe('Contact Assignment', () => {
      it('should add contact to lot with role validation', async () => {
        const user = UserTestDataFactory.create({ role: 'locataire' })
        const createdContact = { id: 'contact-123', user_id: user.id, lot_id: 'lot-123', type: 'tenant' }

        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockRepository.addToLot.mockResolvedValueOnce({
          success: true,
          data: createdContact
        })

        const result = await service.addContactToLot('lot-123', user.id, false)

        expect(result.success).toBe(true)
        expect(result.data?.type).toBe('tenant')
        expect(mockRepository.addToLot).toHaveBeenCalledWith('lot-123', user.id, 'tenant', false)
      })

      it('should add contact to building with role validation', async () => {
        const user = UserTestDataFactory.create({ role: 'gestionnaire' })
        const createdContact = { id: 'contact-123', user_id: user.id, building_id: 'building-123', type: 'manager' }

        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockRepository.addToBuilding.mockResolvedValueOnce({
          success: true,
          data: createdContact
        })

        const result = await service.addContactToBuilding('building-123', user.id, false)

        expect(result.success).toBe(true)
        expect(result.data?.type).toBe('manager')
        expect(mockRepository.addToBuilding).toHaveBeenCalledWith('building-123', user.id, 'manager', false)
      })

      it('should prevent tenant assignment to building', async () => {
        const user = UserTestDataFactory.create({ role: 'locataire' })

        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: user
        })

        await expect(service.addContactToBuilding('building-123', user.id)).rejects.toThrow(ValidationException)
      })

      it('should remove contact from lot', async () => {
        mockRepository.removeFromLot.mockResolvedValueOnce({
          success: true,
          data: { id: 'contact-123' }
        })

        const result = await service.removeContactFromLot('lot-123', 'user-123')

        expect(result.success).toBe(true)
        expect(mockRepository.removeFromLot).toHaveBeenCalledWith('lot-123', 'user-123')
      })

      it('should remove contact from building', async () => {
        mockRepository.removeFromBuilding.mockResolvedValueOnce({
          success: true,
          data: { id: 'contact-123' }
        })

        const result = await service.removeContactFromBuilding('building-123', 'user-123')

        expect(result.success).toBe(true)
        expect(mockRepository.removeFromBuilding).toHaveBeenCalledWith('building-123', 'user-123')
      })
    })

    describe('Contact Types', () => {
      it('should get contacts by type', async () => {
        const tenantContacts = [
          { id: 'contact-1', type: 'tenant', status: 'active' },
          { id: 'contact-2', type: 'tenant', status: 'pending' }
        ]

        mockRepository.findByType.mockResolvedValueOnce({
          success: true,
          data: tenantContacts
        })

        const result = await service.getContactsByType('tenant')

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockRepository.findByType).toHaveBeenCalledWith('tenant', undefined)
      })

      it('should get contacts by type and status', async () => {
        const activeTenants = [
          { id: 'contact-1', type: 'tenant', status: 'active' }
        ]

        mockRepository.findByType.mockResolvedValueOnce({
          success: true,
          data: activeTenants
        })

        const result = await service.getContactsByType('tenant', { status: 'active' })

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(1)
        expect(mockRepository.findByType).toHaveBeenCalledWith('tenant', { status: 'active' })
      })
    })

    describe('Statistics', () => {
      it('should get contact statistics', async () => {
        const stats = {
          total: 15,
          byType: {
            tenant: 8,
            owner: 2,
            manager: 3,
            provider: 2
          },
          byStatus: {
            active: 12,
            inactive: 2,
            pending: 1
          }
        }

        mockRepository.getContactStats.mockResolvedValueOnce({
          success: true,
          data: stats
        })

        const result = await service.getContactStats()

        expect(result.success).toBe(true)
        expect(result.data?.total).toBe(15)
        expect(result.data?.byType.tenant).toBe(8)
        expect(mockRepository.getContactStats).toHaveBeenCalled()
      })

      it('should count contacts', async () => {
        mockRepository.count.mockResolvedValueOnce(25)

        const result = await service.count()

        expect(result.success).toBe(true)
        expect(result.data).toBe(25)
        expect(mockRepository.count).toHaveBeenCalled()
      })
    })
  })

  describe('Validation', () => {
    it('should validate contact data on creation', async () => {
      const invalidData = {
        user_id: '',
        type: 'invalid' as any,
        status: 'unknown' as any
      }

      await expect(service.create(invalidData)).rejects.toThrow()
    })

    it('should validate role-contact type mapping', async () => {
      const user = UserTestDataFactory.create({ role: 'gestionnaire' })
      const newContact = {
        user_id: user.id,
        lot_id: 'lot-123',
        type: 'tenant' as const // Wrong type for gestionnaire
      }

      mockUserService.getById.mockResolvedValueOnce({
        success: true,
        data: user
      })
      mockLotService.getById.mockResolvedValueOnce({
        success: true,
        data: { id: 'lot-123' }
      })

      await expect(service.create(newContact)).rejects.toThrow(ValidationException)
    })
  })
})
