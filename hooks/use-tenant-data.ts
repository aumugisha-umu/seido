"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createBrowserSupabaseClient, createTenantService } from '@/lib/services'
import { useAuth } from './use-auth'
import { useResolvedUserId } from './use-resolved-user-id'
import { logger } from '@/lib/logger'
import type { TenantContractStatus } from '@/lib/services/domain/tenant.service'
import { transformTenantLotForClient } from '@/lib/utils/tenant-transform'

export interface TenantData {
  id: string
  contractContactId?: string
  reference: string
  floor?: number
  apartment_number?: string
  description?: string
  surface_area?: number
  rooms?: number
  charges_amount?: number
  category?: string
  building?: {
    id: string
    name: string
    description?: string
    // Address from address_record (joined from addresses table)
    address_record?: {
      street?: string
      city?: string
      postal_code?: string
      formatted_address?: string
    } | null
  } | null
  is_primary?: boolean
  // Contract data for Property Info Card
  contract?: {
    start_date?: string
    end_date?: string
    rent_amount?: number
    charges_amount?: number
    status?: 'actif' | 'a_venir'
  }
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
    id?: string
    reference: string
    building?: {
      id?: string
      name: string
    }
  }
  // ✅ Building direct pour interventions building-level (sans lot_id)
  building?: {
    id: string
    name: string
    address?: string
  } | null
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
  const [contractStatus, setContractStatus] = useState<TenantContractStatus>('none')

  // Utiliser des refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  const lastResolvedIdRef = useRef<string | null>(null)

  const fetchTenantData = useCallback(async (bypassCache = false) => {
    // Si user n'est pas encore chargé, attendre
    if (!user) return

    // Si l'utilisateur n'est pas un locataire, arrêter
    if (user.role !== 'locataire') {
      setLoading(false)
      return
    }

    // Attendre la résolution du user ID (JWT → UUID)
    if (!resolvedUserId) return

    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) return

    // Éviter les refetch pour le même resolvedUserId
    if (lastResolvedIdRef.current === resolvedUserId && !bypassCache) return

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      // ✅ Session gérée par AuthProvider + use-session-keepalive.ts
      // Pas besoin de vérification défensive ici

      // Fetch all tenant data avec l'ID résolu
      const tenantService = createTenantService()
      const data = await tenantService.getTenantData(resolvedUserId)

      if (!data) {
        throw new Error('Failed to fetch tenant data')
      }

      // Extract tenant lot data (primary lot)
      const primaryLot = data.lots.find(l => l.is_primary)?.lot || data.lots[0]?.lot

      // ✅ Utiliser la fonction utilitaire centralisée pour la transformation
      // Cela garantit la cohérence avec locataire-dashboard.tsx (SSR)
      const transformedTenantProperties: TenantData[] = data.lots.map((item: any) =>
        transformTenantLotForClient(item)
      )

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
          ['planifiee', 'approuvee', 'planification'].includes(i.status)
        ).length,
        thisMonthInterventions: rawInterventions.filter((i: RawIntervention) => {
          const createdDate = new Date(i.created_at)
          return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear
        }).length,
        documentsCount: 0, // TODO: implement document count
        nextPaymentDate: 0 // TODO: implement payment date
      }

      // Enrichir les interventions avec quotes, slots et assignments
      // ✅ Batch queries au lieu de N+1 (3 queries totales au lieu de 3*N)
      const supabase = createBrowserSupabaseClient()
      const interventionIds = rawInterventions.map((i: RawIntervention) => i.id)

      // Skip si aucune intervention
      if (interventionIds.length === 0) {
        const interventionsWithDetails: EnrichedIntervention[] = []
        // Transform interventions (empty array)
        const transformedInterventions: TenantIntervention[] = []

        if (mountedRef.current) {
          setTenantData(transformedTenantData)
          setTenantProperties(transformedTenantProperties)
          setTenantStats(transformedStats)
          setTenantInterventions(transformedInterventions)
          setContractStatus(data.contractStatus || 'none')
          lastResolvedIdRef.current = resolvedUserId
        }
        return
      }

      // 3 batch queries au lieu de 3*N queries
      const [
        { data: allQuotes },
        { data: allTimeSlots },
        { data: allAssignments }
      ] = await Promise.all([
        supabase
          .from('intervention_quotes')
          .select('id, status, provider_id, created_by, amount, intervention_id')
          .in('intervention_id', interventionIds)
          .is('deleted_at', null),
        supabase
          .from('intervention_time_slots')
          .select('id, slot_date, start_time, status, proposed_by, intervention_id')
          .in('intervention_id', interventionIds),
        supabase
          .from('intervention_assignments')
          .select('role, user_id, is_primary, intervention_id')
          .in('intervention_id', interventionIds)
      ])

      // Mapper les résultats par intervention_id pour accès O(1)
      const quotesMap = new Map<string, Array<{ id: string; status: string; provider_id?: string; created_by?: string; amount?: number }>>()
      const slotsMap = new Map<string, Array<{ id: string; slot_date: string; start_time: string; status?: string; proposed_by?: string }>>()
      const assignmentsMap = new Map<string, Array<{ role: string; user_id: string; is_primary: boolean }>>()

      allQuotes?.forEach(q => {
        const existing = quotesMap.get(q.intervention_id) || []
        quotesMap.set(q.intervention_id, [...existing, { id: q.id, status: q.status, provider_id: q.provider_id ?? undefined, created_by: q.created_by ?? undefined, amount: q.amount ?? undefined }])
      })
      allTimeSlots?.forEach(s => {
        const existing = slotsMap.get(s.intervention_id) || []
        slotsMap.set(s.intervention_id, [...existing, { id: s.id, slot_date: s.slot_date, start_time: s.start_time, status: s.status ?? undefined, proposed_by: s.proposed_by ?? undefined }])
      })
      allAssignments?.forEach(a => {
        const existing = assignmentsMap.get(a.intervention_id) || []
        assignmentsMap.set(a.intervention_id, [...existing, { role: a.role, user_id: a.user_id, is_primary: a.is_primary }])
      })

      // Enrichir les interventions avec les données mappées (O(N) au lieu de O(N*M))
      const interventionsWithDetails: EnrichedIntervention[] = rawInterventions.map((i: RawIntervention) => ({
        ...i,
        quotes: quotesMap.get(i.id) || [],
        timeSlots: slotsMap.get(i.id) || [],
        assignments: assignmentsMap.get(i.id) || []
      }))

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
        building: (i as any).building || null,  // ✅ Building direct pour interventions building-level
        assigned_contact: i.assigned_contact,
        quotes: i.quotes || [],
        timeSlots: i.timeSlots || [],
        assignments: i.assignments || []
      }))

      if (mountedRef.current) {
        setTenantData(transformedTenantData)
        setTenantProperties(transformedTenantProperties)
        setTenantStats(transformedStats)
        setTenantInterventions(transformedInterventions)
        setContractStatus(data.contractStatus || 'none')
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
    lastResolvedIdRef.current = null
    loadingRef.current = false
    await fetchTenantData(true)
  }, [fetchTenantData])

  return {
    tenantData,
    tenantProperties,
    tenantStats,
    tenantInterventions,
    contractStatus,
    loading,
    error,
    refreshData
  }
}
