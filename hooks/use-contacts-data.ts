"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./use-auth"
import { createBrowserSupabaseClient, createTeamService } from "@/lib/services"
import { logger, logError } from '@/lib/logger'
import { useRealtimeOptional } from '@/contexts/realtime-context'
import type { Database } from '@/lib/database.types'

// ✅ Types pour les données de contacts
type UserRow = Database['public']['Tables']['users']['Row']
type TeamRow = Database['public']['Tables']['teams']['Row']

interface TeamMemberWithUser {
  user: UserRow | null
}

interface UserInvitation {
  id: string
  email: string
  status: string
  role?: string
  invited_by?: string
  expires_at?: string
}

export interface ContactsData {
  contacts: UserRow[]
  pendingInvitations: UserInvitation[]
  userTeam: TeamRow | null
  contactsInvitationStatus: { [key: string]: string }
}

export function useContactsData() {
  const { user } = useAuth()
  const [data, setData] = useState<ContactsData>({
    contacts: [],
    pendingInvitations: [],
    userTeam: null,
    contactsInvitationStatus: {}
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Utiliser des refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  const fetchContactsData = useCallback(async (userId: string, bypassCache = false) => {
    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      logger.info("🔒 [CONTACTS-DATA] Skipping fetch - already loading or unmounted")
      return
    }

    // ✅ OPTIMISATION: Permettre le bypass du cache lors des navigations
    // Note: Removed data.contacts.length dependency to avoid circular re-renders
    if (lastUserIdRef.current === userId && !bypassCache) {
      logger.info("🔒 [CONTACTS-DATA] Skipping fetch - same userId (use bypassCache=true to force)")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      logger.info("🔄 [CONTACTS-DATA] Fetching contacts data for:", userId, bypassCache ? "(bypassing cache)" : "")

      // ✅ Session gérée par AuthProvider + use-session-keepalive.ts
      // Pas besoin de vérification défensive ici

      // 1. Récupérer l'équipe de l'utilisateur avec gestion d'erreur robuste
      let userTeams = []
      try {
        const teamService = createTeamService()
        const teamsResult = await teamService.getUserTeams(userId)
        userTeams = teamsResult?.data || []
        logger.info("📦 [CONTACTS-DATA] Teams result:", teamsResult)
        logger.info("📦 [CONTACTS-DATA] Teams extracted:", userTeams)
      } catch (teamError) {
        logger.error("❌ [CONTACTS-DATA] Error fetching user teams:", teamError)
        setData({
          contacts: [],
          pendingInvitations: [],
          userTeam: null,
          contactsInvitationStatus: {}
        })
        setError("Erreur lors du chargement de votre équipe. Veuillez réessayer.")
        setLoading(false)
        return
      }

      if (!userTeams || userTeams.length === 0) {
        logger.info("⚠️ [CONTACTS-DATA] No team found for user")
        setData({
          contacts: [],
          pendingInvitations: [],
          userTeam: null,
          contactsInvitationStatus: {}
        })
        setLoading(false)
        return
      }

      const team = userTeams[0]
      logger.info("🏢 [CONTACTS-DATA] Found team:", team.id, team.name)

      // ⚡ OPTIMISATION: Charger les 2 queries EN PARALLÈLE (API redondante supprimée)
      logger.info("🏃 [CONTACTS-DATA] Loading team members and ALL invitations IN PARALLEL...")

      // ✅ Créer le client Supabase pour les requêtes directes
      const supabase = createBrowserSupabaseClient()

      const [membersResult, invitationsResult] = await Promise.allSettled([
        // Query 1: Team members
        supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            user:user_id (
              id,
              name,
              email,
              phone,
              company,
              role,
              provider_category,
              speciality,
              address,
              is_active,
              avatar_url,
              notes
            )
          `)
          .eq('team_id', team.id)
          .order('joined_at', { ascending: false }),

        // Query 2: ALL invitations (all statuses for mapping)
        supabase
          .from('user_invitations')
          .select('*')
          .eq('team_id', team.id)
          .order('invited_at', { ascending: false })
      ])

      // Traiter résultat membres
      let teamContacts: unknown[] = []
      if (membersResult.status === 'fulfilled') {
        const { data: teamMembersData, error: membersError } = membersResult.value

        if (membersError) {
          logger.error("❌ [CONTACTS-DATA] Error loading team members:", membersError)
          throw new Error(`Failed to load team members: ${membersError.message}`)
        }

        teamContacts = teamMembersData
          ?.map((tm: TeamMemberWithUser) => tm.user)
          ?.filter((user: UserRow | null): user is UserRow => user !== null) || []
        logger.info("✅ [CONTACTS-DATA] Team members loaded:", teamContacts.length)
      } else {
        logger.error("❌ [CONTACTS-DATA] Team members query failed:", membersResult.reason)
        throw new Error("Failed to load team members")
      }

      // Traiter résultat invitations (pour TOUS les statuts + mapping)
      let invitations: UserInvitation[] = []
      let allInvitations: UserInvitation[] = []
      let contactsInvitationStatus: { [key: string]: string } = {}

      if (invitationsResult.status === 'fulfilled') {
        const { data: invitationsData, error: invError } = invitationsResult.value

        if (invError) {
          logger.error("❌ [CONTACTS-DATA] Error loading invitations:", invError)
          invitations = []
          allInvitations = []
        } else {
          allInvitations = invitationsData || []

          // Séparer les pending pour l'affichage
          invitations = allInvitations.filter((inv: UserInvitation) => inv.status === 'pending')
          logger.info("✅ [CONTACTS-DATA] All invitations loaded:", allInvitations.length, "(pending:", invitations.length, ")")

          // Construire le mapping de statut à partir de TOUTES les invitations
          allInvitations.forEach((invitation: UserInvitation) => {
            if (invitation.email) {
              contactsInvitationStatus[invitation.email.toLowerCase()] = invitation.status || 'pending'
            }
          })
          logger.info("📊 [CONTACTS-DATA] Invitation status mapping created:", Object.keys(contactsInvitationStatus).length, "entries")
        }
      } else {
        logger.error("❌ [CONTACTS-DATA] Invitations query failed:", invitationsResult.reason)
        invitations = []
        allInvitations = []
      }

      logger.info("🏁 [CONTACTS-DATA] All parallel queries completed")
      
      if (mountedRef.current) {
        const newData = {
          contacts: teamContacts,
          pendingInvitations: invitations,
          userTeam: team,
          contactsInvitationStatus
        }
        setData(newData)
        lastUserIdRef.current = userId
        logger.info("✅ [CONTACTS-DATA] All contacts data loaded successfully")
      }
    } catch (err) {
      logger.error("❌ [CONTACTS-DATA] Error fetching contacts data:", err)
      if (mountedRef.current) {
        setError("Erreur lors du chargement des contacts")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, []) // Removed circular dependency - callback is now stable

  // ✅ SIMPLIFIÉ: Effect standard React sans couche de cache
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      setData({
        contacts: [],
        pendingInvitations: [],
        userTeam: null,
        contactsInvitationStatus: {}
      })
      setError(null)
      return
    }

    // ✅ OPTIMISATION: Appel immédiat pour réactivité maximale
    fetchContactsData(user.id, false) // Utilisation normale du cache
  }, [user?.id, fetchContactsData])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Auto-refetch on invalidation broadcast
  const realtime = useRealtimeOptional()

  useEffect(() => {
    if (!realtime?.onInvalidation) return
    return realtime.onInvalidation(['contacts'], () => {
      if (user?.id) {
        logger.info('🔄 [CONTACTS-DATA] Auto-refetch triggered by invalidation')
        lastUserIdRef.current = null
        loadingRef.current = false
        fetchContactsData(user.id, true)
      }
    })
  }, [realtime, user?.id, fetchContactsData])

  // ✅ OPTIMISÉ: Refetch sans vider les données (meilleure UX)
  const refetch = useCallback(() => {
    if (user?.id) {
      logger.info("🔄 [CONTACTS-DATA] Manual refetch requested")
      lastUserIdRef.current = null
      // Ne pas vider les données - les nouvelles écraseront les anciennes
      loadingRef.current = false
      fetchContactsData(user.id, true) // Bypass cache
    }
  }, [user?.id, fetchContactsData])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      logger.info("🔄 [CONTACTS-DATA] Force refresh requested")
      lastUserIdRef.current = null
      // Ne pas vider les données - les nouvelles écraseront les anciennes
      loadingRef.current = false

      // Force fetch
      await fetchContactsData(user.id, true)
    }
  }, [user?.id, fetchContactsData])

  return {
    data,
    loading,
    error,
    refetch,
    forceRefetch,
    // Raccourcis pour l'accès facile
    contacts: data.contacts,
    pendingInvitations: data.pendingInvitations,
    userTeam: data.userTeam,
    contactsInvitationStatus: data.contactsInvitationStatus
  }
}
