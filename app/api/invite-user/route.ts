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


      // Mettre à jour ou créer l'enregistrement d'invitation
      try {
        console.log('📝 Updating invitation record for resend...')
        
        // Rechercher un utilisateur existant avec cet email
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (existingUser) {
          // Générer un nouveau token unique pour le resend
          const generateUniqueToken = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            let result = ''
            for (let i = 0; i < 20; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return result
          }

          const resendToken = generateUniqueToken()
          console.log('🔑 Generated unique resend token:', resendToken)

          // Construire l'URL de redirection avec le nouveau token
          const redirectToWithToken = `${redirectTo}?invitation_token=${resendToken}`
          console.log('🔗 Resend redirect URL with invitation token:', redirectToWithToken)

          // Mettre à jour l'invitation existante avec le nouveau token
          const { error: updateError } = await supabaseAdmin
            .from('user_invitations')
            .update({
              status: 'pending',
              invited_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 jours
              magic_link_token: resendToken, // Nouveau token généré
              updated_at: new Date().toISOString()
            })
            .eq('user_id', existingUser.id)
            .eq('email', email)

          if (updateError) {
            console.error('⚠️ Failed to update invitation record:', updateError)
          } else {
            console.log('✅ Invitation record updated for resend with token:', resendToken)
          }

          // Mettre à jour aussi les métadonnées utilisateur avec le nouveau token
          try {
            const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              user_metadata: {
                invitation_token: resendToken
              }
            })
            
            if (metadataError) {
              console.warn('⚠️ Failed to update user metadata with token:', metadataError)
            } else {
              console.log('✅ User metadata updated with resend token')
            }
          } catch (metaError) {
            console.warn('⚠️ Error updating user metadata:', metaError)
          }

          // Utiliser l'URL avec le token pour le magic link
          redirectTo = redirectToWithToken
        }
      } catch (recordError) {
        console.error('⚠️ Error managing invitation record:', recordError)
        // Non-critique, continuer
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

      // 1. Générer un token unique de 20 caractères pour cette invitation
      const generateUniqueToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let result = ''
        for (let i = 0; i < 20; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
      }

      const invitationToken = generateUniqueToken()
      console.log('🔑 Generated unique invitation token:', invitationToken)

      // 2. Construire l'URL de redirection avec le token d'invitation
      const redirectToWithToken = `${redirectTo}?invitation_token=${invitationToken}`
      console.log('🔗 Redirect URL with invitation token:', redirectToWithToken)

      // 3. Inviter l'utilisateur via Supabase Auth avec magic link et stocker le token dans les métadonnées
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`,
          role: role,
          team_id: teamId,
          invited: true,
          invitation_token: invitationToken // Stocker aussi le token dans les métadonnées comme backup
        },
        redirectTo: redirectToWithToken
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

      // 4. Créer l'enregistrement d'invitation avec le token généré
      try {
        console.log('📝 Creating invitation record with token...')
        const { error: invitationError } = await supabaseAdmin
          .from('user_invitations')
          .insert({
            user_id: inviteData.user.id,
            contact_id: '00000000-0000-0000-0000-000000000000', // ID factice pour les invitations sans contact
            team_id: teamId,
            email: inviteData.user.email!,
            role: role as Database['public']['Enums']['user_role'],
            status: 'pending' as Database['public']['Enums']['invitation_status'],
            magic_link_token: invitationToken // Stocker notre token personnalisé
          })

        if (invitationError) {
          console.error('⚠️ Failed to create invitation record:', invitationError)
          // Non-critique, continuer
        } else {
          console.log('✅ Invitation record created with token:', invitationToken)
        }
      } catch (invitationRecordError) {
        console.error('⚠️ Error creating invitation record:', invitationRecordError)
        // Non-critique, continuer
      }

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
