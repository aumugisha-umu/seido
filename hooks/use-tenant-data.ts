"use client"

import { useState, useEffect } from 'react'
import { tenantService } from '@/lib/database-service'
import { useAuth } from './use-auth'

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
  const [tenantData, setTenantData] = useState<TenantData | null>(null)
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null)
  const [tenantInterventions, setTenantInterventions] = useState<TenantIntervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!user?.id || user.role !== 'locataire') {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch all tenant data in parallel
        const [data, stats, interventions] = await Promise.all([
          tenantService.getTenantData(user.id),
          tenantService.getTenantStats(user.id),
          tenantService.getTenantInterventions(user.id)
        ])

        setTenantData(data)
        setTenantStats(stats)
        setTenantInterventions(interventions)
      } catch (err) {
        console.error('Error fetching tenant data:', err)
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchTenantData()
  }, [user])

  const refreshData = async () => {
    if (!user?.id || user.role !== 'locataire') return

    try {
      setError(null)
      
      const [data, stats, interventions] = await Promise.all([
        tenantService.getTenantData(user.id),
        tenantService.getTenantStats(user.id),
        tenantService.getTenantInterventions(user.id)
      ])

      setTenantData(data)
      setTenantStats(stats)
      setTenantInterventions(interventions)
    } catch (err) {
      console.error('Error refreshing tenant data:', err)
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
