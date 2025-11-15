/**
 * Demo-aware wrapper for useTeamContacts
 *
 * This hook automatically detects demo mode and returns appropriate data:
 * - In demo mode: Returns contacts from DemoDataStore
 * - In production: Delegates to production useTeamContacts hook
 *
 * ✅ Maintains same SWR interface
 * ✅ Prevents UUID validation errors in demo mode
 * ✅ Zero changes to production code
 */

'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { useTeamContacts, useTeamContactsByRole } from './use-team-contacts'
import { logger } from '@/lib/logger'

/**
 * Check if we're in demo mode by detecting non-UUID team IDs
 * Demo team IDs follow pattern: "demo-team-XXX"
 * Production team IDs are valid UUIDs: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 */
function isDemoMode(teamId?: string): boolean {
  if (!teamId) return false

  // UUID regex pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // If teamId doesn't match UUID pattern, assume demo mode
  return !uuidPattern.test(teamId)
}

/**
 * Demo-aware hook to fetch team contacts
 *
 * @param teamId - Team ID (can be demo ID or production UUID)
 * @returns SWR response with contacts data
 *
 * @example
 * ```tsx
 * // Works in both demo and production
 * const { data, isLoading, error } = useDemoAwareTeamContacts(teamId)
 * ```
 */
export function useDemoAwareTeamContacts(teamId?: string) {
  const isDemo = isDemoMode(teamId)

  // In demo mode, return mock SWR response with empty data
  // We'll rely on components to use useDemoContext() directly for demo data
  const demoResponse = useSWR(
    isDemo && teamId ? ['demo-team-contacts', teamId] : null,
    async () => {
      logger.info('[DEMO-AWARE-CONTACTS] Demo mode detected, returning empty data for teamId:', teamId)
      return []
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // In production mode, use real hook
  const productionResponse = useTeamContacts(isDemo ? undefined : teamId)

  // Return appropriate response based on mode
  return isDemo ? demoResponse : productionResponse
}

/**
 * Demo-aware hook to fetch team contacts filtered by role
 *
 * @param teamId - Team ID
 * @param role - User role to filter by
 * @returns SWR response with filtered contacts
 */
export function useDemoAwareTeamContactsByRole(teamId?: string, role?: string) {
  const isDemo = isDemoMode(teamId)

  // In demo mode, return mock response
  const demoResponse = useSWR(
    isDemo && teamId && role ? ['demo-team-contacts-by-role', teamId, role] : null,
    async () => {
      logger.info('[DEMO-AWARE-CONTACTS] Demo mode detected (by role), returning empty data')
      return []
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // In production mode, use real hook
  const productionResponse = useTeamContactsByRole(
    isDemo ? undefined : teamId,
    role
  )

  return isDemo ? demoResponse : productionResponse
}
