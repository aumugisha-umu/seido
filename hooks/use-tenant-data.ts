"use client"

import { useState, useEffect } from 'react'
import { createTenantService } from '@/lib/services'
import { useAuth } from './use-auth'
import { useResolvedUserId } from './use-resolved-user-id'
import { logger, logError } from '@/lib/logger'
interface TenantData {
  id: string
  reference: string
  floor?: number
  apartment_number?: string
  surface_area?: number
  rooms?: number
  charges_amount?: number
  category?: string
  building?: {
    id: string
    name: string
    address: string
    city: string
    postal_code: string
    description?: string
  } | null
}

interface TenantStats {
  openRequests: number
  inProgress: number
  thisMonthInterventions: number
  documentsCount: number
  nextPaymentDate: number
}

interface TenantIntervention {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  completed_date?: string
  urgency: string
  type: string
  lot?: {
    reference: string
    building?: {
      name: string
    }
  }
  assigned_contact?: {
    name: string
    phone: string
    email: string
  }
}

export const useTenantData = () => {
  const { user } = useAuth()
  const resolvedUserId = useResolvedUserId(user?.id)
  const [tenantData, setTenantData] = useState<TenantData | null>(null)
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null)
  const [tenantInterventions, setTenantInterventions] = useState<TenantIntervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTenantData = async () => {
      // Attendre la résolution du user ID (JWT → UUID)
      if (!resolvedUserId || !user || user.role !== 'locataire') {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        logger.info('📊 [useTenantData] Fetching tenant data', {
          originalUserId: user.id,
          resolvedUserId
        })

        // Fetch all tenant data in parallel avec l'ID résolu
        const tenantService = createTenantService()
        const [data, stats, interventions] = await Promise.all([
          tenantService.getTenantData(resolvedUserId),
          tenantService.getTenantStats(resolvedUserId),
          tenantService.getTenantInterventions(resolvedUserId)
        ])

        setTenantData(data)
        setTenantStats(stats)
        setTenantInterventions(interventions)
      } catch (err) {
        logger.error('Error fetching tenant data:', err)
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchTenantData()
  }, [resolvedUserId, user])

  const refreshData = async () => {
    // Utiliser l'ID résolu pour le refresh également
    if (!resolvedUserId || !user || user.role !== 'locataire') return

    try {
      setError(null)

      logger.info('🔄 [useTenantData] Refreshing tenant data', {
        originalUserId: user.id,
        resolvedUserId
      })

      const tenantService = createTenantService()
      const [data, stats, interventions] = await Promise.all([
        tenantService.getTenantData(resolvedUserId),
        tenantService.getTenantStats(resolvedUserId),
        tenantService.getTenantInterventions(resolvedUserId)
      ])

      setTenantData(data)
      setTenantStats(stats)
      setTenantInterventions(interventions)
    } catch (err) {
      logger.error('Error refreshing tenant data:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  return {
    tenantData,
    tenantStats,
    tenantInterventions,
    loading,
    error,
    refreshData
  }
}
