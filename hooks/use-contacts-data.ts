"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./use-auth"
import { useDataRefresh } from "./use-cache-management"
import { contactService, teamService, contactInvitationService } from "@/lib/database-service"

export interface ContactsData {
  contacts: any[]
  pendingInvitations: any[]
  userTeam: any | null
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
      console.log("🔒 [CONTACTS-DATA] Skipping fetch - already loading or unmounted")
      return
    }

    // ✅ OPTIMISATION: Permettre le bypass du cache lors des navigations
    if (lastUserIdRef.current === userId && data.contacts.length > 0 && !bypassCache) {
      console.log("🔒 [CONTACTS-DATA] Skipping fetch - same userId and data exists (use bypassCache=true to force)")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      console.log("🔄 [CONTACTS-DATA] Fetching contacts data for:", userId, bypassCache ? "(bypassing cache)" : "")
      
      // 1. Récupérer l'équipe de l'utilisateur
      const userTeams = await teamService.getUserTeams(userId)
      if (!userTeams || userTeams.length === 0) {
        console.log("⚠️ [CONTACTS-DATA] No team found for user")
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
      console.log("🏢 [CONTACTS-DATA] Found team:", team.id, team.name)
      
      // 2. Récupérer les contacts de l'équipe
      const teamContacts = await contactService.getTeamContacts(team.id)
      console.log("✅ [CONTACTS-DATA] Contacts loaded:", teamContacts.length)
      
      // 3. Charger les invitations en attente
      let invitations: any[] = []
      try {
        invitations = await contactInvitationService.getPendingInvitations(team.id)
        console.log("✅ [CONTACTS-DATA] Pending invitations loaded:", invitations.length)
      } catch (invitationError) {
        console.error("❌ [CONTACTS-DATA] Error loading pending invitations:", invitationError)
        // Ne pas faire échouer le chargement principal pour les invitations
        invitations = []
      }
      
      // 4. Charger le statut d'invitation pour tous les contacts
      let contactsInvitationStatus: { [key: string]: string } = {}
      try {
        console.log("🔍 [CONTACTS-DATA] Loading invitation status for", teamContacts.length, "contacts...")
        
        const response = await fetch(`/api/team-invitations?teamId=${team.id}`)
        
        if (response.ok) {
          const { invitations: teamInvitations } = await response.json()
          console.log("📧 [CONTACTS-DATA] Found invitations:", teamInvitations?.length || 0)
          
          // Marquer uniquement les contacts qui ont une invitation réelle
          teamInvitations?.forEach((invitation: any) => {
            if (invitation.email) {
              contactsInvitationStatus[invitation.email.toLowerCase()] = invitation.status || 'pending'
            }
          })
          
          console.log("📊 [CONTACTS-DATA] Final invitation status mapping:", contactsInvitationStatus)
        } else {
          console.warn("⚠️ [CONTACTS-DATA] Could not fetch team invitations, using empty status map")
        }
      } catch (statusError) {
        console.error("❌ [CONTACTS-DATA] Error loading contacts invitation status:", statusError)
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
        console.log("✅ [CONTACTS-DATA] All contacts data loaded successfully")
      }
    } catch (err) {
      console.error("❌ [CONTACTS-DATA] Error fetching contacts data:", err)
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

  // ✅ NOUVEAU: Intégration avec le système de cache pour refresh automatique
  const refreshCallback = useCallback(() => {
    if (user?.id) {
      console.log("🔄 [CONTACTS-DATA] Cache refresh triggered")
      // Forcer le bypass du cache pour le refresh
      lastUserIdRef.current = null
      setData(prev => ({ ...prev, contacts: [], pendingInvitations: [] })) // Clear data to show loading state
      fetchContactsData(user.id, true)
    }
  }, [user?.id, fetchContactsData])

  // Enregistrer le hook avec le système de cache
  const { setCacheValid, invalidateCache, forceRefresh } = useDataRefresh('contacts-data', refreshCallback)

  // ✅ OPTIMISÉ: Effect avec debouncing réduit et intégration cache
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

  // ✅ OPTIMISÉ: Refetch avec système de cache intégré
  const refetch = useCallback(() => {
    if (user?.id) {
      console.log("🔄 [CONTACTS-DATA] Manual refetch requested")
      // Invalider le cache et forcer le refetch
      invalidateCache()
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
  }, [user?.id, fetchContactsData, invalidateCache])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      console.log("🔄 [CONTACTS-DATA] Force refresh requested")
      invalidateCache()
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
  }, [user?.id, fetchContactsData, invalidateCache])

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
