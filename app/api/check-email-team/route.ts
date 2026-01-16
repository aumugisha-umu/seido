import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient, isServiceRoleAvailable } from '@/lib/api-service-role-helper'
import { checkEmailTeamSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

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
    if (!isServiceRoleAvailable()) {
      return NextResponse.json(
        { error: 'Service de validation non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const supabaseAdmin = getServiceRoleClient()
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(checkEmailTeamSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [CHECK-EMAIL-TEAM] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { email, teamId } = validatedData

    logger.info({ email, teamId }, '🔍 [CHECK-EMAIL-TEAM] Validating email for team')

    // Email already normalized by schema (toLowerCase + trim)
    const normalizedEmail = email

    // Vérifier si l'email existe dans l'équipe courante (Service Role bypass RLS)
    const { data: existingInCurrentTeam, error: currentTeamError } = await supabaseAdmin
      .from('users')
      .select('id, email, team_id, role, auth_user_id')
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

    // Vérifier si le contact dans l'équipe courante a un compte auth
    // ⚠️ CONFIDENTIALITÉ : On ne révèle cette info que pour l'équipe courante
    const hasAuthAccount = existsInCurrentTeam && existingInCurrentTeam?.auth_user_id !== null

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
      hasAuthAccount,
      canCreate
    }, `✅ [CHECK-EMAIL-TEAM] Validation completed:`)

    return NextResponse.json({
      existsInCurrentTeam,
      existsInOtherTeams,
      canCreate,
      hasAuthAccount,
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
