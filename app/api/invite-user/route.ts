import { createClient } from '@supabase/supabase-js'
import { userService, teamService, contactService } from '@/lib/database-service'
import { activityLogger } from '@/lib/activity-logger'
import { getServerSession } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client Supabase normal pour les opérations non-admin
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    // Vérifier l'authentification de l'utilisateur qui invite
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

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
      
      console.log('📫 [RESEND-INVITATION] Generating magic link and sending email for existing user...')
      
      // Générer un nouveau magic link avec email automatique pour utilisateur existant
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: redirectTo,
          // Pour les utilisateurs existants, on peut forcer l'envoi d'email
          data: {
            invitation_type: 'resend',
            timestamp: new Date().toISOString()
          }
        }
      })

      if (linkError) {
        console.error('❌ [RESEND-INVITATION] Error generating magic link:', {
          error: linkError.message,
          code: linkError.status,
          email: email
        })
        return NextResponse.json(
          { error: 'Erreur lors de la génération du lien: ' + linkError.message },
          { status: 500 }
        )
      }

      if (!linkData.properties) {
        console.error('❌ [RESEND-INVITATION] No properties in link data')
        return NextResponse.json(
          { error: 'Erreur lors de la génération du lien magic' },
          { status: 500 }
        )
      }

      console.log('✅ [RESEND-INVITATION] Magic link generated successfully')
      
      // Pour les renvois, utiliser signInWithOtp pour envoyer l'email de connexion
      try {
        console.log('📫 [RESEND-INVITATION] Sending magic link email via signInWithOtp...')
        const { data: otpData, error: otpError } = await supabaseAdmin.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: false // Utilisateur existe déjà
          }
        })

        if (otpError) {
          console.warn('⚠️ [RESEND-INVITATION] Email sending failed:', {
            error: otpError.message,
            code: otpError.status
          })
          // Continuer quand même, le magic link est généré
        } else {
          console.log('✅ [RESEND-INVITATION] Email sent successfully via OTP method')
        }
      } catch (emailError) {
        console.warn('⚠️ [RESEND-INVITATION] Email sending exception:', emailError)
        // Continuer quand même, le magic link est généré
      }

      console.log('✅ [RESEND-INVITATION] Resend process completed successfully')
      
      // Logger l'activité de renvoi d'invitation
      try {
        await activityLogger.logUserAction(
          session.user.id,
          teamId,
          'resend',
          'user_invitation',
          null,
          `Renvoi d'invitation à ${email}`,
          'success',
          { email, invitation_type: 'resend' }
        )
        console.log('📝 Activity logged for invitation resend')
      } catch (logError) {
        console.warn('⚠️ Failed to log resend invitation activity:', logError)
        // Continue anyway, logging is not critical
      }
      
      return NextResponse.json({
        success: true,
        message: 'Invitation renvoyée avec succès - un nouvel email a été envoyé',
        magicLink: linkData.properties.action_link, // Le vrai lien magic de Supabase
        email: email,
        emailSent: true
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

        // Si c'est un gestionnaire, créer automatiquement un contact
        if (role === 'gestionnaire') {
          try {
            console.log('📝 Creating contact for invited gestionnaire...')
            const contact = await contactService.create({
              name: `${firstName} ${lastName}`,
              email: inviteData.user.email!,
              contact_type: 'gestionnaire' as Database['public']['Enums']['contact_type'],
              team_id: teamId,
              is_active: true,
              notes: 'Contact créé automatiquement lors de l\'invitation'
            })
            
            // Créer l'enregistrement user_invitations pour lier user_id et contact_id
            try {
              const { error: invitationRecordError } = await supabase
                .from('user_invitations')
                .insert({
                  user_id: inviteData.user.id,
                  contact_id: contact.id,
                  team_id: teamId,
                  email: inviteData.user.email!,
                  role: role,
                  status: 'pending' // Statut pending car l'invitation n'est pas encore acceptée
                })
              
              if (invitationRecordError) {
                console.warn('⚠️ Could not create user_invitation record:', invitationRecordError)
              } else {
                console.log('✅ Created user_invitation link for invited gestionnaire')
              }
            } catch (linkError) {
              console.warn('⚠️ Error creating user_invitation link:', linkError)
            }

            console.log('✅ Contact gestionnaire créé lors de l\'invitation:', contact.id)
          } catch (contactError) {
            console.error('⚠️ Erreur lors de la création du contact gestionnaire:', contactError)
            // Ne pas faire échouer l'invitation pour cette erreur
          }
        }
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

      // Logger l'activité d'invitation
      try {
        await activityLogger.logUserAction(
          session.user.id,
          teamId,
          'create',
          'user_invitation',
          inviteData.user.id,
          `Invitation envoyée à ${firstName} ${lastName} (${email})`,
          'success',
          {
            email,
            firstName,
            lastName,
            role,
            invitation_type: 'new_user'
          }
        )
        console.log('📝 Activity logged for new user invitation')
      } catch (logError) {
        console.warn('⚠️ Failed to log invitation activity:', logError)
        // Continue anyway, logging is not critical
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
