import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { createServerUserService } from '@/lib/services'
import { createClient } from '@supabase/supabase-js'

/**
 * 📧 ROUTE UNIFIÉE - Confirmation Email & Invitations
 *
 * Gère 3 types de confirmations:
 * 1. type=email → Confirmation inscription (signup)
 * 2. type=invite → Confirmation invitation (team invite)
 * 3. type=recovery → Réinitialisation mot de passe
 *
 * Pattern: PKCE Flow avec verifyOtp()
 * Référence: https://supabase.com/docs/guides/auth/sessions/pkce-flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'email' | 'invite' | 'recovery' | null

    console.log('🔐 [AUTH-CONFIRM] Starting confirmation:', {
      type,
      has_token: !!token_hash,
      token_length: token_hash?.length || 0,
      full_url: request.url
    })

    // Validation paramètres
    if (!token_hash || !type) {
      console.error('❌ [AUTH-CONFIRM] Missing parameters:', {
        token_hash: !!token_hash,
        type,
        all_params: Object.fromEntries(searchParams.entries())
      })
      return NextResponse.redirect(
        new URL('/auth/login?error=invalid_confirmation_link', request.url)
      )
    }

    // Créer client Supabase server
    const supabase = await createServerSupabaseClient()

    console.log('🔧 [AUTH-CONFIRM] Calling verifyOtp...')

    // ✅ VÉRIFIER OTP avec Supabase (essai principal)
    let { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any, // Type casting car TypeScript peut être strict
    })

    // 🔁 Fallback: certains tokens générés via admin.generateLink({ type: 'signup' })
    // peuvent nécessiter verifyOtp avec type='signup'.
    if ((error || !data?.user) && type === 'email') {
      console.warn('🔁 [AUTH-CONFIRM] Primary verifyOtp failed with type=email, retrying with type=signup...')
      const retry = await supabase.auth.verifyOtp({
        token_hash,
        type: 'signup' as any,
      })
      if (!retry.error && retry.data?.user) {
        data = retry.data
        error = null as any
        console.log('✅ [AUTH-CONFIRM] Fallback verifyOtp(type=signup) succeeded')
      }
    }

    if (error || !data?.user) {
      console.error('❌ [AUTH-CONFIRM] OTP verification failed:', {
        message: error?.message,
        name: error?.name,
        status: error?.status,
        errorDetails: error,
        hasData: !!data,
        hasUser: !!data?.user,
        attemptedType: type,
      })

      // Messages d'erreur spécifiques
      const errorMessages: Record<string, string> = {
        'Token has expired or is invalid': 'expired_token',
        'Email link is invalid or has expired': 'expired_token',
        'Invalid token': 'invalid_token',
      }

      const errorCode = error?.message
        ? errorMessages[error.message] || 'confirmation_failed'
        : 'confirmation_failed'

      return NextResponse.redirect(
        new URL(`/auth/login?error=${errorCode}`, request.url)
      )
    }

    const user = data.user
    console.log('✅ [AUTH-CONFIRM] OTP verified for:', user.email)

    // ✅ À ce stade, le trigger a déjà créé le profil utilisateur !
    // (car verifyOtp() met à jour email_confirmed_at, déclenchant le trigger)

    // ============================================================================
    // GESTION PAR TYPE
    // ============================================================================

    if (type === 'email') {
      // 📧 CONFIRMATION SIGNUP PUBLIC
      console.log('📧 [AUTH-CONFIRM] Email confirmation (signup) for:', user.email)

      // ✅ NOUVEAU PATTERN (2025-10-03): Création directe du profil (plus de dépendance sur trigger DB)
      // Après analyse avec 3 agents spécialisés, le trigger PostgreSQL est trop fragile
      // → Création server-side avec contrôle total et logs clairs

      let userRole: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire' = 'gestionnaire'
      let userProfileId: string | null = null
      let teamId: string | null = null

      try {
        // Vérifier si profil existe déjà (edge case : retry ou trigger a réussi)
        const userService = await createServerUserService()
        const existingProfile = await userService.getByAuthUserId(user.id)

        if (existingProfile.success && existingProfile.data) {
          // Profil déjà créé (trigger a fonctionné ou retry)
          console.log('✅ [AUTH-CONFIRM] Profile already exists:', {
            userId: existingProfile.data.id,
            role: existingProfile.data.role,
            teamId: existingProfile.data.team_id
          })
          userRole = existingProfile.data.role
          userProfileId = existingProfile.data.id
          teamId = existingProfile.data.team_id
        } else {
          // Créer le profil directement (pattern recommandé 2025)
          console.log('🔨 [AUTH-CONFIRM] Creating profile server-side...')

          // Extraire les métadonnées
          const firstName = user.raw_user_meta_data?.first_name || 'Utilisateur'
          const lastName = user.raw_user_meta_data?.last_name || ''
          const fullName = user.raw_user_meta_data?.full_name || `${firstName} ${lastName}`.trim()
          userRole = (user.raw_user_meta_data?.role || 'gestionnaire') as typeof userRole
          const phone = user.raw_user_meta_data?.phone

          // ⚠️ IMPORTANT: Utiliser le client ADMIN pour bypass RLS
          // Le UserService utilise le client server (avec session user) qui est bloqué par RLS
          // Car les policies nécessitent que l'utilisateur existe déjà dans public.users (chicken and egg!)
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

          // 1. Créer le profil utilisateur (team_id NULL temporairement) avec admin client
          const { data: newProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .insert({
              auth_user_id: user.id,
              email: user.email!,
              name: fullName || user.email!,
              role: userRole,
              phone: phone || null,
              is_active: true,
              password_set: true,
              team_id: null, // Sera mis à jour après création team si gestionnaire
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (profileError || !newProfile) {
            console.error('❌ [AUTH-CONFIRM] Failed to create profile:', profileError)
            throw new Error(`Profile creation failed: ${profileError?.message || 'Unknown error'}`)
          }

          userProfileId = newProfile.id
          console.log('✅ [AUTH-CONFIRM] Profile created (admin bypass RLS):', {
            userId: userProfileId,
            role: userRole,
            email: user.email
          })

          // 2. Créer équipe si gestionnaire (owner de sa propre équipe)
          if (userRole === 'gestionnaire' && userProfileId) {
            const teamName = `Équipe de ${firstName}`

            const { data: newTeam, error: teamError } = await supabaseAdmin
              .from('teams')
              .insert({
                name: teamName,
                description: 'Équipe personnelle',
                created_by: userProfileId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()

            if (teamError || !newTeam) {
              console.warn('⚠️ [AUTH-CONFIRM] Team creation failed (non-blocking):', teamError)
            } else {
              teamId = newTeam.id
              console.log('✅ [AUTH-CONFIRM] Team created:', {
                teamId,
                teamName,
                createdBy: userProfileId
              })

              // 3. Mettre à jour le profil avec team_id
              const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({ team_id: teamId })
                .eq('id', userProfileId)

              if (updateError) {
                console.warn('⚠️ [AUTH-CONFIRM] Failed to update profile with team_id (non-blocking):', updateError)
              } else {
                console.log('✅ [AUTH-CONFIRM] Profile updated with team_id:', teamId)
              }
            }
          }
        }
      } catch (profileCreationError) {
        // ⚠️ IMPORTANT: Ne pas bloquer l'auth si création profil échoue
        // Le fallback JWT dans auth-service.ts gère ce cas
        console.error('❌ [AUTH-CONFIRM] Profile creation error (non-blocking):', profileCreationError)
        console.error('⚠️ [AUTH-CONFIRM] User can still login, profile will be created on first login via fallback')
      }

      // Envoyer email de bienvenue via Resend
      try {
        const firstName = user.raw_user_meta_data?.first_name || user.email?.split('@')[0] || 'Utilisateur'
        const dashboardUrl = `${EMAIL_CONFIG.appUrl}/dashboard/${userRole}`

        const emailResult = await emailService.sendWelcomeEmail(user.email!, {
          firstName,
          confirmationUrl: dashboardUrl,
          role: userRole,
        })

        if (emailResult.success) {
          console.log('✅ [AUTH-CONFIRM] Welcome email sent:', emailResult.emailId)
        } else {
          console.warn('⚠️ [AUTH-CONFIRM] Welcome email failed (non-blocking):', emailResult.error)
        }
      } catch (emailError) {
        console.error('❌ [AUTH-CONFIRM] Welcome email error (non-blocking):', emailError)
      }

      // ✅ REDIRECTION DIRECTE VERS DASHBOARD (2025-10-03)
      // L'utilisateur est déjà connecté après verifyOtp() → pas besoin de login
      const dashboardPath = `/dashboard/${userRole}`
      console.log(`✅ [AUTH-CONFIRM] User authenticated and profile created, redirecting to: ${dashboardPath}`)

      return NextResponse.redirect(
        new URL(dashboardPath, request.url)
      )
    }

    if (type === 'invite') {
      // 👥 CONFIRMATION INVITATION
      console.log('👥 [AUTH-CONFIRM] Invitation confirmation for:', user.email)

      // Vérifier si mot de passe déjà défini
      const skipPassword = user.raw_user_meta_data?.skip_password === 'true'

      if (skipPassword) {
        // Rediriger vers page définition mot de passe
        return NextResponse.redirect(
          new URL('/auth/set-password', request.url)
        )
      } else {
        // Mot de passe déjà défini, rediriger vers dashboard
        const role = user.raw_user_meta_data?.role || 'gestionnaire'
        return NextResponse.redirect(
          new URL(`/${role}/dashboard?welcome=true`, request.url)
        )
      }
    }

    if (type === 'recovery') {
      // 🔑 RÉINITIALISATION MOT DE PASSE
      console.log('🔑 [AUTH-CONFIRM] Password recovery for:', user.email)

      // Rediriger vers page mise à jour mot de passe
      return NextResponse.redirect(
        new URL('/auth/update-password', request.url)
      )
    }

    // Type non reconnu
    console.error('❌ [AUTH-CONFIRM] Unknown type:', type)
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_confirmation_type', request.url)
    )

  } catch (error) {
    console.error('❌ [AUTH-CONFIRM] Unexpected error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=confirmation_failed', request.url)
    )
  }
}
