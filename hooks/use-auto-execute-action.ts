'use client'

/**
 * useAutoExecuteAction - Hook for auto-executing actions from email magic links
 *
 * This hook enables interactive email buttons by:
 * 1. Detecting pending actions in the URL (from email callback redirect)
 * 2. Executing the action via existing APIs
 * 3. Showing feedback to the user
 * 4. Cleaning up the URL
 *
 * Architecture:
 * - Email CTA button → Magic link with action params
 * - /auth/email-callback verifies OTP + encodes action in base64url
 * - Client page uses this hook to auto-execute the action
 *
 * @example
 * ```tsx
 * // In intervention detail page
 * useAutoExecuteAction({
 *   interventionId: intervention.id,
 *   handlers: {
 *     confirm_slot: async ({ slotId }) => {
 *       await selectTimeSlotAction(interventionId, slotId)
 *     },
 *     validate_intervention: async ({ type }) => {
 *       if (type === 'approve') {
 *         await validateByTenantAction(interventionId)
 *       }
 *     }
 *   }
 * })
 * ```
 *
 * @see /app/auth/email-callback/route.ts - Action encoding
 * @see /lib/services/domain/magic-link.service.ts - Link generation
 */

import { useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

/**
 * Supported action types for email interactivity
 */
export type EmailActionType =
  | 'confirm_slot'        // Locataire accepts a proposed time slot
  | 'reject_slot'         // Locataire/Prestataire rejects a time slot
  | 'validate_intervention' // Locataire validates completed work
  | 'submit_quick_estimate' // Prestataire submits quick estimate
  | 'accept_time_slot'    // Prestataire accepts proposed slot

/**
 * Action parameters by action type
 */
export interface ActionParams {
  confirm_slot: { slotId: string }
  reject_slot: { slotId: string }
  validate_intervention: { type: 'approve' | 'contest' }
  submit_quick_estimate: { amount: string; quoteId?: string }
  accept_time_slot: { slotId: string }
}

/**
 * Decoded pending action from URL
 */
export interface PendingAction<T extends EmailActionType = EmailActionType> {
  action: T
  params: ActionParams[T]
}

/**
 * Handler function type for each action
 */
export type ActionHandler<T extends EmailActionType> = (
  params: ActionParams[T]
) => Promise<void>

/**
 * Configuration for useAutoExecuteAction hook
 */
export interface AutoExecuteConfig {
  /** ID of the intervention (for context validation) */
  interventionId: string

  /** Handler functions for each action type */
  handlers: Partial<{
    [K in EmailActionType]: ActionHandler<K>
  }>

  /** Whether to auto-execute on mount (default: true) */
  autoExecute?: boolean

  /** Custom success message (default: "Action effectuée avec succès") */
  successMessage?: string

  /** Custom error message prefix (default: "Erreur lors de l'action") */
  errorMessagePrefix?: string

  /** Callback after successful execution */
  onSuccess?: (action: EmailActionType) => void

  /** Callback after failed execution */
  onError?: (action: EmailActionType, error: Error) => void
}

/**
 * Return type for the hook
 */
export interface AutoExecuteResult {
  /** Whether an action is currently being executed */
  isExecuting: boolean

  /** The pending action if any (before execution) */
  pendingAction: PendingAction | null

  /** Manually trigger action execution */
  executeAction: () => Promise<void>

  /** Clear the pending action without executing */
  clearAction: () => void
}

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════

const PENDING_ACTION_PARAM = 'pending_action'

/** Action labels for user feedback */
const ACTION_LABELS: Record<EmailActionType, string> = {
  confirm_slot: 'Confirmation du créneau',
  reject_slot: 'Refus du créneau',
  validate_intervention: 'Validation de l\'intervention',
  submit_quick_estimate: 'Soumission de l\'estimation',
  accept_time_slot: 'Acceptation du créneau'
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/**
 * Convert base64url to standard base64
 * base64url uses - instead of + and _ instead of /
 */
function base64UrlToBase64(base64url: string): string {
  // Replace URL-safe characters with standard base64 characters
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding if needed
  const padding = base64.length % 4
  if (padding) {
    base64 += '='.repeat(4 - padding)
  }
  return base64
}

/**
 * Decode pending action from base64url encoded string
 * Uses browser-compatible atob() instead of Node.js Buffer
 */
function decodePendingAction(encoded: string): PendingAction | null {
  try {
    // Convert base64url to standard base64, then decode
    const base64 = base64UrlToBase64(encoded)
    const jsonString = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const parsed = JSON.parse(jsonString)

    // Validate structure
    if (!parsed.action || typeof parsed.action !== 'string') {
      logger.warn({ encoded }, '[AUTO-EXECUTE] Invalid action structure: missing action')
      return null
    }

    if (!parsed.params || typeof parsed.params !== 'object') {
      logger.warn({ encoded }, '[AUTO-EXECUTE] Invalid action structure: missing params')
      return null
    }

    logger.debug({ action: parsed.action, params: parsed.params }, '[AUTO-EXECUTE] Action decoded successfully')

    return {
      action: parsed.action as EmailActionType,
      params: parsed.params
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown', encoded },
      '[AUTO-EXECUTE] Failed to decode pending action'
    )
    return null
  }
}

/**
 * Remove pending_action param from URL without page reload
 */
function cleanUrl(pathname: string, searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams.toString())
  params.delete(PENDING_ACTION_PARAM)

  const queryString = params.toString()
  return queryString ? `${pathname}?${queryString}` : pathname
}

// ══════════════════════════════════════════════════════════════
// Main Hook
// ══════════════════════════════════════════════════════════════

/**
 * Hook to auto-execute actions from email magic links
 *
 * Detects pending actions in the URL, executes them via provided handlers,
 * shows appropriate feedback, and cleans up the URL.
 */
export function useAutoExecuteAction(config: AutoExecuteConfig): AutoExecuteResult {
  const {
    interventionId,
    handlers,
    autoExecute = true,
    successMessage,
    errorMessagePrefix = 'Erreur lors de l\'action',
    onSuccess,
    onError
  } = config

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Prevent double execution
  const executedRef = useRef(false)
  const isExecutingRef = useRef(false)

  // Decode pending action from URL
  const pendingActionEncoded = searchParams.get(PENDING_ACTION_PARAM)
  const pendingAction = pendingActionEncoded
    ? decodePendingAction(pendingActionEncoded)
    : null

  /**
   * Clean the URL by removing the pending_action parameter
   */
  const clearAction = useCallback(() => {
    if (!pendingActionEncoded) return

    const cleanedUrl = cleanUrl(pathname, searchParams)
    router.replace(cleanedUrl, { scroll: false })

    logger.debug('[AUTO-EXECUTE] URL cleaned')
  }, [pathname, searchParams, router, pendingActionEncoded])

  /**
   * Execute the pending action
   */
  const executeAction = useCallback(async () => {
    // Prevent double execution
    if (executedRef.current || isExecutingRef.current || !pendingAction) {
      return
    }

    isExecutingRef.current = true
    executedRef.current = true

    const { action, params } = pendingAction
    const handler = handlers[action] as ActionHandler<typeof action> | undefined

    logger.info(
      { interventionId, action, params },
      '[AUTO-EXECUTE] Executing email action'
    )

    // Check if handler exists
    if (!handler) {
      logger.warn(
        { action },
        '[AUTO-EXECUTE] No handler for action type'
      )
      toast.error(`Action non supportée: ${action}`)
      clearAction()
      isExecutingRef.current = false
      return
    }

    // Show loading toast
    const actionLabel = ACTION_LABELS[action] || action
    const loadingToast = toast.loading(`${actionLabel} en cours...`)

    try {
      // Execute the handler
      await handler(params as any)

      // Success feedback
      toast.dismiss(loadingToast)
      toast.success(successMessage || `${actionLabel} effectuée avec succès`)

      logger.info(
        { interventionId, action },
        '[AUTO-EXECUTE] Action executed successfully'
      )

      onSuccess?.(action)

    } catch (error) {
      // Error feedback
      toast.dismiss(loadingToast)

      const errorMessage = error instanceof Error
        ? error.message
        : 'Une erreur est survenue'

      toast.error(`${errorMessagePrefix}: ${errorMessage}`)

      logger.error(
        { interventionId, action, error: errorMessage },
        '[AUTO-EXECUTE] Action execution failed'
      )

      onError?.(action, error instanceof Error ? error : new Error(errorMessage))

    } finally {
      // Always clean the URL
      clearAction()
      isExecutingRef.current = false
    }
  }, [
    pendingAction,
    handlers,
    interventionId,
    successMessage,
    errorMessagePrefix,
    onSuccess,
    onError,
    clearAction
  ])

  /**
   * Auto-execute on mount if enabled
   */
  useEffect(() => {
    if (autoExecute && pendingAction && !executedRef.current) {
      // Small delay to ensure page is fully rendered
      const timer = setTimeout(() => {
        executeAction()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [autoExecute, pendingAction, executeAction])

  // Reset executed ref when pending action changes (for manual re-execution)
  useEffect(() => {
    if (!pendingActionEncoded) {
      executedRef.current = false
    }
  }, [pendingActionEncoded])

  return {
    isExecuting: isExecutingRef.current,
    pendingAction,
    executeAction,
    clearAction
  }
}

// ══════════════════════════════════════════════════════════════
// Utility Functions (for email callback)
// ══════════════════════════════════════════════════════════════

/**
 * Encode action and params for URL transfer
 * Used by email-callback route to pass action to client
 */
export function encodeActionForUrl(action: EmailActionType, params: Record<string, string>): string {
  const payload = { action, params }
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

/**
 * Check if an action type is valid
 */
export function isValidActionType(action: string): action is EmailActionType {
  return ['confirm_slot', 'reject_slot', 'validate_intervention', 'submit_quick_estimate', 'accept_time_slot'].includes(action)
}
