import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * GET /api/user-teams
 * Récupère les équipes d'un utilisateur (team_members actifs)
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ AUTH: Pattern uniforme
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || userProfile.id

    logger.info({ userId }, '👥 [USER-TEAMS] Fetching user teams')

    // Récupérer les équipes de l'utilisateur via team_members
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        joined_at,
        team:team_id (
          id,
          name,
          settings,
          created_at
        )
      `)
      .eq('user_id', userId)
      .is('left_at', null) // Seulement les memberships actifs

    if (error) {
      logger.error({ error }, '❌ [USER-TEAMS] Database error')
      return NextResponse.json(
        { error: 'Failed to fetch user teams' },
        { status: 500 }
      )
    }

    // Transformer les données
    const teams = (data || [])
      .filter(member => member.team)
      .map(member => ({
        id: member.team.id,
        name: member.team.name,
        settings: member.team.settings,
        created_at: member.team.created_at,
        user_role: member.role,
        joined_at: member.joined_at
      }))

    logger.info({ count: teams.length }, '✅ [USER-TEAMS] Teams fetched successfully')

    // ⚡ CACHE: 1 heure pour les équipes utilisateur (données stables, privées par utilisateur)
    return NextResponse.json({
      success: true,
      data: teams
    }, {
      headers: {
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=7200'
      }
    })

  } catch (error) {
    logger.error({ error }, '❌ [USER-TEAMS] Unexpected error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
