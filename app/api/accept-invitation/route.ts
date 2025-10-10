import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/services'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * POST /api/accept-invitation
 * Marque l'invitation comme acceptée quand l'utilisateur définit son mot de passe
 */
export async function POST() {
  try {
    // ============================================================================
    // ÉTAPE 1: AUTH VERIFICATION
    // ============================================================================
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userEmail = session.user.email
    if (!userEmail) {
      return NextResponse.json({ error: 'Email utilisateur non trouvé' }, { status: 400 })
    }

    logger.info({ email: userEmail }, '📧 [ACCEPT-INVITATION] Processing invitation acceptance')

    // ============================================================================
    // ÉTAPE 2: FIND PENDING INVITATION
    // ============================================================================
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('id, team_id, status')
      .eq('email', userEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invitationError) {
      logger.error({ invitationError }, '❌ Error fetching invitation')
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'invitation' },
        { status: 500 }
      )
    }

    if (!invitation) {
      logger.info({}, 'ℹ️ No pending invitation found (user may have been invited before or no invitation exists)')
      return NextResponse.json({
        success: true,
        message: 'Aucune invitation en attente'
      })
    }

    // ============================================================================
    // ÉTAPE 3: UPDATE INVITATION STATUS
    // ============================================================================
    const { error: updateError } = await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      logger.error({ updateError }, '❌ Failed to update invitation status')
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de l\'invitation' },
        { status: 500 }
      )
    }

    logger.info({ invitationId: invitation.id }, '✅ Invitation marked as accepted')

    return NextResponse.json({
      success: true,
      message: 'Invitation acceptée avec succès',
      invitationId: invitation.id
    })

  } catch (error) {
    logger.error({ error }, '❌ Unexpected error in accept-invitation')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
