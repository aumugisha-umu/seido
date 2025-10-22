import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

// Créer un client Supabase avec les permissions admin
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

export async function POST(request: Request) {
  try {
    // ✅ SECURITY FIX: Cette route n'avait AUCUNE vérification d'auth!
    // N'importe qui pouvait marquer des invitations comme acceptées
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { email, invitationCode } = body

    if (!email && !invitationCode) {
      return NextResponse.json(
        { error: 'Email ou code d\'invitation manquant' },
        { status: 400 }
      )
    }

    logger.info({ email, hasCode: !!invitationCode }, '📧 [MARK-INVITATION-API] Processing invitation acceptance:')

    let result

    if (invitationCode) {
      // Marquer par invitation_code (plus précis)
      logger.info({ invitationCode: invitationCode }, '🔑 [MARK-INVITATION-API] Marking invitation by code:')
      logger.info({
        table: 'user_invitations',
        where: {
          invitation_code: invitationCode,
          status: 'pending'
        }
      }, '🔍 [MARK-INVITATION-API-DEBUG] Searching user_invitations with query:')
      
      // D'abord, regarder TOUTES les invitations pour ce code pour diagnostic
      const { data: allInvitationsForCode } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('invitation_code', invitationCode)
      
      logger.info({
        count: allInvitationsForCode?.length || 0,
        invitations: allInvitationsForCode?.map(inv => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
          invitation_code: inv.invitation_code,
          accepted_at: inv.accepted_at,
          created_at: inv.created_at
        }, '🔍 [MARK-INVITATION-API-DEBUG] ALL invitations for code:'))
      })
      
      const { data: existingInvitation, error: checkError } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending')
        .single()
      
      if (checkError || !existingInvitation) {
        logger.error({ invitationCode: invitationCode }, '❌ [MARK-INVITATION-API] No pending invitation found for code:')
        logger.error({ error: checkError }, '❌ [MARK-INVITATION-API] CheckError details:')
        return NextResponse.json(
          { error: 'Invitation non trouvée ou déjà acceptée pour ce code' },
          { status: 404 }
        )
      }

      logger.info({
        id: existingInvitation.id,
        email: existingInvitation.email,
        status: existingInvitation.status,
        invitation_code: existingInvitation.invitation_code,
        accepted_at: existingInvitation.accepted_at,
        team: existingInvitation.team_id,
        created_at: existingInvitation.created_at
      }, '🔍 [MARK-INVITATION-API] Found pending invitation:')

      logger.info({
        update: {
          status: 'accepted',
          accepted_at: 'NOW()'
        },
        where: {
          invitation_code: invitationCode,
          status: 'pending'
        }
      }, '⚡ [MARK-INVITATION-API-DEBUG] Executing update query')
      
      const { data, error } = await supabaseAdmin
        .from('user_invitations')
        .update({
          status: 'accepted', // ✅ NOUVEAU: Changer le statut
          accepted_at: new Date().toISOString()
        })
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending') // ✅ NOUVEAU: Seulement les invitations pending
        .select()
      
      logger.info({
        success: !error,
        error: error,
        updatedCount: data?.length || 0,
        updatedInvitations: data?.map(inv => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
          accepted_at: inv.accepted_at
        }, '📊 [MARK-INVITATION-API-DEBUG] Update result:'))
      })
      
      result = { data, error }
      
    } else {
      // Marquer par email (fallback)
      logger.info({ email: email }, '📧 [MARK-INVITATION-API] Marking invitation by email:')
      
      const { data: existingInvitations } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending') // ✅ NOUVEAU: Utiliser le statut au lieu de accepted_at
      
      logger.info({ invitationCount: existingInvitations?.length || 0 }, '🔍 [MARK-INVITATION-API] Found pending invitations for email')
      existingInvitations?.forEach((inv, index) => {
        logger.info({
          index: index + 1,
          invId: inv.id,
          invStatus: inv.status,
          invTeamId: inv.team_id
        }, "Found invitation")
      })

      const { data, error } = await supabaseAdmin
        .from('user_invitations')
        .update({
          status: 'accepted', // ✅ NOUVEAU: Changer le statut
          accepted_at: new Date().toISOString()
        })
        .eq('email', email)
        .eq('status', 'pending') // ✅ NOUVEAU: Seulement les invitations pending
        .select()
      
      result = { data, error }
    }

    if (result.error) {
      logger.error({ error: result.error }, '❌ [MARK-INVITATION-API] Update error:')
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour: ' + result.error.message },
        { status: 500 }
      )
    }

    logger.info({ result: result.data?.length || 0 }, "✅ [MARK-INVITATION-API] invitation(s) marked as accepted")
    result.data?.forEach((inv, index) => {
      logger.info({
        index: index + 1,
        invId: inv.id,
        invStatus: inv.status,
        invAcceptedAt: inv.accepted_at
      }, "✅ Updated invitation")
    })

    return NextResponse.json({
      success: true,
      count: result.data?.length || 0,
      invitations: result.data || []
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [MARK-INVITATION-API] Critical error:')
    return NextResponse.json(
      { error: 'Erreur serveur lors du marquage de l\'invitation' },
      { status: 500 }
    )
  }
}
