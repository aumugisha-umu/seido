import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
// Créer un client Supabase avec les permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  logger.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured')
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

    logger.info('📧 [MARK-INVITATION-API] Processing invitation acceptance:', { email, hasCode: !!invitationCode })

    let result

    if (invitationCode) {
      // Marquer par invitation_code (plus précis)
      logger.info('🔑 [MARK-INVITATION-API] Marking invitation by code:', invitationCode)
      logger.info('🔍 [MARK-INVITATION-API-DEBUG] Searching user_invitations with query:', {
        table: 'user_invitations',
        where: {
          invitation_code: invitationCode,
          status: 'pending'
        }
      })
      
      // D'abord, regarder TOUTES les invitations pour ce code pour diagnostic
      const { data: allInvitationsForCode } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('invitation_code', invitationCode)
      
      logger.info('🔍 [MARK-INVITATION-API-DEBUG] ALL invitations for code:', {
        count: allInvitationsForCode?.length || 0,
        invitations: allInvitationsForCode?.map(inv => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
          invitation_code: inv.invitation_code,
          accepted_at: inv.accepted_at,
          created_at: inv.created_at
        }))
      })
      
      const { data: existingInvitation, error: checkError } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending')
        .single()
      
      if (checkError || !existingInvitation) {
        logger.error('❌ [MARK-INVITATION-API] No pending invitation found for code:', invitationCode)
        logger.error('❌ [MARK-INVITATION-API] CheckError details:', checkError)
        return NextResponse.json(
          { error: 'Invitation non trouvée ou déjà acceptée pour ce code' },
          { status: 404 }
        )
      }

      logger.info('🔍 [MARK-INVITATION-API] Found pending invitation:', {
        id: existingInvitation.id,
        email: existingInvitation.email,
        status: existingInvitation.status,
        invitation_code: existingInvitation.invitation_code,
        accepted_at: existingInvitation.accepted_at,
        team: existingInvitation.team_id,
        created_at: existingInvitation.created_at
      })

      logger.info('⚡ [MARK-INVITATION-API-DEBUG] Executing update query:', {
        update: {
          status: 'accepted',
          accepted_at: 'NOW()'
        },
        where: {
          invitation_code: invitationCode,
          status: 'pending'
        }
      })
      
      const { data, error } = await supabaseAdmin
        .from('user_invitations')
        .update({
          status: 'accepted', // ✅ NOUVEAU: Changer le statut
          accepted_at: new Date().toISOString()
        })
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending') // ✅ NOUVEAU: Seulement les invitations pending
        .select()
      
      logger.info('📊 [MARK-INVITATION-API-DEBUG] Update result:', {
        success: !error,
        error: error,
        updatedCount: data?.length || 0,
        updatedInvitations: data?.map(inv => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
          accepted_at: inv.accepted_at
        }))
      })
      
      result = { data, error }
      
    } else {
      // Marquer par email (fallback)
      logger.info('📧 [MARK-INVITATION-API] Marking invitation by email:', email)
      
      const { data: existingInvitations } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending') // ✅ NOUVEAU: Utiliser le statut au lieu de accepted_at
      
      logger.info('🔍 [MARK-INVITATION-API] Found pending invitations for email:', existingInvitations?.length || 0)
      existingInvitations?.forEach((inv, index) => {
        logger.info(`  ${index + 1}. ID: ${inv.id}, Status: ${inv.status}, Team: ${inv.team_id}`)
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
      logger.error('❌ [MARK-INVITATION-API] Update error:', result.error)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour: ' + result.error.message },
        { status: 500 }
      )
    }

    logger.info(`✅ [MARK-INVITATION-API] ${result.data?.length || 0} invitation(s) marked as accepted`)
    result.data?.forEach((inv, index) => {
      logger.info(`  ✅ Updated invitation ${index + 1}: ${inv.id} → status: ${inv.status}, accepted_at: ${inv.accepted_at}`)
    })

    return NextResponse.json({
      success: true,
      count: result.data?.length || 0,
      invitations: result.data || []
    })

  } catch (error) {
    logger.error('❌ [MARK-INVITATION-API] Critical error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du marquage de l\'invitation' },
      { status: 500 }
    )
  }
}
