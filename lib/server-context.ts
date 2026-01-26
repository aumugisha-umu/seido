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
import { requireRole } from '@/lib/auth-dal'
import { createServerTeamService, createServerSupabaseClient, createServerActionSupabaseClient } from '@/lib/services'
import type { Team, ServerSupabaseClient } from '@/lib/services/core/service-types'
import type { Database } from '@/database.types'
import { logger } from '@/lib/logger'

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
    logger.info('🔍 [SERVER-CONTEXT] Getting authenticated context (READ-ONLY)...', { requiredRole })

    // ✅ PERF: Paralléliser création client + service + auth check
    const [supabase, teamService, authResult] = await Promise.all([
      createServerSupabaseClient(),
      createServerTeamService(),
      requiredRole ? requireRole(requiredRole) : requireRole()
    ])

    const { user, profile } = authResult

    logger.info('✅ [SERVER-CONTEXT] User authenticated:', {
      userId: profile.id,
      email: profile.email,
      role: profile.role
    })

    // Charger équipes de l'utilisateur (dépend du profile.id)
    const teamsResult = await teamService.getUserTeams(profile.id)

    if (!teamsResult.success || !teamsResult.data || teamsResult.data.length === 0) {
      logger.error('❌ [SERVER-CONTEXT] User has no team:', {
        userId: profile.id,
        email: profile.email
      })
      redirect('/auth/unauthorized?reason=no_team')
    }

    const teams = teamsResult.data
    const primaryTeam = teams[0] // Prendre la première équipe comme équipe principale

    logger.info('✅ [SERVER-CONTEXT] Context loaded successfully (READ-ONLY):', {
      userId: profile.id,
      teamId: primaryTeam.id,
      teamName: primaryTeam.name,
      totalTeams: teams.length
    })

    return {
      user,
      profile,
      team: primaryTeam,
      teams,
      supabase
    }
  } catch (error) {
    logger.error('❌ [SERVER-CONTEXT] Error getting auth context:', error)

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
    logger.info('🔍 [SERVER-ACTION-CONTEXT] Getting authenticated context (READ-WRITE)...', { requiredRole })

    // ✅ PERF: Paralléliser création client + service + auth check
    const [supabase, teamService, authResult] = await Promise.all([
      createServerActionSupabaseClient(),
      createServerTeamService(),
      requiredRole ? requireRole(requiredRole) : requireRole()
    ])

    const { user, profile } = authResult

    logger.info('✅ [SERVER-ACTION-CONTEXT] User authenticated:', {
      userId: profile.id,
      email: profile.email,
      role: profile.role
    })

    // Charger équipes de l'utilisateur (dépend du profile.id)
    // ⚠️ Pour Server Actions, on ne cache pas (car mutation possible)
    const teamsResult = await teamService.getUserTeams(profile.id)

    if (!teamsResult.success || !teamsResult.data || teamsResult.data.length === 0) {
      logger.error('❌ [SERVER-ACTION-CONTEXT] User has no team:', {
        userId: profile.id,
        email: profile.email
      })
      redirect('/auth/unauthorized?reason=no_team')
    }

    const teams = teamsResult.data
    const primaryTeam = teams[0] // Prendre la première équipe comme équipe principale

    logger.info('✅ [SERVER-ACTION-CONTEXT] Context loaded successfully (READ-WRITE):', {
      userId: profile.id,
      teamId: primaryTeam.id,
      teamName: primaryTeam.name,
      totalTeams: teams.length
    })

    return {
      user,
      profile,
      team: primaryTeam,
      teams,
      supabase
    }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION-CONTEXT] Error getting auth context:', error)

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
