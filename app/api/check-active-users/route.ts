import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

// Client admin pour les opérations privilégiées
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: FAILLE SÉCURITÉ CORRIGÉE! (admin client utilisé sans auth check)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const body = await request.json()
    const { emails, teamId } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'emails array is required' },
        { status: 400 }
      )
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    logger.info({ emailCount: emails.length, teamId }, '👥 [CHECK-ACTIVE-USERS] Checking emails for team')

    // Vérifier quels emails correspondent à des utilisateurs actifs
    // Un utilisateur est "actif" s'il existe dans la table users avec cet email
    const { data: activeUsers, error } = await supabaseAdmin
      .from('users')
      .select('email')
      .in('email', emails.map(email => email.toLowerCase()))
      .eq('team_id', teamId)

    if (error) {
      logger.error({ error }, '❌ [CHECK-ACTIVE-USERS] Database error')
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des utilisateurs actifs' },
        { status: 500 }
      )
    }

    const activeEmails = activeUsers?.map(user => user.email) || []
    logger.info({ activeCount: activeEmails.length }, '✅ [CHECK-ACTIVE-USERS] Found active users')

    return NextResponse.json({
      success: true,
      activeEmails,
      totalChecked: emails.length,
      activeCount: activeEmails.length
    })

  } catch (error) {
    logger.error({ error }, '❌ [CHECK-ACTIVE-USERS] Unexpected error')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
