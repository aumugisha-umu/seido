import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

// Client Supabase avec permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  logger.warn({}, '⚠️ SUPABASE_SERVICE_ROLE_KEY not configured')
}

const supabaseAdmin = supabaseServiceRoleKey ? createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

/**
 * POST /api/check-email-team
 *
 * Vérifie si un email existe déjà dans une équipe spécifique (support multi-équipes).
 *
 * Architecture multi-équipes :
 * - 1 auth.users (auth_user_id) peut être lié à N public.users (un par équipe)
 * - Chaque équipe a sa propre entrée public.users pour le même email
 * - Validation : bloquer si email existe dans l'équipe courante
 * - Autoriser : si email existe dans une autre équipe ou n'existe pas
 *
 * Body:
 * - email: string - Email à vérifier
 * - teamId: string - ID de l'équipe courante
 *
 * Response:
 * - existsInCurrentTeam: boolean - True si email déjà dans cette équipe
 * - existsInOtherTeams: boolean - True si email existe dans d'autres équipes
 * - canCreate: boolean - True si on peut créer le contact (pas dans équipe courante)
 * - message: string - Message explicatif pour l'utilisateur
 */
export async function POST(request: Request) {
  try {
    // ✅ AUTH: 12 lignes → 3 lignes! (ancien pattern getServerSession → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    // Vérifier que le service admin est disponible
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service de validation non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { email, teamId } = body

    if (!email || !teamId) {
      return NextResponse.json(
        { error: 'Email et teamId sont requis' },
        { status: 400 }
      )
    }

    logger.info({ email, teamId }, '🔍 [CHECK-EMAIL-TEAM] Validating email for team')

    // Normaliser l'email
    const normalizedEmail = email.trim().toLowerCase()

    // Vérifier si l'email existe dans l'équipe courante (Service Role bypass RLS)
    const { data: existingInCurrentTeam, error: currentTeamError } = await supabaseAdmin
      .from('users')
      .select('id, email, team_id, role')
      .eq('email', normalizedEmail)
      .eq('team_id', teamId)
      .is('deleted_at', null) // ✅ FIX: Utiliser .is() pour vérifier NULL sur colonne timestamp
      .maybeSingle()

    if (currentTeamError && currentTeamError.code !== 'PGRST116') {
      logger.error({ error: currentTeamError }, '❌ [CHECK-EMAIL-TEAM] Error checking current team')
      throw new Error('Erreur lors de la vérification dans l\'équipe courante: ' + currentTeamError.message)
    }

    // Vérifier si l'email existe dans d'autres équipes (Service Role bypass RLS)
    const { data: existingInOtherTeams, error: otherTeamsError } = await supabaseAdmin
      .from('users')
      .select('id, email, team_id, role')
      .eq('email', normalizedEmail)
      .neq('team_id', teamId)
      .is('deleted_at', null) // ✅ FIX: Utiliser .is() pour vérifier NULL sur colonne timestamp

    if (otherTeamsError) {
      logger.error({ error: otherTeamsError }, '❌ [CHECK-EMAIL-TEAM] Error checking other teams')
      throw new Error('Erreur lors de la vérification dans les autres équipes: ' + otherTeamsError.message)
    }

    const existsInCurrentTeam = !!existingInCurrentTeam
    const existsInOtherTeams = !!existingInOtherTeams && existingInOtherTeams.length > 0
    const canCreate = !existsInCurrentTeam

    let message = ''
    if (existsInCurrentTeam) {
      message = `Un contact avec cet email existe déjà dans votre équipe.`
    } else if (existsInOtherTeams) {
      message = `Cet email existe dans une autre équipe. Vous pouvez créer ce contact dans votre équipe.`
    } else {
      message = `Cet email est disponible.`
    }

    logger.info({
      email: normalizedEmail,
      teamId,
      existsInCurrentTeam,
      existsInOtherTeams,
      canCreate
    }, `✅ [CHECK-EMAIL-TEAM] Validation completed:`)

    return NextResponse.json({
      existsInCurrentTeam,
      existsInOtherTeams,
      canCreate,
      message
    })

  } catch (error) {
    logger.error({ error }, '❌ [CHECK-EMAIL-TEAM] Unexpected error')
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
