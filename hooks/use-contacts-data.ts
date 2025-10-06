"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./use-auth"
import { createBrowserSupabaseClient, createTeamService } from "@/lib/services"
import { logger, logError } from '@/lib/logger'
export interface ContactsData {
  contacts: unknown[]
  pendingInvitations: unknown[]
  userTeam: unknown | null
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
    if (lastUserIdRef.current === userId && data.contacts.length > 0 && !bypassCache) {
      logger.info("🔒 [CONTACTS-DATA] Skipping fetch - same userId and data exists (use bypassCache=true to force)")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      logger.info("🔄 [CONTACTS-DATA] Fetching contacts data for:", userId, bypassCache ? "(bypassing cache)" : "")

      // Initialiser le client Supabase
      const supabase = createBrowserSupabaseClient()

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

      // 2. Récupérer les membres de l'équipe depuis la table team_members (junction table)
      // ✅ FIX: Utiliser team_members au lieu de users pour éviter les problèmes RLS
      const { data: teamMembersData, error: membersError } = await supabase
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
            notes,
            first_name,
            last_name
          )
        `)
        .eq('team_id', team.id)
        .order('joined_at', { ascending: false })

      if (membersError) {
        logger.error("❌ [CONTACTS-DATA] Error loading team members:", membersError)
        throw new Error(`Failed to load team members: ${membersError.message}`)
      }

      // Extraire les users depuis la relation team_members
      const teamContacts = teamMembersData
        ?.map(tm => tm.user)
        ?.filter(user => user !== null) || []
      logger.info("✅ [CONTACTS-DATA] Team members loaded:", teamContacts.length)

      // 3. Charger les invitations en attente depuis user_invitations
      let invitations: unknown[] = []
      try {
        const { data: invitationsData, error: invError } = await supabase
          .from('user_invitations')
          .select('*')
          .eq('team_id', team.id)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })

        if (invError) {
          logger.error("❌ [CONTACTS-DATA] Error loading invitations:", invError)
          invitations = []
        } else {
          invitations = invitationsData || []
          logger.info("✅ [CONTACTS-DATA] Pending invitations loaded:", invitations.length)
        }
      } catch (invitationError) {
        logger.error("❌ [CONTACTS-DATA] Error loading pending invitations:", invitationError)
        // Ne pas faire échouer le chargement principal pour les invitations
        invitations = []
      }
      
      // 4. Charger le statut d'invitation pour tous les contacts
      let contactsInvitationStatus: { [key: string]: string } = {}
      try {
        logger.info("🔍 [CONTACTS-DATA] Loading invitation status for", teamContacts.length, "contacts...")
        
        const response = await fetch(`/api/team-invitations?teamId=${team.id}`)
        
        if (response.ok) {
          const { invitations: teamInvitations } = await response.json()
          logger.info("📧 [CONTACTS-DATA] Found invitations:", teamInvitations?.length || 0)
          
          // Marquer uniquement les contacts qui ont une invitation réelle
          teamInvitations?.forEach((invitation: any) => {
            if (invitation.email) {
              contactsInvitationStatus[invitation.email.toLowerCase()] = invitation.status || 'pending'
            }
          })
          
          logger.info("📊 [CONTACTS-DATA] Final invitation status mapping:", contactsInvitationStatus)
        } else {
          logger.warn("⚠️ [CONTACTS-DATA] Could not fetch team invitations, using empty status map")
        }
      } catch (statusError) {
        logger.error("❌ [CONTACTS-DATA] Error loading contacts invitation status:", statusError)
        // Ne pas faire échouer l'interface si les badges ne se chargent pas
      }
      
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
  }, [data.contacts.length])

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

    // ✅ OPTIMISATION: Débounce réduit pour une navigation plus réactive
    const timeoutId = setTimeout(() => {
      fetchContactsData(user.id, false) // Utilisation normale du cache
    }, 100) // Réduit pour plus de réactivité

    return () => {
      clearTimeout(timeoutId)
    }
  }, [user?.id, fetchContactsData])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ✅ SIMPLIFIÉ: Refetch direct sans couche de cache
  const refetch = useCallback(() => {
    if (user?.id) {
      logger.info("🔄 [CONTACTS-DATA] Manual refetch requested")
      lastUserIdRef.current = null
      setData({
        contacts: [],
        pendingInvitations: [],
        userTeam: null,
        contactsInvitationStatus: {}
      })
      loadingRef.current = false
      fetchContactsData(user.id, true) // Bypass cache
    }
  }, [user?.id, fetchContactsData])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      logger.info("🔄 [CONTACTS-DATA] Force refresh requested")
      lastUserIdRef.current = null
      setData({
        contacts: [],
        pendingInvitations: [],
        userTeam: null,
        contactsInvitationStatus: {}
      })
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
