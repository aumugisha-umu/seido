'use client'

import { useState, useEffect } from 'react'
import { createInterventionService } from '@/lib/services'
import { logger } from '@/lib/logger'

interface UseInterventionsReturn {
  interventions: any[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to load all interventions for the current user's team
 *
 * This hook directly calls the intervention service (bypassing stats service)
 * to ensure all interventions (lot-based AND building-wide) are loaded.
 *
 * Uses the same approach as the dashboard for consistency.
 */
export function useInterventions(): UseInterventionsReturn {
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInterventions = async () => {
    try {
      setLoading(true)
      setError(null)

      logger.info('🔄 [useInterventions] Loading interventions...')

      // Create browser-side intervention service
      const interventionService = createInterventionService()

      // Load all interventions (same as dashboard approach)
      const result = await interventionService.getAll({ limit: 100 })

      if (result.success && result.data) {
        setInterventions(result.data)
        logger.info('✅ [useInterventions] Loaded interventions:', result.data.length)
      } else {
        const errorMsg = result.error || 'Failed to load interventions'
        setError(errorMsg)
        logger.error('❌ [useInterventions] Error:', errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      logger.error('❌ [useInterventions] Exception:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInterventions()
  }, [])

  return {
    interventions,
    loading,
    error,
    refetch: loadInterventions
  }
}
