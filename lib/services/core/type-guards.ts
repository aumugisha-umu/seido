/**
 * Type Guards for Repository Responses
 * These guards enable proper TypeScript type narrowing for success/error states
 */

import type { RepositoryResponse, RepositoryListResponse } from './service-types'

/**
 * Type guard for successful repository response
 * Narrows the type to ensure data is non-null when success is true
 *
 * @example
 * const result = await repository.findById(id)
 * if (isSuccessResponse(result)) {
 *   // TypeScript knows result.data is non-null here
 *   console.log(result.data.name)
 * }
 */
export function isSuccessResponse<T>(
  response: RepositoryResponse<T>
): response is RepositoryResponse<T> & { success: true; data: T; error: null } {
  return response.success === true && response.data !== null
}

/**
 * Type guard for error repository response
 * Narrows the type to ensure error is non-null when success is false
 *
 * @example
 * const result = await repository.findById(id)
 * if (isErrorResponse(result)) {
 *   // TypeScript knows result.error is non-null here
 *   console.log(result.error.message)
 * }
 */
export function isErrorResponse<T>(
  response: RepositoryResponse<T>
): response is RepositoryResponse<T> & { success: false; data: null; error: NonNullable<RepositoryResponse<T>['error']> } {
  return response.success === false
}

/**
 * Type guard for successful list repository response
 * Narrows the type to ensure data array is present when success is true
 *
 * @example
 * const result = await repository.findAll()
 * if (isSuccessListResponse(result)) {
 *   // TypeScript knows result.data is a non-empty array
 *   result.data.forEach(item => console.log(item.name))
 * }
 */
export function isSuccessListResponse<T>(
  response: RepositoryListResponse<T>
): response is RepositoryListResponse<T> & { success: true; data: T[]; error: null } {
  return response.success === true && Array.isArray(response.data)
}

/**
 * Type guard for error list repository response
 * Narrows the type to ensure error is non-null when success is false
 */
export function isErrorListResponse<T>(
  response: RepositoryListResponse<T>
): response is RepositoryListResponse<T> & { success: false; data: []; error: NonNullable<RepositoryListResponse<T>['error']> } {
  return response.success === false
}

/**
 * Assert that a response is successful, throwing an error otherwise
 * Useful for cases where you expect success and want to fail fast
 *
 * @example
 * const result = await repository.findById(id)
 * assertSuccessResponse(result, 'User not found')
 * // TypeScript knows result.data is non-null after this line
 * console.log(result.data.name)
 */
export function assertSuccessResponse<T>(
  response: RepositoryResponse<T>,
  errorMessage?: string
): asserts response is RepositoryResponse<T> & { success: true; data: T; error: null } {
  if (!isSuccessResponse(response)) {
    const message = errorMessage || response.error?.message || 'Repository operation failed'
    throw new Error(message)
  }
}

/**
 * Extract data from a successful response, or return a default value
 * Type-safe alternative to optional chaining
 *
 * @example
 * const result = await repository.findById(id)
 * const user = extractData(result, null)
 * // user is User | null
 */
export function extractData<T>(
  response: RepositoryResponse<T>,
  defaultValue: T
): T
export function extractData<T>(
  response: RepositoryResponse<T>,
  defaultValue: null
): T | null
export function extractData<T>(
  response: RepositoryResponse<T>,
  defaultValue: T | null = null
): T | null {
  return isSuccessResponse(response) ? response.data : defaultValue
}

/**
 * Extract list data from a successful response, or return empty array
 *
 * @example
 * const result = await repository.findAll()
 * const users = extractListData(result)
 * // users is always User[] (empty array if error)
 */
export function extractListData<T>(
  response: RepositoryListResponse<T>
): T[] {
  return isSuccessListResponse(response) ? response.data : []
}
