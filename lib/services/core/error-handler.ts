import type { PostgrestError } from '@supabase/supabase-js'
import type { RepositoryError } from './service-types'

/**
 * Custom error classes for better error handling
 */
export class RepositoryException extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
    public hint?: string
  ) {
    super(message)
    this.name = 'RepositoryException'
  }
}

export class ValidationException extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message)
    this.name = 'ValidationException'
  }
}

export class PermissionException extends Error {
  constructor(
    message: string,
    public resource?: string,
    public action?: string,
    public userId?: string
  ) {
    super(message)
    this.name = 'PermissionException'
  }
}

export class NotFoundException extends Error {
  constructor(
    resource: string,
    identifier: string | number
  ) {
    super(`${resource} with identifier '${identifier}' not found`)
    this.name = 'NotFoundException'
  }
}

export class ConflictException extends Error {
  constructor(
    message: string,
    public conflictField?: string,
    public conflictValue?: unknown
  ) {
    super(message)
    this.name = 'ConflictException'
  }
}

/**
 * Error codes for common Supabase/PostgreSQL errors
 */
export const ERROR_CODES = {
  // PostgreSQL error codes
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',

  // Custom error codes
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

/**
 * Transform Supabase PostgrestError to RepositoryError
 */
export function transformSupabaseError(error: PostgrestError): RepositoryError {
  const { code, message, details, hint } = error

  // Map PostgreSQL error codes to more friendly error types
  switch (code) {
    case ERROR_CODES.UNIQUE_VIOLATION:
      return {
        code: ERROR_CODES.CONFLICT,
        message: 'A record with this value already exists',
        details,
        hint: hint || 'Please use a different value'
      }

    case ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Referenced record does not exist',
        details,
        hint: hint || 'Please ensure all referenced records exist'
      }

    case ERROR_CODES.NOT_NULL_VIOLATION:
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Required field cannot be empty',
        details,
        hint: hint || 'Please provide all required fields'
      }

    case ERROR_CODES.CHECK_VIOLATION:
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Value does not meet constraints',
        details,
        hint: hint || 'Please ensure the value meets all constraints'
      }

    default:
      return {
        code: code || ERROR_CODES.UNKNOWN_ERROR,
        message: message || 'An unknown error occurred',
        details,
        hint
      }
  }
}

/**
 * Transform JavaScript Error to RepositoryError
 */
export function transformError(error: Error): RepositoryError {
  if (error instanceof RepositoryException) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    }
  }

  if (error instanceof ValidationException) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: error.message,
      details: { field: error.field, value: error.value }
    }
  }

  if (error instanceof PermissionException) {
    return {
      code: ERROR_CODES.PERMISSION_DENIED,
      message: error.message,
      details: {
        resource: error.resource,
        action: error.action,
        userId: error.userId
      }
    }
  }

  if (error instanceof NotFoundException) {
    return {
      code: ERROR_CODES.NOT_FOUND,
      message: error.message
    }
  }

  if (error instanceof ConflictException) {
    return {
      code: ERROR_CODES.CONFLICT,
      message: error.message,
      details: {
        field: error.conflictField,
        value: error.conflictValue
      }
    }
  }

  // Handle network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Network connection failed',
      details: error.message
    }
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return {
      code: ERROR_CODES.TIMEOUT,
      message: 'Request timed out',
      details: error.message
    }
  }

  // Default fallback
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: error.message || 'An unknown error occurred',
    details: error.stack
  }
}

/**
 * Handle and log errors consistently
 */
export function handleError(error: unknown, context?: string): RepositoryError {
  const contextMessage = context ? `[${context}] ` : ''

  // Handle Supabase PostgrestError
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const repositoryError = transformSupabaseError(error as PostgrestError)
    console.error(`${contextMessage}Supabase error:`, repositoryError)
    return repositoryError
  }

  // Handle JavaScript Error
  if (error instanceof Error) {
    const repositoryError = transformError(error)
    console.error(`${contextMessage}Error:`, repositoryError)
    return repositoryError
  }

  // Handle unknown errors
  const unknownError: RepositoryError = {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    details: error
  }

  console.error(`${contextMessage}Unknown error:`, unknownError)
  return unknownError
}

/**
 * Validate required fields
 */
export function validateRequired(data: Record<string, unknown>, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new ValidationException(`Field '${field}' is required`, field, data[field])
    }
  }
}

/**
 * Validate email format
 */
export function validateEmail(_email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationException('Invalid email format', 'email', email)
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string, fieldName = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(uuid)) {
    throw new ValidationException(`Invalid UUID format for field '${fieldName}'`, fieldName, uuid)
  }
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T): { data: T; error: null; success: true } {
  return {
    data,
    error: null,
    success: true
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse<T = null>(error: RepositoryError): { data: T; error: RepositoryError; success: false } {
  return {
    data: null as T,
    error,
    success: false
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Don't retry on validation errors or permission errors
      if (error instanceof ValidationException || error instanceof PermissionException) {
        throw error
      }

      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}
