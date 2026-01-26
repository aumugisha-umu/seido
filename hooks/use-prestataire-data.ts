"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  createBrowserSupabaseClient,
  createInterventionService,
  createUserService,
  createContactInvitationService
} from "@/lib/services"
import type { Intervention } from "@/lib/services/core/service-types"
import { logger, logError } from '@/lib/logger'
import {
  mapStatusToFrontend,
  mapTypeToFrontend,
  mapUrgencyToPriority
} from '@/lib/utils/intervention-mappers'
export interface PrestataireDashboardStats {
  interventionsEnCours: number
  urgentesCount: number
  terminesCeMois: number
  terminesMoisPrecedent: number
  prochainsRdv: number
  revenusMois: number
  revenusMoisPrecedent: number
}

export interface PrestataireIntervention {
  id: string
  title: string
  description: string
  type: string
  priority: 'basse' | 'normale' | 'haute' | 'urgente'
  status: string  // ✅ Statut DB original pour la logique d'alerte
  displayStatus?: string  // ✅ Statut frontend pour l'affichage
  createdAt: string
  estimatedDuration: string
  location: string
  tenant: string
  requestedBy: string
  needsQuote: boolean
  reference: string
  lot?: unknown
  tenant_details?: unknown
  manager?: unknown
  assigned_contact?: unknown
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

// ✅ Types réutilisables pour les données enrichies
type QuoteData = { id: string; status: string; provider_id?: string; submitted_by?: string; amount?: number }
type TimeSlotData = { id: string; slot_date: string; start_time: string; status?: string; proposed_by?: string }
type AssignmentData = { role: string; user_id: string; is_primary: boolean }

// ✅ Type pour intervention enrichie (après batch queries)
type EnrichedPrestataireIntervention = Intervention & {
  lot?: unknown
  tenant?: unknown
  manager?: unknown
  assigned_contact?: unknown
  quotes?: QuoteData[]
  timeSlots?: TimeSlotData[]
  assignments?: AssignmentData[]
}

export interface UrgentIntervention {
  id: string
  title: string
  location: string
  priority: 'urgent' | 'critique'
  reference: string
}

// ✅ Mapping functions centralisées dans lib/utils/intervention-mappers.ts

export const usePrestataireData = (userId: string) => {
  const [data, setData] = useState<{
    stats: PrestataireDashboardStats
    interventions: PrestataireIntervention[]
    urgentInterventions: UrgentIntervention[]
    loading: boolean
    error: string | null
  }>({
    stats: {
      interventionsEnCours: 0,
      urgentesCount: 0,
      terminesCeMois: 0,
      terminesMoisPrecedent: 0,
      prochainsRdv: 0,
      revenusMois: 0,
      revenusMoisPrecedent: 0
    },
    interventions: [],
    urgentInterventions: [],
    loading: true,
    error: null
  })

  // Utiliser des refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  const lastUserIdRef = useRef<string | null>(null)

  const loadData = useCallback(async (bypassCache = false) => {
    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      logger.info("🔒 [PRESTATAIRE-DATA] Skipping fetch - already loading or unmounted")
      return
    }

    // Éviter les refetch pour le même userId
    if (lastUserIdRef.current === userId && !bypassCache) {
      logger.info("🔒 [PRESTATAIRE-DATA] Skipping fetch - same userId")
      return
    }

    logger.info("📊 Loading prestataire data for user:", userId, bypassCache ? "(bypassing cache)" : "")

    try {
      loadingRef.current = true
      setData(prev => ({ ...prev, loading: true, error: null }))

      // ✅ Initialiser le client Supabase et s'assurer que la session est prête
      const supabase = createBrowserSupabaseClient()
      try {
        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr || !sessionRes?.session) {
          logger.warn('⚠️ [PRESTATAIRE-DATA] Session issue, attempting refresh...')
          await supabase.auth.refreshSession()
        }
      } catch (sessionError) {
        logger.warn('⚠️ [PRESTATAIRE-DATA] Session check failed:', sessionError)
        // Continue anyway - let the service handle it
      }

      // ✅ CORRECTION: Nettoyer l'ID utilisateur si c'est un JWT-only ID
      const cleanUserId = userId.startsWith('jwt_') ? userId.replace('jwt_', '') : userId

      logger.info("🔍 [PRESTATAIRE-DATA] Using cleaned user ID:", {
        originalId: userId,
        cleanedId: cleanUserId,
        isJwtOnly: userId.startsWith('jwt_')
      })

      // Initialize services
      const userService = createUserService()
      const interventionService = createInterventionService()

      // 1. Get user profile using new service architecture
      const userResult = await userService.getById(cleanUserId)
      if (!userResult.success || !userResult.data) {
        logger.info("❌ No user profile found for user_id:", cleanUserId)
        throw new Error("Aucun profil utilisateur trouvé")
      }

      const userProfile = userResult.data
      logger.info("✅ Found user profile:", userProfile.name, userProfile.role)

      // Vérifier que l'utilisateur est bien un prestataire
      if (userProfile.role !== 'prestataire') {
        logger.info("❌ User is not a prestataire:", userProfile.role)
        throw new Error(`Utilisateur n'est pas un prestataire (rôle: ${userProfile.role})`)
      }

      logger.info("✅ Found prestataire profile:", userProfile.id)

      // 2. Get interventions assigned to this prestataire using new service
      const interventionsResult = await interventionService.getMyInterventions(userProfile.id, 'prestataire')
      const interventions = interventionsResult.success ? (interventionsResult.data || []) : []
      logger.info("📋 Found interventions:", interventions?.length || 0)

      // ⚡ ENRICHISSEMENT OPTIMISÉ: Batch queries au lieu de N+1
      // AVANT: 3 requêtes par intervention (N+1 pattern) = 30 requêtes pour 10 interventions
      // APRÈS: 3 requêtes batch total = 3 requêtes peu importe le nombre d'interventions
      logger.info('🔄 [PRESTATAIRE-DATA] Enriching interventions with quotes, slots and assignments (BATCH)...')

      const interventionIds = (interventions || []).map((i: Intervention) => i.id)

      // 3 requêtes batch au lieu de 3*N requêtes
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
      const quotesMap = new Map<string, typeof allQuotes>()
      const slotsMap = new Map<string, typeof allTimeSlots>()
      const assignmentsMap = new Map<string, typeof allAssignments>()

      allQuotes?.forEach(q => {
        const existing = quotesMap.get(q.intervention_id) || []
        quotesMap.set(q.intervention_id, [...existing, q])
      })
      allTimeSlots?.forEach(s => {
        const existing = slotsMap.get(s.intervention_id) || []
        slotsMap.set(s.intervention_id, [...existing, s])
      })
      allAssignments?.forEach(a => {
        const existing = assignmentsMap.get(a.intervention_id) || []
        assignmentsMap.set(a.intervention_id, [...existing, a])
      })

      // Enrichir les interventions avec les données mappées
      const interventionsWithDetails = (interventions || []).map((intervention: Intervention) => ({
        ...intervention,
        quotes: quotesMap.get(intervention.id) || [],
        timeSlots: slotsMap.get(intervention.id) || [],
        assignments: assignmentsMap.get(intervention.id) || []
      }))

      logger.info(`✅ [PRESTATAIRE-DATA] Interventions enriched (${interventionIds.length} interventions, 3 batch queries)`)

      // 3. Transform interventions to frontend format
      const transformedInterventions: PrestataireIntervention[] = interventionsWithDetails.map((intervention: EnrichedPrestataireIntervention) => {
        const dbStatus = intervention.status  // Garder le statut DB original pour la logique du badge
        const frontendStatus = mapStatusToFrontend(dbStatus)
        
        return {
          id: intervention.id,
          title: intervention.title,
          description: intervention.description,
          type: mapTypeToFrontend(intervention.type),
          priority: mapUrgencyToPriority(intervention.urgency),
          status: dbStatus,  // ✅ Utiliser le statut DB original pour la logique d'alerte
          displayStatus: frontendStatus,  // ✅ Nouveau: statut frontend pour l'affichage
          createdAt: intervention.created_at || '',
          estimatedDuration: "2-3 heures", // TODO: Add this field to database
          location: `${intervention.lot?.reference || 'N/A'} - ${intervention.lot?.building?.address || 'Adresse inconnue'}`,
          tenant: intervention.tenant?.name || 'Locataire inconnu',
          requestedBy: intervention.manager?.name ? `${intervention.manager.name} (Gestionnaire)` : 'Gestionnaire',
          needsQuote: ['devis-a-fournir', 'approuvee'].includes(frontendStatus),
          reference: intervention.reference,
          lot: intervention.lot,
          tenant_details: intervention.tenant,
          manager: intervention.manager,
          assigned_contact: intervention.assigned_contact,
          quotes: intervention.quotes || [],
          timeSlots: intervention.timeSlots || [],
          assignments: intervention.assignments || []
        }
      })

      // 4. Calculate stats
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      
      const interventionsEnCours = transformedInterventions.filter(i =>
        ['demande', 'approuvee', 'demande_de_devis', 'planification', 'planifiee'].includes(i.status)
      ).length

      const urgentesCount = transformedInterventions.filter(i =>
        ['haute', 'urgente'].includes(i.priority) &&
        ['demande', 'approuvee', 'demande_de_devis', 'planification', 'planifiee'].includes(i.status)
      ).length

      const terminesCeMois = transformedInterventions.filter(i => {
        if (!['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)) return false
        const createdDate = new Date(i.createdAt)
        return createdDate >= thisMonth
      }).length

      const terminesMoisPrecedent = transformedInterventions.filter(i => {
        if (!['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)) return false
        const createdDate = new Date(i.createdAt)
        return createdDate >= lastMonth && createdDate < thisMonth
      }).length

      // 5. Get urgent interventions for dashboard
      const urgentInterventions: UrgentIntervention[] = transformedInterventions
        .filter(i => ['haute', 'urgente'].includes(i.priority) &&
                    ['demande', 'approuvee', 'demande_de_devis', 'planification', 'planifiee'].includes(i.status))
        .slice(0, 3) // Show only top 3
        .map(i => ({
          id: i.id,
          title: i.title,
          location: i.location,
          priority: i.priority === 'urgente' ? 'urgent' : 'urgent',
          reference: i.reference
        }))

      const stats: PrestataireDashboardStats = {
        interventionsEnCours,
        urgentesCount,
        terminesCeMois,
        terminesMoisPrecedent,
        prochainsRdv: Math.min(8, interventionsEnCours), // Mock: assume some have scheduled dates
        revenusMois: terminesCeMois * 280, // Mock: estimate 280€ per intervention
        revenusMoisPrecedent: terminesMoisPrecedent * 280 // Mock: estimate 280€ per intervention
      }

      logger.info("📊 Calculated stats:", stats)

      if (mountedRef.current) {
        setData({
          stats,
          interventions: transformedInterventions,
          urgentInterventions,
          loading: false,
          error: null
        })
        lastUserIdRef.current = userId
      }

    } catch (error) {
      logger.error("❌ Error loading prestataire data:", error)
      if (mountedRef.current) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }))
      }
    } finally {
      loadingRef.current = false
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      loadData(false)
    }
  }, [userId, loadData])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    ...data,
    refetch: () => {
      lastUserIdRef.current = null
      loadingRef.current = false
      loadData(true)
    }
  }
}

export default usePrestataireData
