/**
 * Form Persistence Hooks
 *
 * Provides utilities to save and restore form state using sessionStorage.
 * Used when redirecting to external flows (e.g., contact creation) and returning.
 *
 * Features:
 * - Automatic state serialization/deserialization
 * - Unique session keys per form instance
 * - Automatic cleanup of expired sessions (>1h)
 * - Type-safe state management
 */

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { logger } from '@/lib/logger'

// Session storage key prefix
const STORAGE_PREFIX = 'form-state-'
const SESSION_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

/**
 * Interface for saved form state
 */
export interface SavedFormState<T = any> {
  version: string
  timestamp: number
  expiresAt: number
  data: T
}

/**
 * Generate a unique session key
 */
export function generateSessionKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Save form state to sessionStorage
 *
 * @param key - Unique session key
 * @param state - Form state to save
 * @returns Success boolean
 */
export function saveFormState<T>(key: string, state: T): boolean {
  try {
    const savedState: SavedFormState<T> = {
      version: '1.0',
      timestamp: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRY_MS,
      data: state,
    }

    sessionStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify(savedState)
    )

    logger.info(`✅ [FORM-PERSISTENCE] State saved with key: ${key}`)
    return true
  } catch (error) {
    logger.error(`❌ [FORM-PERSISTENCE] Failed to save state:`, error)
    return false
  }
}

/**
 * Load form state from sessionStorage
 *
 * @param key - Unique session key
 * @returns Saved state or null if not found/expired
 */
export function loadFormState<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw) {
      logger.info(`ℹ️ [FORM-PERSISTENCE] No saved state found for key: ${key}`)
      return null
    }

    const savedState: SavedFormState<T> = JSON.parse(raw)

    // Check expiry
    if (Date.now() > savedState.expiresAt) {
      logger.warn(`⏱️ [FORM-PERSISTENCE] Saved state expired for key: ${key}`)
      sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`)
      return null
    }

    logger.info(`✅ [FORM-PERSISTENCE] State loaded from key: ${key}`)
    return savedState.data
  } catch (error) {
    logger.error(`❌ [FORM-PERSISTENCE] Failed to load state:`, error)
    return null
  }
}

/**
 * Delete saved form state
 *
 * @param key - Unique session key
 */
export function clearFormState(key: string): void {
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`)
    logger.info(`🗑️ [FORM-PERSISTENCE] State cleared for key: ${key}`)
  } catch (error) {
    logger.error(`❌ [FORM-PERSISTENCE] Failed to clear state:`, error)
  }
}

/**
 * Cleanup expired sessions
 * Removes all sessions older than 1 hour
 */
export function cleanupExpiredSessions(): void {
  try {
    const keysToRemove: string[] = []
    const now = Date.now()

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue

      try {
        const raw = sessionStorage.getItem(key)
        if (!raw) continue

        const savedState: SavedFormState = JSON.parse(raw)
        if (now > savedState.expiresAt) {
          keysToRemove.push(key)
        }
      } catch {
        // Invalid JSON, remove it
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => sessionStorage.removeItem(key))

    if (keysToRemove.length > 0) {
      logger.info(`🧹 [FORM-PERSISTENCE] Cleaned up ${keysToRemove.length} expired sessions`)
    }
  } catch (error) {
    logger.error(`❌ [FORM-PERSISTENCE] Failed to cleanup expired sessions:`, error)
  }
}

/**
 * Hook to save form state before redirect
 *
 * @param state - Current form state
 * @returns Function to trigger save and redirect
 */
export function useSaveFormState<T>(state: T) {
  const router = useRouter()

  const saveAndRedirect = useCallback((redirectUrl: string, queryParams?: Record<string, string>) => {
    // Generate unique session key
    const sessionKey = generateSessionKey()

    // Save state
    const success = saveFormState(sessionKey, state)
    if (!success) {
      logger.error(`❌ [FORM-PERSISTENCE] Failed to save state before redirect`)
      return false
    }

    // Build redirect URL with session key
    const url = new URL(redirectUrl, window.location.origin)
    url.searchParams.set('sessionKey', sessionKey)

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    // Add return URL
    url.searchParams.set('returnUrl', window.location.pathname)

    logger.info(`🚀 [FORM-PERSISTENCE] Redirecting with sessionKey: ${sessionKey}`)
    router.push(url.pathname + url.search)

    return true
  }, [state, router])

  return { saveAndRedirect }
}

/**
 * Hook to restore form state after redirect
 *
 * @param onRestore - Callback to apply restored state
 * @returns Restored state and cleanup function
 */
export function useRestoreFormState<T>(onRestore: (state: T) => void) {
  const searchParams = useSearchParams()
  const hasRestored = useRef(false)

  useEffect(() => {
    // Only restore once
    if (hasRestored.current) return

    // Check for session key in URL
    const sessionKey = searchParams.get('sessionKey')
    if (!sessionKey) {
      logger.info(`ℹ️ [FORM-PERSISTENCE] No sessionKey in URL, skipping restore`)
      return
    }

    // Check for new contact ID (successful creation)
    const newContactId = searchParams.get('newContactId')
    const cancelled = searchParams.get('cancelled')

    logger.info(`📥 [FORM-PERSISTENCE] Attempting to restore state with key: ${sessionKey}`)
    logger.info(`📥 [FORM-PERSISTENCE] newContactId: ${newContactId}, cancelled: ${cancelled}`)

    // Load state
    const savedState = loadFormState<T>(sessionKey)
    if (!savedState) {
      logger.warn(`⚠️ [FORM-PERSISTENCE] No state found for key: ${sessionKey}`)
      return
    }

    // Restore state
    onRestore(savedState)
    hasRestored.current = true

    // Cleanup: Remove session key from URL and sessionStorage
    clearFormState(sessionKey)

    // Cleanup expired sessions
    cleanupExpiredSessions()

    logger.info(`✅ [FORM-PERSISTENCE] State restored successfully`)
  }, [searchParams, onRestore])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupExpiredSessions()
    }
  }, [])

  return {
    newContactId: searchParams.get('newContactId'),
    cancelled: searchParams.get('cancelled') === 'true',
    sessionKey: searchParams.get('sessionKey'),
  }
}
