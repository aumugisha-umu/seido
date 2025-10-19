import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'

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
 * 🧪 DEBUG ROUTE - Get last invitation link
 * Usage: GET http://localhost:3000/api/test/get-last-invitation-link
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service non configuré' },
        { status: 503 }
      )
    }

    // Récupérer la dernière invitation créée
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Aucune invitation trouvée' },
        { status: 404 }
      )
    }

    // Construire le lien d'invitation
    const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?token=${invitation.invitation_code}&type=invitation`

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        status: invitation.status,
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at,
        invitationUrl: invitationUrl
      }
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [GET-LAST-INVITATION-LINK] Error:')
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
