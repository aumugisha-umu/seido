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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    console.log('📧 [TEAM-INVITATIONS] Fetching all invitations for team:', teamId)

    // Récupérer toutes les invitations de cette équipe (tous statuts)
    const { data: invitations, error } = await supabaseAdmin
      .from('user_invitations')
      .select(`
        id,
        email,
        status,
        first_name,
        last_name,
        role,
        created_at,
        accepted_at,
        expires_at,
        invited_at
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [TEAM-INVITATIONS] Database error:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des invitations' },
        { status: 500 }
      )
    }

    console.log('✅ [TEAM-INVITATIONS] Found', invitations?.length || 0, 'invitations')

    return NextResponse.json({
      success: true,
      invitations: invitations || [],
      count: invitations?.length || 0
    })

  } catch (error) {
    console.error('❌ [TEAM-INVITATIONS] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
