/**
 * 🎯 SERVER CONTEXT - SEIDO APP (Next.js 15 + React 19 Best Practices)
 *
 * Helper centralisé pour Server Components et Server Actions
 * Fournit user + profile + team + client Supabase authentifié et prêts à l'emploi
 *
 * Utilise cache() de React 19 pour dédupliquer les appels durant une requête
 *
 * @example
 * // Dans un Server Component (READ-ONLY)
 * export default async function MyPage() {
 *   const { profile, team, supabase } = await getServerAuthContext('gestionnaire')
 *   const { data } = await supabase.from('buildings').select('*')
 *   return <ClientComponent team={team} buildings={data} />
 * }
 *
 * @example
 * // Dans un Server Action (READ-WRITE)
 * export async function createBuildingAction(data: BuildingData) {
 *   const { supabase } = await getServerActionAuthContext('gestionnaire')
 *   const result = await supabase.from('buildings').insert(data)
 *   revalidatePath('/gestionnaire/biens')
 *   return result
 * }
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { requireRole, CURRENT_TEAM_COOKIE } from '@/lib/auth-dal'
import { createServerSupabaseClient, createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import type { Team } from '@/lib/services/core/service-types'
import { logger } from '@/lib/logger'

// ✅ FIX (Jan 2026): createServerTeamService supprimé - teams extraites des profils directement
// Évite les problèmes RLS avec team_members (get_user_id_from_auth() LIMIT 1)

/** Valeur spéciale pour "toutes les équipes" (dupliquée pour éviter import circulaire) */
const ALL_TEAMS_VALUE = 'all'

/**
 * Type retourné par getServerAuthContext (Server Components - READ-ONLY)
 */
export interface ServerAuthContext {
  user: {
    id: string
    email: string
    name: string
    role: string
    [key: string]: unknown
  }
  profile: {
    id: string
    email: string
    name: string
    role: string
    team_id?: string
    [key: string]: unknown
  }
  team: Team
  teams: Team[]
  /** ✅ MULTI-ÉQUIPE: Équipes avec le même rôle (pour sélecteur) */
  sameRoleTeams: Team[]
  /** ✅ MULTI-ÉQUIPE: IDs des équipes actives (pour requêtes) */
  activeTeamIds: string[]
  /** ✅ MULTI-ÉQUIPE: True si vue "toutes les équipes" */
  isConsolidatedView: boolean
  /** ✅ Client Supabase authentifié (READ-ONLY pour Server Components) */
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
}

/**
 * Type retourné par getServerActionAuthContext (Server Actions - READ-WRITE)
 */
export interface ServerActionAuthContext {
  user: {
    id: string
    email: string
    name: string
    role: string
    [key: string]: unknown
  }
  profile: {
    id: string
    email: string
    name: string
    role: string
    team_id?: string
    [key: string]: unknown
  }
  team: Team
  teams: Team[]
  /** ✅ MULTI-ÉQUIPE: Équipes avec le même rôle (pour sélecteur) */
  sameRoleTeams: Team[]
  /** ✅ MULTI-ÉQUIPE: IDs des équipes actives (pour requêtes) */
  activeTeamIds: string[]
  /** ✅ MULTI-ÉQUIPE: True si vue "toutes les équipes" */
  isConsolidatedView: boolean
  /** ✅ Client Supabase authentifié (READ-WRITE pour Server Actions) */
  supabase: Awaited<ReturnType<typeof createServerActionSupabaseClient>>
}

/**
 * ✅ PATTERN OFFICIEL REACT 19 + NEXT.JS 15 - SERVER COMPONENTS (READ-ONLY)
 *
 * Récupère le contexte d'authentification complet pour un Server Component
 * - Vérifie l'authentification
 * - Vérifie le rôle (optionnel)
 * - Charge les équipes
 * - Fournit un client Supabase authentifié (READ-ONLY)
 * - Redirige automatiquement si problème
 *
 * Utilise cache() pour éviter les appels dupliqués durant la même requête
 *
 * ⚠️ IMPORTANT: Ce client est READ-ONLY (ne peut pas modifier les cookies)
 * Pour les Server Actions, utiliser getServerActionAuthContext()
 *
 * @param requiredRole - Rôle requis ('admin', 'gestionnaire', 'locataire', 'prestataire'), optionnel
 * @returns Contexte avec user, profile, team, teams et client Supabase authentifié
 * @throws Redirect si utilisateur non authentifié ou sans équipe
 */
export const getServerAuthContext = cache(async (requiredRole?: string): Promise<ServerAuthContext> => {
  try {
    // Skip verbose logging during build phase
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
    if (!isBuildPhase) {
      logger.info('🔍 [SERVER-CONTEXT] Getting authenticated context (READ-ONLY)...', { requiredRole })
    }

    // ✅ PERF: Paralléliser création client + auth check
    // Note: teamService n'est plus utilisé ici car on extrait les teams des profils
    const [supabase, authResult] = await Promise.all([
      createServerSupabaseClient(),
      requiredRole ? requireRole(requiredRole) : requireRole()
    ])

    // ✅ MULTI-ÉQUIPE: Import dynamique de cookies() pour éviter erreur "server-only"
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    const { user, profile, allProfiles } = authResult

    if (!isBuildPhase) {
      logger.info('✅ [SERVER-CONTEXT] User authenticated:', {
        userId: profile.id,
        email: profile.email,
        role: profile.role,
        totalProfiles: allProfiles?.length || 1
      })
    }

    // ✅ FIX (Jan 2026): Extraire teams des profils déjà chargés
    // Évite les problèmes RLS avec team_members (get_user_id_from_auth() LIMIT 1)
    // Chaque profil a déjà son info team via findAllByAuthUserId()
    const teams: Team[] = []
    const seenTeamIds = new Set<string>()

    for (const p of (allProfiles || [profile])) {
      if (p.team_id && !seenTeamIds.has(p.team_id)) {
        seenTeamIds.add(p.team_id)
        // Utiliser l'info team du profil si disponible
        const teamInfo = (p as any).team
        teams.push({
          id: p.team_id,
          name: teamInfo?.name || `Équipe ${p.team_id.slice(0, 8)}`,
          description: teamInfo?.description || null,
          created_at: teamInfo?.created_at || new Date().toISOString(),
          updated_at: teamInfo?.updated_at || new Date().toISOString(),
          created_by: teamInfo?.created_by || null
        } as Team)
      }
    }

    if (teams.length === 0) {
      logger.error('❌ [SERVER-CONTEXT] User has no team in profiles:', {
        userId: profile.id,
        email: profile.email
      })
      redirect('/auth/unauthorized?reason=no_team')
    }

    if (!isBuildPhase) {
      logger.info('✅ [SERVER-CONTEXT] Teams extracted from profiles:', {
        count: teams.length,
        teamIds: teams.map(t => t.id)
      })
    }

    // ✅ MULTI-ÉQUIPE: Filtrer les équipes avec le même rôle
    // Un utilisateur peut avoir différents rôles dans différentes équipes
    // Ex: gestionnaire dans équipe A, prestataire dans équipe B
    // Sur /gestionnaire/dashboard, on ne montre que les équipes où il est gestionnaire
    const currentRole = profile.role
    let sameRoleTeams: Team[]

    if (allProfiles && allProfiles.length > 1) {
      // Filtrer les équipes où l'utilisateur a le même rôle
      const sameRoleTeamIds = new Set(
        allProfiles
          .filter(p => p.role === currentRole)
          .map(p => p.team_id)
      )
      sameRoleTeams = teams.filter(t => sameRoleTeamIds.has(t.id))
      if (!isBuildPhase) {
        logger.info('✅ [SERVER-CONTEXT] Filtered teams by role:', {
          currentRole,
          totalTeams: teams.length,
          sameRoleTeams: sameRoleTeams.length
        })
      }
    } else {
      // Un seul profil = toutes les équipes ont le même rôle
      sameRoleTeams = teams
    }

    // Sécurité: s'assurer qu'on a au moins une équipe avec ce rôle
    if (sameRoleTeams.length === 0) {
      logger.error('❌ [SERVER-CONTEXT] No teams with current role:', { currentRole })
      sameRoleTeams = teams // Fallback sur toutes les équipes
    }

    // ✅ MULTI-ÉQUIPE: Déterminer les équipes actives selon cookie
    const teamChoice = cookieStore.get(CURRENT_TEAM_COOKIE)?.value

    let activeTeamIds: string[]
    let isConsolidatedView = false
    let primaryTeam: Team

    if (teamChoice === ALL_TEAMS_VALUE) {
      // Vue consolidée = toutes les équipes avec même rôle
      activeTeamIds = sameRoleTeams.map(t => t.id)
      isConsolidatedView = true
      primaryTeam = sameRoleTeams[0] // Pour compatibilité avec code existant
    } else if (teamChoice && sameRoleTeams.some(t => t.id === teamChoice)) {
      // Équipe spécifique sélectionnée
      activeTeamIds = [teamChoice]
      primaryTeam = sameRoleTeams.find(t => t.id === teamChoice) || sameRoleTeams[0]
    } else {
      // Défaut: première équipe
      activeTeamIds = [sameRoleTeams[0].id]
      primaryTeam = sameRoleTeams[0]
    }

    if (!isBuildPhase) {
      logger.info('✅ [SERVER-CONTEXT] Context loaded successfully (READ-ONLY):', {
        userId: profile.id,
        teamId: primaryTeam.id,
        teamName: primaryTeam.name,
        totalTeams: teams.length,
        sameRoleTeams: sameRoleTeams.length,
        isConsolidatedView,
        activeTeamIds
      })
    }

    return {
      user,
      profile,
      team: primaryTeam,
      teams,
      sameRoleTeams,
      activeTeamIds,
      isConsolidatedView,
      supabase
    }
  } catch (error) {
    // During build phase, auth errors are expected (no session) - don't log as errors
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
    if (!isBuildPhase) {
      logger.error('❌ [SERVER-CONTEXT] Error getting auth context:', error)
    }

    // Si erreur d'authentification, rediriger vers login
    if (error instanceof Error && error.message.includes('auth')) {
      redirect('/auth/login?reason=auth_error')
    }

    // Autres erreurs, rediriger vers unauthorized
    redirect('/auth/unauthorized?reason=context_error')
  }
})

/**
 * ✅ PATTERN OFFICIEL REACT 19 + NEXT.JS 15 - SERVER ACTIONS (READ-WRITE)
 *
 * Récupère le contexte d'authentification complet pour une Server Action
 * - Vérifie l'authentification
 * - Vérifie le rôle (optionnel)
 * - Charge les équipes
 * - Fournit un client Supabase authentifié (READ-WRITE)
 * - Redirige automatiquement si problème
 *
 * ✅ IMPORTANT: Ce client peut MODIFIER les cookies (refresh session, etc.)
 * Utilisez-le dans les Server Actions et Route Handlers
 *
 * @param requiredRole - Rôle requis ('admin', 'gestionnaire', 'locataire', 'prestataire'), optionnel
 * @returns Contexte avec user, profile, team, teams et client Supabase authentifié (READ-WRITE)
 * @throws Redirect si utilisateur non authentifié ou sans équipe
 *
 * @example
 * 'use server'
 * export async function createBuilding(data: BuildingData) {
 *   const { supabase, profile, team } = await getServerActionAuthContext('gestionnaire')
 *   const result = await supabase.from('buildings').insert({ ...data, team_id: team.id })
 *   revalidatePath('/gestionnaire/biens')
 *   return result
 * }
 */
export const getServerActionAuthContext = async (requiredRole?: string): Promise<ServerActionAuthContext> => {
  try {
    // Skip verbose logging during build phase
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
    if (!isBuildPhase) {
      logger.info('🔍 [SERVER-ACTION-CONTEXT] Getting authenticated context (READ-WRITE)...', { requiredRole })
    }

    // ✅ PERF: Paralléliser création client + auth check
    const [supabase, authResult] = await Promise.all([
      createServerActionSupabaseClient(),
      requiredRole ? requireRole(requiredRole) : requireRole()
    ])

    // ✅ MULTI-ÉQUIPE: Import dynamique de cookies() pour éviter erreur "server-only"
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    const { user, profile, allProfiles } = authResult

    if (!isBuildPhase) {
      logger.info('✅ [SERVER-ACTION-CONTEXT] User authenticated:', {
        userId: profile.id,
        email: profile.email,
        role: profile.role,
        totalProfiles: allProfiles?.length || 1
      })
    }

    // ✅ FIX (Jan 2026): Extraire teams des profils déjà chargés
    // Évite les problèmes RLS avec team_members
    const teams: Team[] = []
    const seenTeamIds = new Set<string>()

    for (const p of (allProfiles || [profile])) {
      if (p.team_id && !seenTeamIds.has(p.team_id)) {
        seenTeamIds.add(p.team_id)
        const teamInfo = (p as any).team
        teams.push({
          id: p.team_id,
          name: teamInfo?.name || `Équipe ${p.team_id.slice(0, 8)}`,
          description: teamInfo?.description || null,
          created_at: teamInfo?.created_at || new Date().toISOString(),
          updated_at: teamInfo?.updated_at || new Date().toISOString(),
          created_by: teamInfo?.created_by || null
        } as Team)
      }
    }

    if (teams.length === 0) {
      logger.error('❌ [SERVER-ACTION-CONTEXT] User has no team in profiles:', {
        userId: profile.id,
        email: profile.email
      })
      redirect('/auth/unauthorized?reason=no_team')
    }

    // ✅ MULTI-ÉQUIPE: Filtrer les équipes avec le même rôle
    const currentRole = profile.role
    let sameRoleTeams: Team[]

    if (allProfiles && allProfiles.length > 1) {
      const sameRoleTeamIds = new Set(
        allProfiles
          .filter(p => p.role === currentRole)
          .map(p => p.team_id)
      )
      sameRoleTeams = teams.filter(t => sameRoleTeamIds.has(t.id))
    } else {
      sameRoleTeams = teams
    }

    if (sameRoleTeams.length === 0) {
      sameRoleTeams = teams // Fallback
    }

    // ✅ MULTI-ÉQUIPE: Déterminer les équipes actives selon cookie
    const teamChoice = cookieStore.get(CURRENT_TEAM_COOKIE)?.value

    let activeTeamIds: string[]
    let isConsolidatedView = false
    let primaryTeam: Team

    if (teamChoice === ALL_TEAMS_VALUE) {
      activeTeamIds = sameRoleTeams.map(t => t.id)
      isConsolidatedView = true
      primaryTeam = sameRoleTeams[0]
    } else if (teamChoice && sameRoleTeams.some(t => t.id === teamChoice)) {
      activeTeamIds = [teamChoice]
      primaryTeam = sameRoleTeams.find(t => t.id === teamChoice) || sameRoleTeams[0]
    } else {
      activeTeamIds = [sameRoleTeams[0].id]
      primaryTeam = sameRoleTeams[0]
    }

    if (!isBuildPhase) {
      logger.info('✅ [SERVER-ACTION-CONTEXT] Context loaded successfully (READ-WRITE):', {
        userId: profile.id,
        teamId: primaryTeam.id,
        teamName: primaryTeam.name,
        totalTeams: teams.length,
        sameRoleTeams: sameRoleTeams.length,
        isConsolidatedView,
        activeTeamIds
      })
    }

    return {
      user,
      profile,
      team: primaryTeam,
      teams,
      sameRoleTeams,
      activeTeamIds,
      isConsolidatedView,
      supabase
    }
  } catch (error) {
    // During build phase, auth errors are expected (no session) - don't log as errors
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
    if (!isBuildPhase) {
      logger.error('❌ [SERVER-ACTION-CONTEXT] Error getting auth context:', error)
    }

    // Si erreur d'authentification, rediriger vers login
    if (error instanceof Error && error.message.includes('auth')) {
      redirect('/auth/login?reason=auth_error')
    }

    // Autres erreurs, rediriger vers unauthorized
    redirect('/auth/unauthorized?reason=context_error')
  }
}

/**
 * Helper alternatif pour les cas où on veut juste vérifier l'auth
 * sans charger les équipes
 */
export const getServerUser = cache(async (requiredRole?: string) => {
  const { user, profile } = requiredRole
    ? await requireRole(requiredRole)
    : await requireRole()

  return { user, profile }
})
