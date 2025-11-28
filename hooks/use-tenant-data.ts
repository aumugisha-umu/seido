"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createBrowserSupabaseClient, createTenantService } from '@/lib/services'
import { useAuth } from './use-auth'
import { useResolvedUserId } from './use-resolved-user-id'
import { logger, logError } from '@/lib/logger'
export interface TenantData {
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
  is_primary?: boolean
}

export interface TenantStats {
  openRequests: number
  inProgress: number
  thisMonthInterventions: number
  documentsCount: number
  nextPaymentDate: number
}

// ✅ Type pour les interventions brutes du service
export interface RawIntervention {
  id: string
  title: string
  description?: string
  status: string
  created_at: string
  completed_date?: string
  urgency?: string
  intervention_type?: string
  type?: string
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

// ✅ Type enrichi avec quotes/slots/assignments
export interface EnrichedIntervention extends RawIntervention {
  quotes: Array<{ id: string; status: string; provider_id?: string; created_by?: string; amount?: number }>
  timeSlots: Array<{ id: string; slot_date: string; start_time: string; status?: string; proposed_by?: string }>
  assignments: Array<{ role: string; user_id: string; is_primary: boolean }>
}

export interface TenantIntervention {
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
  // ✅ Enriched data for interactive badge
  quotes?: Array<{
    id: string
    status: string
    provider_id?: string
    submitted_by?: string
    amount?: number
  }>
  timeSlots?: Array<{
    id: string
    slot_date: string
    start_time: string
    status?: string
    proposed_by?: string
  }>
  assignments?: Array<{
    role: string
    user_id: string
    is_primary: boolean
  }>
}

export const useTenantData = () => {
  const { user } = useAuth()
  const resolvedUserId = useResolvedUserId(user?.id)
  const [tenantData, setTenantData] = useState<TenantData | null>(null)
  const [tenantProperties, setTenantProperties] = useState<TenantData[]>([])
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null)
  const [tenantInterventions, setTenantInterventions] = useState<TenantIntervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Utiliser des refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  const lastResolvedIdRef = useRef<string | null>(null)

  const fetchTenantData = useCallback(async (bypassCache = false) => {
    // Attendre la résolution du user ID (JWT → UUID)
    if (!resolvedUserId || !user || user.role !== 'locataire') {
      setLoading(false)
      return
    }

    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      logger.info('🔒 [TENANT-DATA] Skipping fetch - already loading or unmounted')
      return
    }

    // Éviter les refetch pour le même resolvedUserId
    if (lastResolvedIdRef.current === resolvedUserId && !bypassCache) {
      logger.info('🔒 [TENANT-DATA] Skipping fetch - same resolvedUserId')
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      logger.info('📊 [TENANT-DATA] Fetching tenant data', {
        originalUserId: user.id,
        resolvedUserId,
        bypassCache
      })

      // ✅ Initialiser le client Supabase et s'assurer que la session est prête
      const supabase = createBrowserSupabaseClient()
      try {
        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr || !sessionRes?.session) {
          logger.warn('⚠️ [TENANT-DATA] Session issue, attempting refresh...')
          await supabase.auth.refreshSession()
        }
      } catch (sessionError) {
        logger.warn('⚠️ [TENANT-DATA] Session check failed:', sessionError)
        // Continue anyway - let the service handle it
      }

      // Fetch all tenant data avec l'ID résolu
      const tenantService = createTenantService()
      const data = await tenantService.getTenantData(resolvedUserId)

      if (!data) {
        throw new Error('Failed to fetch tenant data')
      }

      // Extract tenant lot data (primary lot)
      const primaryLot = data.lots.find(l => l.is_primary)?.lot || data.lots[0]?.lot

      // Transform data to match hook interfaces
      const transformedTenantProperties: TenantData[] = data.lots.map((item: any) => ({
        id: item.lot.id,
        reference: item.lot.reference,
        floor: item.lot.floor,
        apartment_number: item.lot.apartment_number,
        surface_area: item.lot.surface_area,
        rooms: item.lot.rooms,
        charges_amount: item.lot.charges_amount,
        category: item.lot.category,
        building: item.lot.building || null,
        is_primary: item.is_primary // Keep track of primary status if needed
      }))

      const transformedTenantData = transformedTenantProperties.find((p: any) => p.is_primary) || transformedTenantProperties[0] || null

      // Calculate stats from interventions
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()

      // ✅ Cast interventions to typed array
      const rawInterventions = data.interventions as RawIntervention[]

      const transformedStats: TenantStats = {
        openRequests: rawInterventions.filter((i: RawIntervention) => i.status === 'demande').length,
        inProgress: rawInterventions.filter((i: RawIntervention) =>
          ['en_cours', 'planifiee', 'approuvee'].includes(i.status)
        ).length,
        thisMonthInterventions: rawInterventions.filter((i: RawIntervention) => {
          const createdDate = new Date(i.created_at)
          return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear
        }).length,
        documentsCount: 0, // TODO: implement document count
        nextPaymentDate: 0 // TODO: implement payment date
      }

      // ⚡ ENRICHISSEMENT: Ajouter quotes, slots et assignments aux interventions pour le badge interactif
      logger.info('🔄 [TENANT-DATA] Enriching interventions with quotes, slots and assignments...')
      const interventionsWithDetails: EnrichedIntervention[] = await Promise.all(
        rawInterventions.map(async (i: RawIntervention) => {
          const [{ data: quotes }, { data: timeSlots }, { data: assignments }] = await Promise.all([
            supabase
              .from('intervention_quotes')
              .select('id, status, provider_id, created_by, amount')
              .eq('intervention_id', i.id)
              .is('deleted_at', null),
            supabase
              .from('intervention_time_slots')
              .select('id, slot_date, start_time, status, proposed_by')
              .eq('intervention_id', i.id),
            supabase
              .from('intervention_assignments')
              .select('role, user_id, is_primary')
              .eq('intervention_id', i.id)
          ])
          return {
            ...i,
            quotes: quotes || [],
            timeSlots: timeSlots || [],
            assignments: assignments || []
          }
        })
      )
      logger.info('✅ [TENANT-DATA] Interventions enriched with quotes, slots and assignments')

      // Transform interventions
      const transformedInterventions: TenantIntervention[] = interventionsWithDetails.map((i: EnrichedIntervention) => ({
        id: i.id,
        title: i.title,
        description: i.description || '',
        status: i.status,
        created_at: i.created_at,
        completed_date: i.completed_date,
        urgency: i.urgency || 'normale',
        type: i.intervention_type || i.type || 'autre',
        lot: i.lot,
        assigned_contact: i.assigned_contact,
        quotes: i.quotes || [],
        timeSlots: i.timeSlots || [],
        assignments: i.assignments || []
      }))

      if (mountedRef.current) {
        setTenantData(transformedTenantData)
        setTenantProperties(transformedTenantProperties)
        setTenantStats(transformedStats)
        setTenantStats(transformedStats)
        setTenantInterventions(transformedInterventions)
        lastResolvedIdRef.current = resolvedUserId
      }
    } catch (err) {
      logger.error('Error fetching tenant data:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, [resolvedUserId, user])

  useEffect(() => {
    fetchTenantData(false)
  }, [fetchTenantData])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshData = useCallback(async () => {
    logger.info('🔄 [TENANT-DATA] Manual refresh requested')
    lastResolvedIdRef.current = null
    loadingRef.current = false
    await fetchTenantData(true)
  }, [fetchTenantData])

  return {
    tenantData,
    tenantProperties,
    tenantStats,
    tenantInterventions,
    loading,
    error,
    refreshData
  }
}
