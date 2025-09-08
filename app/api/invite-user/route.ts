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
      teamId,
      isResend = false // Nouveau paramètre pour distinguer création vs renvoi
    } = body

    // Validation des données
    if (!email) {
      return NextResponse.json(
        { error: 'Email manquant' },
        { status: 400 }
      )
    }

    // Rediriger vers la page callback qui traitera l'authentification
    let redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`

    if (isResend) {
      // CAS 2: RENVOI D'INVITATION (utilisateur existe déjà)
      console.log('🔄 Resending invitation to existing user:', email)
      
      // Générer un nouveau magic link pour l'utilisateur existant
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: redirectTo
        }
      })

      if (linkError) {
        console.error('❌ Error generating magic link:', linkError)
        return NextResponse.json(
          { error: 'Erreur lors de la génération du lien: ' + linkError.message },
          { status: 500 }
        )
      }

      if (!linkData.properties) {
        return NextResponse.json(
          { error: 'Erreur lors de la génération du lien magic' },
          { status: 500 }
        )
      }

      // Envoyer aussi l'email automatiquement
      try {
        const { error: resendError } = await supabaseAdmin.auth.resend({
          type: 'signup',
          email: email,
          options: {
            emailRedirectTo: redirectTo
          }
        })

        if (resendError) {
          console.warn('⚠️ Email resend failed, but magic link was generated:', resendError.message)
        } else {
          console.log('✅ Confirmation email also sent successfully')
        }
      } catch (emailError) {
        console.warn('⚠️ Email sending failed, but magic link was generated:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation renvoyée avec succès',
        magicLink: linkData.properties.action_link, // Le vrai lien magic de Supabase
        email: email
      })

    } else {
      // CAS 1: NOUVELLE INVITATION (création d'utilisateur)
      if (!firstName || !lastName || !role || !teamId) {
        return NextResponse.json(
          { error: 'Données manquantes pour la création d\'utilisateur' },
          { status: 400 }
        )
      }

      console.log('📧 Inviting new user:', { email, role, teamId })

      // Inviter l'utilisateur via Supabase Auth avec magic link
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
        redirectTo: redirectTo
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

      // Note: user_invitations record creation skipped - requires contact_id which we don't have for direct user invitations
      console.log('📝 Skipping user_invitations record creation (requires contact_id for database constraint)')

      return NextResponse.json({
        success: true,
        message: 'Invitation envoyée avec succès',
        userId: inviteData.user.id
      })
    } // Fin du cas nouvelle invitation

  } catch (error) {
    console.error('❌ Unexpected error in invite-user API:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
