import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const body = await request.json()
    const { emails, teamId } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'emails array is required' },
        { status: 400 }
      )
    }

    if (!_teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    console.log('👥 [CHECK-ACTIVE-USERS] Checking', emails.length, 'emails for team:', _teamId)

    // Vérifier quels emails correspondent à des utilisateurs actifs
    // Un utilisateur est "actif" s'il existe dans la table users avec cet email
    const { data: activeUsers, error } = await supabaseAdmin
      .from('users')
      .select('email')
      .in('email', emails.map(email => email.toLowerCase()))
      .eq('team_id', _teamId)

    if (error) {
      console.error('❌ [CHECK-ACTIVE-USERS] Database error:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des utilisateurs actifs' },
        { status: 500 }
      )
    }

    const activeEmails = activeUsers?.map(user => user.email) || []
    console.log('✅ [CHECK-ACTIVE-USERS] Found', activeEmails.length, 'active users')

    return NextResponse.json({
      success: true,
      activeEmails,
      totalChecked: emails.length,
      activeCount: activeEmails.length
    })

  } catch (error) {
    console.error('❌ [CHECK-ACTIVE-USERS] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
