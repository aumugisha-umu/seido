import { createClient } from '@supabase/supabase-js'
import { userService, teamService } from '@/lib/database-service'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

// Créer un client Supabase avec les permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured - invitations will be disabled')
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
    // Vérifier si le service d'invitation est disponible
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service d\'invitation non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const body = await request.json()
    
    const {
      email,
      firstName,
      lastName,
      phone,
      role,
      teamId
    } = body

    // Validation des données
    if (!email || !firstName || !lastName || !role || !teamId) {
      return NextResponse.json(
        { error: 'Données manquantes pour l\'invitation' },
        { status: 400 }
      )
    }

    console.log('📧 Inviting user:', { email, role, teamId })

    // 1. Inviter l'utilisateur via Supabase Auth avec magic link
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        role: role,
        team_id: teamId,
        invited: true
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/signup-success`
    })

    if (inviteError) {
      console.error('❌ Invitation error:', inviteError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'invitation: ' + inviteError.message },
        { status: 500 }
      )
    }

    if (!inviteData.user) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'invitation' },
        { status: 500 }
      )
    }

    console.log('✅ Invitation sent, user ID:', inviteData.user.id)

    // 2. ✅ CORRECTION: Créer d'abord le profil utilisateur
    console.log('📝 Creating user profile FIRST...')
    const userData = {
      id: inviteData.user.id,
      email: inviteData.user.email!,
      name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      role: role as Database['public']['Enums']['user_role'],
      phone: phone || null,
    }

    try {
      const userProfile = await userService.create(userData)
      console.log('✅ User profile created:', userProfile.id)
    } catch (userError) {
      console.error('❌ CRITICAL ERROR: Failed to create user profile:', userError)
      return NextResponse.json(
        { error: 'Erreur critique: impossible de créer le profil utilisateur: ' + (userError instanceof Error ? userError.message : String(userError)) },
        { status: 500 }
      )
    }

    // 3. Maintenant ajouter l'utilisateur à l'équipe (le profil existe)
    try {
      await teamService.addMember(teamId, inviteData.user.id, 'member')
      console.log('✅ User added to team AFTER profile creation:', teamId)
    } catch (teamError) {
      console.error('❌ ERROR: Failed to add user to team after profile creation:', teamError)
      // Le profil existe mais pas dans l'équipe - pas critique car le contact est créé
      console.log('⚠️ User profile exists but not in team - this is non-critical')
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation envoyée avec succès',
      userId: inviteData.user.id
    })

  } catch (error) {
    console.error('❌ Unexpected error in invite-user API:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
