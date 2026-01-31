'use client'

/**
 * 🏢 Hook useCurrentTeam - Gestion de l'équipe courante (multi-équipes)
 *
 * ✅ MULTI-ÉQUIPE (Jan 2026): Gère le choix de l'équipe active pour un utilisateur
 * appartenant à plusieurs équipes.
 *
 * Priorité de sélection:
 * 1. URL param `?team=xxx` (pour liens directs)
 * 2. Cookie server-side `seido_current_team`
 * 3. localStorage (persistance client)
 * 4. Première équipe de la liste (défaut)
 *
 * @example
 * const { currentTeamId, activeTeamIds, changeTeam, isAllTeamsView } = useCurrentTeam(teams)
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { Team } from '@/lib/services/core/service-types'

/** Nom du cookie/localStorage pour l'équipe courante */
const CURRENT_TEAM_KEY = 'seido_current_team'

/** Valeur spéciale pour "toutes les équipes" */
export const ALL_TEAMS_VALUE = 'all'

export interface UseCurrentTeamOptions {
  /** Équipes auxquelles l'utilisateur a accès */
  teams: Team[]
  /** Rôle actuel de l'utilisateur (pour filtrer sameRoleTeams) */
  currentRole?: string
  /** Tous les profils de l'utilisateur (optionnel, pour regroupement par rôle) */
  allProfiles?: Array<{ team_id: string; role: string }>
  /** Callback appelé quand l'équipe change */
  onTeamChange?: (teamId: string | 'all') => void
}

export interface UseCurrentTeamReturn {
  /** ID de l'équipe actuellement sélectionnée (ou 'all' pour toutes) */
  currentTeamId: string | 'all'
  /** Équipe actuellement sélectionnée (null si 'all') */
  currentTeam: Team | null
  /** Liste des IDs d'équipes actives (pour requêtes) */
  activeTeamIds: string[]
  /** True si on est en vue "toutes les équipes" */
  isAllTeamsView: boolean
  /** Équipes avec le même rôle (pour le sélecteur) */
  sameRoleTeams: Team[]
  /** Toutes les équipes de l'utilisateur */
  allTeams: Team[]
  /** Changer l'équipe courante */
  changeTeam: (teamId: string | 'all') => void
  /** True si l'utilisateur a plusieurs équipes */
  hasMultipleTeams: boolean
}

/**
 * Hook pour gérer l'équipe courante dans un contexte multi-équipes
 */
export function useCurrentTeam({
  teams,
  currentRole,
  allProfiles,
  onTeamChange
}: UseCurrentTeamOptions): UseCurrentTeamReturn {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filtrer les équipes avec le même rôle (si allProfiles fourni)
  const sameRoleTeams = useMemo(() => {
    if (!allProfiles || !currentRole) return teams

    const sameRoleTeamIds = new Set(
      allProfiles
        .filter(p => p.role === currentRole)
        .map(p => p.team_id)
    )
    return teams.filter(t => sameRoleTeamIds.has(t.id))
  }, [teams, allProfiles, currentRole])

  // Initialiser l'équipe courante selon la priorité
  const getInitialTeamId = useCallback((): string | 'all' => {
    // 1. URL param
    const urlTeamId = searchParams.get('team')
    if (urlTeamId === ALL_TEAMS_VALUE) return ALL_TEAMS_VALUE
    if (urlTeamId && teams.some(t => t.id === urlTeamId)) return urlTeamId

    // 2. localStorage (côté client uniquement)
    if (typeof window !== 'undefined') {
      const storedTeamId = localStorage.getItem(CURRENT_TEAM_KEY)
      if (storedTeamId === ALL_TEAMS_VALUE) return ALL_TEAMS_VALUE
      if (storedTeamId && teams.some(t => t.id === storedTeamId)) return storedTeamId
    }

    // 3. Première équipe (défaut)
    return teams[0]?.id || ALL_TEAMS_VALUE
  }, [teams, searchParams])

  const [currentTeamId, setCurrentTeamId] = useState<string | 'all'>(getInitialTeamId)

  // Mettre à jour si l'URL change
  useEffect(() => {
    const urlTeamId = searchParams.get('team')
    if (urlTeamId && urlTeamId !== currentTeamId) {
      if (urlTeamId === ALL_TEAMS_VALUE || teams.some(t => t.id === urlTeamId)) {
        setCurrentTeamId(urlTeamId as string | 'all')
      }
    }
  }, [searchParams, teams, currentTeamId])

  // Changer d'équipe
  const changeTeam = useCallback((newTeamId: string | 'all') => {
    setCurrentTeamId(newTeamId)

    // Persister dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_TEAM_KEY, newTeamId)
    }

    // Persister dans cookie server-side
    document.cookie = `${CURRENT_TEAM_KEY}=${newTeamId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

    // Mettre à jour l'URL (optionnel, pour partager le lien)
    const params = new URLSearchParams(searchParams.toString())
    if (newTeamId === ALL_TEAMS_VALUE) {
      params.set('team', ALL_TEAMS_VALUE)
    } else {
      params.delete('team') // Équipe unique = pas besoin de param
    }

    // Router.push pour rafraîchir les données server
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)

    // Callback personnalisé
    onTeamChange?.(newTeamId)
  }, [pathname, searchParams, router, onTeamChange])

  // Calculer les valeurs dérivées
  const currentTeam = useMemo(() => {
    if (currentTeamId === ALL_TEAMS_VALUE) return null
    return teams.find(t => t.id === currentTeamId) || null
  }, [currentTeamId, teams])

  const activeTeamIds = useMemo(() => {
    if (currentTeamId === ALL_TEAMS_VALUE) {
      // Vue consolidée = toutes les équipes avec même rôle
      return sameRoleTeams.map(t => t.id)
    }
    return [currentTeamId]
  }, [currentTeamId, sameRoleTeams])

  const isAllTeamsView = currentTeamId === ALL_TEAMS_VALUE
  const hasMultipleTeams = sameRoleTeams.length > 1

  return {
    currentTeamId,
    currentTeam,
    activeTeamIds,
    isAllTeamsView,
    sameRoleTeams,
    allTeams: teams,
    changeTeam,
    hasMultipleTeams
  }
}

export default useCurrentTeam
