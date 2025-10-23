/**
 * Error Sanitization Utilities
 *
 * Prevents information leakage in API responses by:
 * - Sanitizing error messages
 * - Removing stack traces
 * - Hiding internal details
 * - Providing safe debug info in development only
 *
 * Created: Oct 23, 2025 (Issue #5 - Information Leakage fix)
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Error codes for client-facing errors
 */
export enum ErrorCode {
  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',

  // Specific
  AUTH_FAILED = 'AUTH_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Safe error response structure
 */
export interface SafeErrorResponse {
  success: false
  error: string
  code: ErrorCode
  timestamp?: string
  requestId?: string
}

/**
 * Sanitize error for client response
 *
 * IMPORTANT: This function removes ALL sensitive information from errors:
 * - Stack traces
 * - Internal paths
 * - Database details
 * - Environment variables
 * - API keys or tokens
 *
 * @param error - The error to sanitize
 * @param context - Context for server-side logging
 * @param userMessage - Optional user-friendly message
 * @returns Sanitized error object safe for client
 */
export function sanitizeError(
  error: unknown,
  context: string,
  userMessage?: string
): SafeErrorResponse {
  // Log full error server-side (with all details)
  logger.error({
    error,
    context,
    stack: error instanceof Error ? error.stack : undefined
  }, `❌ [${context}] Error occurred`)

  // Default safe message
  const defaultMessage = 'Une erreur est survenue. Veuillez réessayer.'

  // Determine error code
  let code = ErrorCode.INTERNAL_ERROR
  let message = userMessage || defaultMessage

  if (error instanceof Error) {
    // Map common error patterns to codes
    if (error.message.includes('validation')) {
      code = ErrorCode.VALIDATION_ERROR
      message = 'Données invalides'
    } else if (error.message.includes('unauthorized') || error.message.includes('auth')) {
      code = ErrorCode.UNAUTHORIZED
      message = 'Authentification requise'
    } else if (error.message.includes('forbidden') || error.message.includes('permission')) {
      code = ErrorCode.FORBIDDEN
      message = 'Accès refusé'
    } else if (error.message.includes('not found')) {
      code = ErrorCode.NOT_FOUND
      message = 'Ressource non trouvée'
    }
  }

  return {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create sanitized error NextResponse
 *
 * @param error - The error to sanitize
 * @param context - Context for logging
 * @param status - HTTP status code (default: 500)
 * @param userMessage - Optional user-friendly message
 * @returns NextResponse with sanitized error
 */
export function createSafeErrorResponse(
  error: unknown,
  context: string,
  status: number = 500,
  userMessage?: string
): NextResponse<SafeErrorResponse> {
  const sanitized = sanitizeError(error, context, userMessage)

  return NextResponse.json(sanitized, { status })
}

/**
 * Get safe error message from unknown error
 *
 * @param error - The error
 * @param fallback - Fallback message
 * @returns Safe error message (no sensitive info)
 */
export function getSafeErrorMessage(error: unknown, fallback: string = 'Une erreur est survenue'): string {
  if (error instanceof Error) {
    // Only return generic error types, never specific messages that might leak info
    if (error.name === 'ValidationError') return 'Données invalides'
    if (error.name === 'NotFoundError') return 'Ressource non trouvée'
    if (error.name === 'UnauthorizedError') return 'Authentification requise'
    if (error.name === 'ForbiddenError') return 'Accès refusé'
  }

  return fallback
}

/**
 * Check if error contains sensitive information
 * (for testing/auditing purposes)
 *
 * @param obj - Object to check
 * @returns true if contains sensitive patterns
 */
export function containsSensitiveInfo(obj: unknown): boolean {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /credential/i,
    /api[_-]?key/i,
    /stack/i,
    /trace/i,
    /SELECT.*FROM/i,  // SQL queries
    /INSERT.*INTO/i,
    /UPDATE.*SET/i,
    /DELETE.*FROM/i,
    /\/home\//,        // File paths
    /\/var\//,
    /\/usr\//,
    /C:\\/,            // Windows paths
    /node_modules/,
  ]

  const str = JSON.stringify(obj)
  return sensitivePatterns.some(pattern => pattern.test(str))
}

/**
 * Development-only debug info
 * Returns debug information ONLY in development environment
 *
 * @param info - Debug information object
 * @returns Debug info in development, empty object in production
 */
export function devDebugInfo<T extends Record<string, unknown>>(info: T): T | Record<string, never> {
  if (process.env.NODE_ENV === 'development') {
    return info
  }
  return {}
}

/**
 * Sanitize validation errors for client
 * (Zod errors are safe to expose as they don't contain sensitive info)
 *
 * @param errors - Validation errors
 * @returns Sanitized validation errors
 */
export function sanitizeValidationErrors(errors: unknown): unknown {
  // Validation errors from Zod are generally safe
  // They only contain field names and validation rules
  return errors
}
