"use client"

import { useState, useEffect } from "react"
import {
  createInterventionService,
  createUserService,
  createContactInvitationService
} from "@/lib/services"
import type { Intervention } from "@/lib/services/core/service-types"
import { logger, logError } from '@/lib/logger'
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
  status: string
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
}

export interface UrgentIntervention {
  id: string
  title: string
  location: string
  priority: 'urgent' | 'critique'
  reference: string
}

// Mapping des statuts database vers les statuts frontend attendus
const mapStatusToFrontend = (_dbStatus: string): string => {
  const statusMap: Record<string, string> = {
    'demande': 'nouvelle-demande',
    'rejetee': 'rejetee',
    'approuvee': 'approuvee',
    'demande_de_devis': 'devis-a-fournir',
    'planification': 'planification',
    'planifiee': 'planifiee',
    'en_cours': 'en_cours',
    'cloturee_par_prestataire': 'terminee',
    'cloturee_par_locataire': 'terminee',
    'cloturee_par_gestionnaire': 'terminee',
    'annulee': 'annulee'
  }
  return statusMap[dbStatus] || dbStatus
}

// Mapping des types database vers les types frontend
const mapTypeToFrontend = (_dbType: string): string => {
  const typeMap: Record<string, string> = {
    'plomberie': 'Plomberie',
    'electricite': 'Électricité',
    'chauffage': 'Chauffage',
    'serrurerie': 'Serrurerie',
    'peinture': 'Peinture',
    'menage': 'Ménage',
    'jardinage': 'Jardinage',
    'autre': 'Autre'
  }
  return typeMap[dbType] || dbType
}

// Mapping des urgences database vers les priorités frontend
const mapUrgencyToPriority = (_dbUrgency: string): 'basse' | 'normale' | 'haute' | 'urgente' => {
  const urgencyMap: Record<string, 'basse' | 'normale' | 'haute' | 'urgente'> = {
    'basse': 'basse',
    'normale': 'normale',
    'haute': 'haute',
    'urgente': 'urgente'
  }
  return urgencyMap[dbUrgency] || 'normale'
}

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

  const loadData = async () => {
    logger.info("📊 Loading prestataire data for user:", userId)

    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

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
      const interventionsResult = await interventionService.getByProvider(userProfile.id)
      const interventions = interventionsResult.success ? (interventionsResult.data || []) : []
      logger.info("📋 Found interventions:", interventions?.length || 0)

      // 3. Transform interventions to frontend format
      const transformedInterventions: PrestataireIntervention[] = (interventions || []).map((intervention: Intervention & { lot?: unknown; tenant?: unknown; manager?: unknown; assigned_contact?: unknown }) => ({
        id: intervention.id,
        title: intervention.title,
        description: intervention.description,
        type: mapTypeToFrontend(intervention.type),
        priority: mapUrgencyToPriority(intervention.urgency),
        status: mapStatusToFrontend(intervention.status),
        createdAt: intervention.created_at || '',
        estimatedDuration: "2-3 heures", // TODO: Add this field to database
        location: `${intervention.lot?.reference || 'N/A'} - ${intervention.lot?.building?.address || 'Adresse inconnue'}`,
        tenant: intervention.tenant?.name || 'Locataire inconnu',
        requestedBy: intervention.manager?.name ? `${intervention.manager.name} (Gestionnaire)` : 'Gestionnaire',
        needsQuote: ['devis-a-fournir', 'approuvee'].includes(mapStatusToFrontend(intervention.status)),
        reference: intervention.reference,
        lot: intervention.lot,
        tenant_details: intervention.tenant,
        manager: intervention.manager,
        assigned_contact: intervention.assigned_contact
      }))

      // 4. Calculate stats
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      
      const interventionsEnCours = transformedInterventions.filter(i => 
        ['demande', 'approuvee', 'devis-a-fournir', 'planification', 'planifiee', 'en_cours'].includes(i.status)
      ).length

      const urgentesCount = transformedInterventions.filter(i => 
        ['haute', 'urgente'].includes(i.priority) && 
        ['demande', 'approuvee', 'devis-a-fournir', 'planification', 'planifiee', 'en_cours'].includes(i.status)
      ).length

      const terminesCeMois = transformedInterventions.filter(i => {
        if (i.status !== 'terminee') return false
        const createdDate = new Date(i.createdAt)
        return createdDate >= thisMonth
      }).length

      const terminesMoisPrecedent = transformedInterventions.filter(i => {
        if (i.status !== 'terminee') return false
        const createdDate = new Date(i.createdAt)
        return createdDate >= lastMonth && createdDate < thisMonth
      }).length

      // 5. Get urgent interventions for dashboard
      const urgentInterventions: UrgentIntervention[] = transformedInterventions
        .filter(i => ['haute', 'urgente'].includes(i.priority) && 
                    ['demande', 'approuvee', 'devis-a-fournir', 'planification', 'planifiee', 'en_cours'].includes(i.status))
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

      setData({
        stats,
        interventions: transformedInterventions,
        urgentInterventions,
        loading: false,
        error: null
      })

    } catch (error) {
      logger.error("❌ Error loading prestataire data:", error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
    }
  }

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  return {
    ...data,
    refetch: loadData
  }
}

export default usePrestataireData
