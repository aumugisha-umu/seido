import { createClient } from '@supabase/supabase-js'
import { userService, teamService } from '@/lib/database-service'
import { activityLogger } from '@/lib/activity-logger'
import { getServerSession } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

// Client Supabase avec permissions admin
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
    // Vérifier l'authentification et récupérer le profil utilisateur
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer le profil utilisateur pour avoir le bon ID
    const currentUserProfile = await userService.findByAuthUserId(session.user.id)
    if (!currentUserProfile) {
      return NextResponse.json(
        { error: 'Profil utilisateur non trouvé' },
        { status: 404 }
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
      role = 'gestionnaire', 
      teamId, 
      phone,
      shouldInviteToApp = false  // ✅ NOUVELLE LOGIQUE SIMPLE
    } = body

    console.log('📧 [INVITE-USER-SIMPLE] Creating contact:', { 
      email, 
      firstName, 
      lastName, 
      shouldInviteToApp,
      teamId 
    })

    // ÉTAPE 1: CRÉER USER + LIEN ÉQUIPE (TOUJOURS)
    console.log('👤 [STEP-1] Creating user profile...')
    
    let userProfile
    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userService.findByEmail(email)
      
      if (existingUser) {
        console.log('✅ [STEP-1] User already exists:', existingUser.id)
        userProfile = existingUser
      } else {
        // Créer nouveau user
        userProfile = await userService.create({
          auth_user_id: null, // Pas encore d'auth
        email: email,
          name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
          role: role as Database['public']['Enums']['user_role'],
          phone: phone || null,
          team_id: teamId,
          is_active: true
        })
        console.log('✅ [STEP-1] User profile created:', userProfile.id)
      }
    } catch (userError) {
      console.error('❌ [STEP-1] Failed to create user:', userError)
        return NextResponse.json(
        { error: 'Erreur lors de la création du contact: ' + (userError instanceof Error ? userError.message : String(userError)) },
          { status: 500 }
        )
      }

    // Ajouter à l'équipe si pas déjà membre
    try {
      await teamService.addMember(teamId, userProfile.id, 'member')
      console.log('✅ [STEP-1] User added to team:', teamId)
    } catch (teamError) {
      console.log('⚠️ [STEP-1] User might already be in team or team error:', teamError)
      // Non bloquant, continuer
    }

    let invitationResult = null

    // ÉTAPE 2: INVITATION OPTIONNELLE (SI CHECKBOX COCHÉE)
    if (shouldInviteToApp) {
      console.log('📨 [STEP-2] Creating auth invitation...')
      
      try {
        // Vérifier si l'utilisateur a déjà un auth_user_id (renvoi d'invitation)
        if (userProfile.auth_user_id) {
          console.log('🔄 [STEP-2] User already has auth_user_id, this is a resend - generating new invitation...')
          
          // Pour un renvoi, on peut forcer la création d'une nouvelle invitation
          // ou utiliser une autre méthode selon la logique Supabase
        }
        
        // Créer l'invitation Supabase Auth
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        
      // D'abord générer le magic link pour avoir le vrai lien
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
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

      console.log('📋 [STEP-2] Supabase generateLink response:', {
        hasUser: !!linkData?.user,
        hasActionLink: !!linkData?.properties?.action_link,
        userId: linkData?.user?.id,
        email: linkData?.user?.email
      })

      let inviteData = linkData
      let inviteError = linkError

      // Si la génération de lien réussit, envoyer aussi l'email d'invitation
      if (!inviteError && linkData?.user) {
        console.log('📧 [STEP-2] Sending invitation email via inviteUserByEmail...')
        const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
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
        
        if (emailError) {
          console.warn('⚠️ [STEP-2] Failed to send email, but magic link generated:', emailError.message)
        } else {
          console.log('✅ [STEP-2] Invitation email sent successfully')
        }
      }

      if (inviteError) {
          console.error('❌ [STEP-2] generateLink failed:', inviteError?.message || inviteError)
          throw inviteError
        } else {
          // Traitement normal : nouvelle invitation créée avec succès
          // Mettre à jour le user avec l'auth_user_id
          if (inviteData?.user) {
          await userService.update(userProfile.id, {
            auth_user_id: inviteData.user.id
          })
          console.log('✅ [STEP-2] User linked to auth:', inviteData.user.id)
          
          // ✅ SOLUTION: Créer aussi une entrée dans la table user_invitations pour le suivi
          console.log('📋 [STEP-2] Creating invitation record in user_invitations table...')
          try {
            const { data: invitationRecord, error: invitationError } = await supabaseAdmin
              .from('user_invitations')
              .insert({
                email: email,
                first_name: firstName,
                last_name: lastName,
                role: role,
                team_id: teamId,
                invited_by: currentUserProfile.id, // L'utilisateur qui fait l'invitation
                invitation_code: inviteData.user.id, // Utiliser l'auth user ID comme code unique
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
              })
              .select()
              .single()

            if (invitationError) {
              console.error('⚠️ [STEP-2] Failed to create invitation record:', invitationError)
              // Ne pas faire échouer l'invitation principale pour cette erreur
            } else {
              console.log('✅ [STEP-2] Invitation record created:', invitationRecord.id)
            }
          } catch (invitationRecordError) {
            console.error('⚠️ [STEP-2] Exception creating invitation record:', invitationRecordError)
            // Ne pas faire échouer l'invitation principale
          }
          
          // Utiliser le vrai magic link généré par Supabase
          const realMagicLink = linkData?.properties?.action_link
          
          invitationResult = {
            success: true,
            authUserId: inviteData.user.id,
            invitationSent: true,
            magicLink: realMagicLink,
            message: 'Email d\'invitation envoyé avec succès'
          }
          
          console.log('🔗 [STEP-2] Real magic link generated:', realMagicLink ? 'YES' : 'NO')
          if (realMagicLink) {
            console.log('📋 [STEP-2] Magic link preview:', realMagicLink.substring(0, 100) + '...')
          }
          } // Fermeture du if (inviteData?.user)
        } // Fermeture du else (traitement normal)

      } catch (inviteError) {
        console.error('❌ [STEP-2] Invitation failed:', inviteError)
        invitationResult = {
          success: false,
          error: inviteError instanceof Error ? inviteError.message : String(inviteError)
        }
      }
    } else {
      console.log('⏭️ [STEP-2] Skipping invitation (checkbox not checked)')
      invitationResult = {
        success: true,
        invitationSent: false,
        message: 'Contact créé sans invitation'
      }
    }

    // Logging de l'activité
      try {
        await activityLogger.logUserAction(
          session.user.id,
          teamId,
        shouldInviteToApp ? 'invite' : 'create',
        'contact',
        userProfile.id,
        `Contact ${shouldInviteToApp ? 'créé et invité' : 'créé'}: ${firstName} ${lastName}`,
          'success',
        { email, shouldInviteToApp }
      )
      } catch (logError) {
      console.warn('⚠️ Failed to log activity:', logError)
      }

    console.log('🎉 [INVITE-USER-SIMPLE] Process completed successfully')

      return NextResponse.json({
        success: true,
      message: shouldInviteToApp ? 
        'Contact créé et invitation envoyée avec succès' : 
        'Contact créé avec succès',
      contact: userProfile,
      invitation: invitationResult
    })

  } catch (error) {
    console.error('❌ [INVITE-USER-SIMPLE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}