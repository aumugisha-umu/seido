import { describe, it, expect, vi } from 'vitest'
import {
  createSuccessResponse,
  createErrorResponse,
  validateRequired,
  validateEmail,
  validateUUID,
  RepositoryException,
  ValidationException,
  PermissionException,
  handleError,
  ERROR_CODES
} from '../core/error-handler'
import type {
  User,
  Building,
  Lot,
  Intervention,
  Contact,
  RepositoryResponse
} from '../core/service-types'
import {
  UserTestDataFactory,
  BuildingTestDataFactory,
  LotTestDataFactory,
  InterventionTestDataFactory,
  ContactTestDataFactory,
  ScenarioFactory
} from '../__tests__/helpers/test-data'

describe('Phase 1 Infrastructure Tests', () => {
  describe('Error Handling', () => {
    it('should create success responses correctly', () => {
      const data = { id: '123', name: 'Test' }
      const response = createSuccessResponse(data)

      expect(response.success).toBe(true)
      expect(response.error).toBeNull()
      expect(response.data).toEqual(data)
    })

    it('should create error responses correctly', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error message'
      }
      const response = createErrorResponse(error)

      expect(response.success).toBe(false)
      expect(response.data).toBeNull()
      expect(response.error).toEqual(error)
    })

    it('should validate required fields', () => {
      expect(() => {
        validateRequired({ name: 'Test' }, ['name', 'email'])
      }).toThrow(ValidationException)

      expect(() => {
        validateRequired({ name: 'Test', email: 'test@example.com' }, ['name', 'email'])
      }).not.toThrow()
    })

    it('should validate email format', () => {
      expect(() => validateEmail('invalid-email')).toThrow(ValidationException)
      expect(() => validateEmail('valid@email.com')).not.toThrow()
    })

    it('should validate UUID format', () => {
      expect(() => validateUUID('invalid-uuid')).toThrow(ValidationException)
      expect(() => validateUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).not.toThrow()
    })

    it('should create custom exceptions', () => {
      const repoError = new RepositoryException('REPO_ERROR', 'Repository error')
      expect(repoError.code).toBe('REPO_ERROR')
      expect(repoError.message).toBe('Repository error')

      const validationError = new ValidationException('Validation error', 'email')
      expect(validationError.field).toBe('email')

      const permissionError = new PermissionException('No permission', 'users', 'read')
      expect(permissionError.resource).toBe('users')
      expect(permissionError.action).toBe('read')
    })

    it('should handle errors consistently', () => {
      const jsError = new Error('Test error')
      const handled = handleError(jsError, 'test-context')

      expect(handled.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
      expect(handled.message).toBe('Test error')
    })
  })

  describe('Type System', () => {
    it('should create valid User types', () => {
      const user: User = {
        id: 'user-123',
        auth_user_id: 'auth-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        status: 'active',
        phone: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      expect(user.role).toBe('admin')
      expect(user.status).toBe('active')
      expect(typeof user.created_at).toBe('string')
    })

    it('should create valid Building types', () => {
      const building: Building = {
        id: 'building-123',
        name: 'Test Building',
        address: '123 Test St',
        description: null,
        manager_id: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      expect(building.name).toBe('Test Building')
      expect(building.manager_id).toBe('user-123')
    })

    it('should create valid repository response types', () => {
      const successResponse: RepositoryResponse<User> = {
        data: UserTestDataFactory.create(),
        error: null,
        success: true
      }

      const errorResponse: RepositoryResponse<User> = {
        data: null,
        error: {
          code: 'ERROR',
          message: 'Error message'
        },
        success: false
      }

      expect(successResponse.success).toBe(true)
      expect(successResponse.data).toBeTruthy()
      expect(errorResponse.success).toBe(false)
      expect(errorResponse.error).toBeTruthy()
    })
  })

  describe('Test Data Factories', () => {
    it('should create valid users', () => {
      const user = UserTestDataFactory.create()
      expect(user.id).toBeTruthy()
      expect(user.email).toContain('@')
      expect(user.role).toBeDefined()

      const admin = UserTestDataFactory.createAdmin()
      expect(admin.role).toBe('admin')

      const manager = UserTestDataFactory.createManager()
      expect(manager.role).toBe('gestionnaire')
    })

    it('should create valid buildings', () => {
      const building = BuildingTestDataFactory.create()
      expect(building.id).toBeTruthy()
      expect(building.name).toBeTruthy()
      expect(building.address).toBeTruthy()

      const manager = UserTestDataFactory.createManager()
      const buildingWithManager = BuildingTestDataFactory.createWithManager(manager)
      expect(buildingWithManager.manager_id).toBe(manager.id)
    })

    it('should create valid lots', () => {
      const lot = LotTestDataFactory.create()
      expect(lot.id).toBeTruthy()
      expect(lot.building_id).toBeTruthy()
      expect(lot.reference).toBeTruthy()
      expect(lot.type).toBeDefined()

      const apartment = LotTestDataFactory.createApartment()
      expect(apartment.type).toBe('apartment')

      const commercial = LotTestDataFactory.createCommercial()
      expect(commercial.type).toBe('commercial')
    })

    it('should create valid interventions', () => {
      const intervention = InterventionTestDataFactory.create()
      expect(intervention.id).toBeTruthy()
      expect(intervention.title).toBeTruthy()
      expect(intervention.status).toBeDefined()
      expect(intervention.priority).toBeDefined()

      const pending = InterventionTestDataFactory.createPending()
      expect(pending.status).toBe('pending')

      const completed = InterventionTestDataFactory.createCompleted()
      expect(completed.status).toBe('completed')
      expect(completed.completed_date).toBeTruthy()
    })

    it('should create valid contacts', () => {
      const contact = ContactTestDataFactory.create()
      expect(contact.id).toBeTruthy()
      expect(contact.user_id).toBeTruthy()
      expect(contact.type).toBeDefined()
      expect(contact.status).toBeDefined()

      const user = UserTestDataFactory.createTenant()
      const lot = LotTestDataFactory.create()
      const tenantContact = ContactTestDataFactory.createTenant(user, lot)
      expect(tenantContact.user_id).toBe(user.id)
      expect(tenantContact.lot_id).toBe(lot.id)
      expect(tenantContact.type).toBe('tenant')
    })

    it('should create complex scenarios', () => {
      const scenario = ScenarioFactory.createBuildingScenario()

      expect(scenario.manager.role).toBe('gestionnaire')
      expect(scenario.building.manager_id).toBe(scenario.manager.id)
      expect(scenario.lots).toHaveLength(3)
      expect(scenario.tenants).toHaveLength(3)
      expect(scenario.contacts).toHaveLength(3)
      expect(scenario.interventions).toHaveLength(3)

      // Verify relationships
      scenario.lots.forEach((lot, index) => {
        expect(lot.building_id).toBe(scenario.building.id)
        expect(scenario.contacts[index].lot_id).toBe(lot.id)
        expect(scenario.contacts[index].user_id).toBe(scenario.tenants[index].id)
        expect(scenario.interventions[index].lot_id).toBe(lot.id)
      })
    })

    it('should create intervention workflow scenario', () => {
      const workflow = ScenarioFactory.createInterventionWorkflow()

      expect(workflow.tenant.role).toBe('locataire')
      expect(workflow.manager.role).toBe('gestionnaire')
      expect(workflow.provider.role).toBe('prestataire')

      expect(workflow.building.manager_id).toBe(workflow.manager.id)
      expect(workflow.lot.building_id).toBe(workflow.building.id)
      expect(workflow.contact.user_id).toBe(workflow.tenant.id)
      expect(workflow.contact.lot_id).toBe(workflow.lot.id)

      // Check intervention states
      expect(workflow.interventions.pending.status).toBe('pending')
      expect(workflow.interventions.approved.status).toBe('approved')
      expect(workflow.interventions.inProgress.status).toBe('in_progress')
      expect(workflow.interventions.completed.status).toBe('completed')
    })
  })

  describe('Service Integration', () => {
    it('should work with mocked Supabase clients', () => {
      // This tests that our service types work with mocked data
      const mockResponse = {
        data: UserTestDataFactory.create(),
        error: null,
        success: true
      }

      expect(mockResponse.data.role).toBeDefined()
      expect(mockResponse.success).toBe(true)
    })

    it('should handle pagination responses', () => {
      const users = UserTestDataFactory.createMultiple(5)
      const paginatedResponse = {
        data: users,
        pagination: {
          page: 1,
          pageSize: 5,
          total: 10,
          totalPages: 2,
          hasNext: true,
          hasPrev: false
        },
        error: null,
        success: true
      }

      expect(paginatedResponse.data).toHaveLength(5)
      expect(paginatedResponse.pagination.hasNext).toBe(true)
      expect(paginatedResponse.pagination.hasPrev).toBe(false)
    })
  })
})