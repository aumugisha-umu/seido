import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

// Créer un client Supabase avec les permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured')
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
    const { email, invitationToken } = body

    if (!email && !invitationToken) {
      return NextResponse.json(
        { error: 'Email ou token d\'invitation manquant' },
        { status: 400 }
      )
    }

    console.log('✅ [MARK-INVITATION-API] Starting with:', { email, hasToken: !!invitationToken })

    let result

    if (invitationToken) {
      // Marquer par token (plus précis)
      console.log('🔑 [MARK-INVITATION-API] Marking invitation by token:', invitationToken)
      
      const { data: existingInvitation, error: checkError } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('magic_link_token', invitationToken)
        .single()
      
      if (checkError || !existingInvitation) {
        console.error('❌ [MARK-INVITATION-API] No invitation found for token:', invitationToken)
        return NextResponse.json(
          { error: 'Invitation non trouvée pour ce token' },
          { status: 404 }
        )
      }

      console.log('🔍 [MARK-INVITATION-API] Found invitation:', {
        id: existingInvitation.id,
        email: existingInvitation.email,
        status: existingInvitation.status,
        team: existingInvitation.team_id
      })

      const { data, error } = await supabaseAdmin
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('magic_link_token', invitationToken)
        .select()
      
      result = { data, error }
      
    } else {
      // Marquer par email (fallback)
      console.log('📧 [MARK-INVITATION-API] Marking invitation by email:', email)
      
      const { data: existingInvitations, error: checkError } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('email', email)
      
      console.log('🔍 [MARK-INVITATION-API] Found invitations for email:', existingInvitations?.length || 0)
      existingInvitations?.forEach((inv, index) => {
        console.log(`  ${index + 1}. ID: ${inv.id}, Status: ${inv.status}, Team: ${inv.team_id}`)
      })

      const { data, error } = await supabaseAdmin
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .eq('status', 'pending')
        .select()
      
      result = { data, error }
    }

    if (result.error) {
      console.error('❌ [MARK-INVITATION-API] Update error:', result.error)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour: ' + result.error.message },
        { status: 500 }
      )
    }

    console.log(`✅ [MARK-INVITATION-API] ${result.data.length} invitation(s) marked as accepted`)
    result.data.forEach((inv, index) => {
      console.log(`  ✅ Updated invitation ${index + 1}: ${inv.id} → ${inv.status}`)
    })

    return NextResponse.json({
      success: true,
      count: result.data.length,
      invitations: result.data
    })

  } catch (error) {
    console.error('❌ [MARK-INVITATION-API] Critical error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du marquage de l\'invitation' },
      { status: 500 }
    )
  }
}
