/**
 * Error Formatter Utility
 * Safely extracts error messages from any error type for UI display
 */

/**
 * Supabase PostgrestError structure
 */
interface PostgrestError {
  code: string
  message: string
  details: string | null
}

/**
 * Safely extracts error message from any error type
 * Handles: strings, Error objects, Supabase errors {code, message, details}
 *
 * @param error - The error to extract message from (can be any type)
 * @param fallback - Default message if extraction fails
 * @returns A string safe to pass to toast.error() or display in UI
 *
 * @example
 * // With Supabase error
 * toast.error(formatErrorMessage(result.error, 'Erreur de sauvegarde'))
 *
 * @example
 * // In catch block
 * catch (error) {
 *   toast.error(formatErrorMessage(error))
 * }
 */
export function formatErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue'
): string {
  // Already a string - return as is
  if (typeof error === 'string') {
    return error
  }

  // Standard JavaScript Error
  if (error instanceof Error) {
    return error.message
  }

  // Supabase PostgrestError or similar object with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as PostgrestError).message
    return typeof msg === 'string' ? msg : fallback
  }

  // Unknown type - return fallback
  return fallback
}

/**
 * Type guard to check if an error is a Supabase PostgrestError
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as PostgrestError).code === 'string' &&
    typeof (error as PostgrestError).message === 'string'
  )
}
