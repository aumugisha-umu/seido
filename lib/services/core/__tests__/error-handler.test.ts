/**
 * Error Handler Tests
 * Comprehensive test suite for error handling classes and functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  NotFoundException,
  ValidationException,
  PermissionException,
  ConflictException,
  RepositoryException,
  ERROR_CODES,
  transformSupabaseError,
  transformError,
  handleError,
  validateRequired,
  validateEmail,
  validateUUID,
  createSuccessResponse,
  createErrorResponse,
  withRetry
} from '../error-handler'
import type { PostgrestError } from '@supabase/supabase-js'

// Mock the logger module
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  },
  logError: vi.fn()
}))

describe('Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('NotFoundException', () => {
    it('should generate correct error message with string identifier', () => {
      const error = new NotFoundException('User', 'abc-123')
      expect(error.message).toBe("User with identifier 'abc-123' not found")
      expect(error.name).toBe('NotFoundException')
    })

    it('should generate correct error message with numeric identifier', () => {
      const error = new NotFoundException('Record', 42)
      expect(error.message).toBe("Record with identifier '42' not found")
      expect(error.name).toBe('NotFoundException')
    })

    it('should be instance of Error', () => {
      const error = new NotFoundException('User', 'test-id')
      expect(error).toBeInstanceOf(Error)
    })

    it('should handle UUID identifiers', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000'
      const error = new NotFoundException('Intervention', uuid)
      expect(error.message).toBe(`Intervention with identifier '${uuid}' not found`)
    })

    it('should handle empty string identifier', () => {
      const error = new NotFoundException('Entity', '')
      expect(error.message).toBe("Entity with identifier '' not found")
    })

    it('should handle zero as numeric identifier', () => {
      const error = new NotFoundException('Item', 0)
      expect(error.message).toBe("Item with identifier '0' not found")
    })

    it('should handle special characters in resource name', () => {
      const error = new NotFoundException('User/Role', 'admin')
      expect(error.message).toBe("User/Role with identifier 'admin' not found")
    })

    it('should handle special characters in identifier', () => {
      const error = new NotFoundException('File', '/path/to/file.txt')
      expect(error.message).toBe("File with identifier '/path/to/file.txt' not found")
    })
  })

  describe('ValidationException', () => {
    it('should create exception with message only', () => {
      const error = new ValidationException('Invalid input')
      expect(error.message).toBe('Invalid input')
      expect(error.name).toBe('ValidationException')
      expect(error.field).toBeUndefined()
      expect(error.value).toBeUndefined()
    })

    it('should create exception with field and value', () => {
      const error = new ValidationException('Invalid email format', 'email', 'not-an-email')
      expect(error.message).toBe('Invalid email format')
      expect(error.field).toBe('email')
      expect(error.value).toBe('not-an-email')
    })

    it('should handle null value', () => {
      const error = new ValidationException('Field required', 'name', null)
      expect(error.value).toBeNull()
    })

    it('should handle object value', () => {
      const objValue = { test: 'data' }
      const error = new ValidationException('Invalid object', 'data', objValue)
      expect(error.value).toEqual(objValue)
    })
  })

  describe('PermissionException', () => {
    it('should create exception with message only', () => {
      const error = new PermissionException('Access denied')
      expect(error.message).toBe('Access denied')
      expect(error.name).toBe('PermissionException')
    })

    it('should create exception with all parameters', () => {
      const error = new PermissionException(
        'Cannot delete intervention',
        'interventions',
        'delete',
        'user-123'
      )
      expect(error.message).toBe('Cannot delete intervention')
      expect(error.resource).toBe('interventions')
      expect(error.action).toBe('delete')
      expect(error.userId).toBe('user-123')
    })
  })

  describe('ConflictException', () => {
    it('should create exception with message only', () => {
      const error = new ConflictException('Resource already exists')
      expect(error.message).toBe('Resource already exists')
      expect(error.name).toBe('ConflictException')
    })

    it('should create exception with conflict details', () => {
      const error = new ConflictException(
        'Email already in use',
        'email',
        'test@example.com'
      )
      expect(error.conflictField).toBe('email')
      expect(error.conflictValue).toBe('test@example.com')
    })
  })

  describe('RepositoryException', () => {
    it('should create exception with required parameters', () => {
      const error = new RepositoryException('DB_ERROR', 'Database connection failed')
      expect(error.code).toBe('DB_ERROR')
      expect(error.message).toBe('Database connection failed')
      expect(error.name).toBe('RepositoryException')
    })

    it('should create exception with details and hint', () => {
      const error = new RepositoryException(
        'CONSTRAINT_VIOLATION',
        'Foreign key constraint violated',
        { table: 'interventions', column: 'lot_id' },
        'Ensure the referenced lot exists'
      )
      expect(error.details).toEqual({ table: 'interventions', column: 'lot_id' })
      expect(error.hint).toBe('Ensure the referenced lot exists')
    })
  })

  describe('transformSupabaseError', () => {
    it('should transform unique violation error', () => {
      const pgError: PostgrestError = {
        code: ERROR_CODES.UNIQUE_VIOLATION,
        message: 'duplicate key value violates unique constraint',
        details: 'Key (email)=(test@example.com) already exists.',
        hint: null
      }

      const result = transformSupabaseError(pgError)
      expect(result.code).toBe(ERROR_CODES.CONFLICT)
      expect(result.message).toBe('A record with this value already exists')
      expect(result.hint).toBe('Please use a different value')
    })

    it('should transform foreign key violation error', () => {
      const pgError: PostgrestError = {
        code: ERROR_CODES.FOREIGN_KEY_VIOLATION,
        message: 'insert or update on table "interventions" violates foreign key constraint',
        details: 'Key (lot_id)=(123) is not present in table "lots".',
        hint: null
      }

      const result = transformSupabaseError(pgError)
      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(result.message).toBe('Referenced record does not exist')
      expect(result.hint).toBe('Please ensure all referenced records exist')
    })

    it('should transform not null violation error', () => {
      const pgError: PostgrestError = {
        code: ERROR_CODES.NOT_NULL_VIOLATION,
        message: 'null value in column "title" violates not-null constraint',
        details: 'Failing row contains null value.',
        hint: null
      }

      const result = transformSupabaseError(pgError)
      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(result.message).toBe('Required field cannot be empty')
    })

    it('should transform check violation error', () => {
      const pgError: PostgrestError = {
        code: ERROR_CODES.CHECK_VIOLATION,
        message: 'new row for relation "interventions" violates check constraint',
        details: 'Failing row contains invalid priority value.',
        hint: 'Priority must be one of: low, medium, high, urgent'
      }

      const result = transformSupabaseError(pgError)
      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(result.message).toBe('Value does not meet constraints')
      expect(result.hint).toBe('Priority must be one of: low, medium, high, urgent')
    })

    it('should handle unknown error code', () => {
      const pgError: PostgrestError = {
        code: 'UNKNOWN',
        message: 'Something went wrong',
        details: null,
        hint: null
      }

      const result = transformSupabaseError(pgError)
      expect(result.code).toBe('UNKNOWN')
      expect(result.message).toBe('Something went wrong')
    })

    it('should handle error without code', () => {
      const pgError: PostgrestError = {
        code: null as any,
        message: 'An error occurred',
        details: null,
        hint: null
      }

      const result = transformSupabaseError(pgError)
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
      expect(result.message).toBe('An error occurred')
    })
  })

  describe('transformError', () => {
    it('should transform NotFoundException', () => {
      const error = new NotFoundException('User', '123')
      const result = transformError(error)
      expect(result.code).toBe(ERROR_CODES.NOT_FOUND)
      expect(result.message).toBe("User with identifier '123' not found")
    })

    it('should transform ValidationException', () => {
      const error = new ValidationException('Invalid email', 'email', 'bad-email')
      const result = transformError(error)
      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(result.message).toBe('Invalid email')
      expect(result.details).toEqual({ field: 'email', value: 'bad-email' })
    })

    it('should transform PermissionException', () => {
      const error = new PermissionException('Access denied', 'resource', 'action', 'user-id')
      const result = transformError(error)
      expect(result.code).toBe(ERROR_CODES.PERMISSION_DENIED)
      expect(result.message).toBe('Access denied')
      expect(result.details).toEqual({
        resource: 'resource',
        action: 'action',
        userId: 'user-id'
      })
    })

    it('should transform ConflictException', () => {
      const error = new ConflictException('Duplicate entry', 'field', 'value')
      const result = transformError(error)
      expect(result.code).toBe(ERROR_CODES.CONFLICT)
      expect(result.message).toBe('Duplicate entry')
      expect(result.details).toEqual({ field: 'field', value: 'value' })
    })

    it('should transform RepositoryException', () => {
      const error = new RepositoryException('CUSTOM', 'Custom error', { extra: 'data' }, 'Hint text')
      const result = transformError(error)
      expect(result.code).toBe('CUSTOM')
      expect(result.message).toBe('Custom error')
      expect(result.details).toEqual({ extra: 'data' })
      expect(result.hint).toBe('Hint text')
    })

    it('should handle network error', () => {
      const error = new TypeError('Failed to fetch')
      const result = transformError(error)
      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR)
      expect(result.message).toBe('Network connection failed')
    })

    it('should handle timeout error', () => {
      const error = new Error('Request timeout')
      error.name = 'AbortError'
      const result = transformError(error)
      expect(result.code).toBe(ERROR_CODES.TIMEOUT)
      expect(result.message).toBe('Request timed out')
    })

    it('should handle generic error', () => {
      const error = new Error('Generic error message')
      const result = transformError(error)
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
      expect(result.message).toBe('Generic error message')
    })

    it('should handle error without message', () => {
      const error = new Error()
      const result = transformError(error)
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
      expect(result.message).toBe('An unknown error occurred')
    })
  })

  describe('validateRequired', () => {
    it('should not throw for valid required fields', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        age: 30
      }
      expect(() => validateRequired(data, ['name', 'email', 'age'])).not.toThrow()
    })

    it('should throw for undefined field', () => {
      const data = { name: 'John' }
      expect(() => validateRequired(data, ['name', 'email']))
        .toThrow(ValidationException)
    })

    it('should throw for null field', () => {
      const data = { name: 'John', email: null }
      expect(() => validateRequired(data, ['name', 'email']))
        .toThrow(ValidationException)
    })

    it('should throw for empty string field', () => {
      const data = { name: 'John', email: '' }
      expect(() => validateRequired(data, ['name', 'email']))
        .toThrow(ValidationException)
    })

    it('should not throw for zero value', () => {
      const data = { count: 0 }
      expect(() => validateRequired(data, ['count'])).not.toThrow()
    })

    it('should not throw for false value', () => {
      const data = { active: false }
      expect(() => validateRequired(data, ['active'])).not.toThrow()
    })
  })

  describe('validateEmail', () => {
    it('should not throw for valid email', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow()
      expect(() => validateEmail('user.name@example.co.uk')).not.toThrow()
      expect(() => validateEmail('user+tag@example.com')).not.toThrow()
    })

    it('should throw for invalid email format', () => {
      expect(() => validateEmail('notanemail')).toThrow(ValidationException)
      expect(() => validateEmail('user@')).toThrow(ValidationException)
      expect(() => validateEmail('@example.com')).toThrow(ValidationException)
      expect(() => validateEmail('user@.com')).toThrow(ValidationException)
      expect(() => validateEmail('user example@com')).toThrow(ValidationException)
    })
  })

  describe('validateUUID', () => {
    it('should not throw for valid UUID v4', () => {
      expect(() => validateUUID('123e4567-e89b-42d3-a456-426614174000')).not.toThrow()
    })

    it('should throw for invalid UUID', () => {
      expect(() => validateUUID('not-a-uuid')).toThrow(ValidationException)
      expect(() => validateUUID('123e4567-e89b-12d3-a456-426614174000'))
        .toThrow(ValidationException) // Wrong version
      expect(() => validateUUID('123e4567e89b42d3a456426614174000'))
        .toThrow(ValidationException) // Missing dashes
    })

    it('should use custom field name in error', () => {
      try {
        validateUUID('invalid', 'user_id')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException)
        if (error instanceof ValidationException) {
          expect(error.field).toBe('user_id')
        }
      }
    })
  })

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'Test' }
      const response = createSuccessResponse(data)
      expect(response).toEqual({
        data,
        error: null,
        success: true
      })
    })

    it('should handle null data', () => {
      const response = createSuccessResponse(null)
      expect(response).toEqual({
        data: null,
        error: null,
        success: true
      })
    })

    it('should handle array data', () => {
      const data = [1, 2, 3]
      const response = createSuccessResponse(data)
      expect(response.data).toEqual(data)
      expect(response.success).toBe(true)
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response', () => {
      const error = {
        code: 'ERROR_CODE',
        message: 'Error message'
      }
      const response = createErrorResponse(error)
      expect(response).toEqual({
        data: null,
        error,
        success: false
      })
    })

    it('should handle error with details', () => {
      const error = {
        code: 'ERROR_CODE',
        message: 'Error message',
        details: { field: 'value' }
      }
      const response = createErrorResponse(error)
      expect(response.error).toEqual(error)
      expect(response.success).toBe(false)
    })
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const result = await withRetry(operation)
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success')

      const result = await withRetry(operation, 3, 10)
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should throw after max retries', async () => {
      const error = new Error('Persistent failure')
      const operation = vi.fn().mockRejectedValue(error)

      await expect(withRetry(operation, 3, 10)).rejects.toThrow('Persistent failure')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry validation errors', async () => {
      const error = new ValidationException('Invalid input')
      const operation = vi.fn().mockRejectedValue(error)

      await expect(withRetry(operation, 3, 10)).rejects.toThrow(ValidationException)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should not retry permission errors', async () => {
      const error = new PermissionException('Access denied')
      const operation = vi.fn().mockRejectedValue(error)

      await expect(withRetry(operation, 3, 10)).rejects.toThrow(PermissionException)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should apply exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValueOnce('success')

      const startTime = Date.now()
      const result = await withRetry(operation, 3, 10)
      const endTime = Date.now()

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
      // With baseDelay=10ms, we expect delays of 10ms and 20ms (total 30ms minimum)
      expect(endTime - startTime).toBeGreaterThanOrEqual(25) // Allow some margin
    })
  })
})