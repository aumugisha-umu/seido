/**
 * 🔐 SERVER ACTIONS - EMAIL CONFIRMATION
 *
 * Actions pour la confirmation d'email et vérification de profil
 */

'use server'

import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { getSupabaseAdmin } from '@/lib/services/core/supabase-admin'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { logger } from '@/lib/logger'

/**
 * Type de confirmation
 */
type ConfirmationType = 'email' | 'invite' | 'recovery' | 'signup'

/**
 * Résultat de la confirmation
 */
type ConfirmEmailResult = {
  success: boolean
  error?: string
  data?: {
    authUserId: string
    email: string
    firstName: string
    role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  }
}

/**
 * Résultat de la vérification de profil
 */
type CheckProfileResult = {
  success: boolean
  error?: string
  data?: {
    id: string
    email: string
    name: string
    firstName: string
    role: string
    teamId: string | null
  }
}

/**
 * ✅ SERVER ACTION: Confirmer l'email et créer la session
 *
 * Cette action :
 * 1. Vérifie l'OTP avec Supabase
 * 2. Crée la session utilisateur (cookies)
 * 3. Envoie l'email de bienvenue
 * 4. Retourne les infos user pour le Client Component
 */
export async function confirmEmailAction(
  tokenHash: string,
  type: ConfirmationType
): Promise<ConfirmEmailResult> {
  logger.info('🔐 [CONFIRM-ACTION] Starting email confirmation:', {
    type,
    hasToken: !!tokenHash,
    tokenLength: tokenHash?.length || 0
  })

  try {
    // Validation paramètres
    if (!tokenHash || !type) {
      return {
        success: false,
        error: 'Paramètres de confirmation manquants'
      }
    }

    // Créer client Supabase avec cookies (pour écrire la session)
    const supabase = await createServerActionSupabaseClient()

    logger.info('🔧 [CONFIRM-ACTION] Calling verifyOtp...')

    // Vérifier OTP avec Supabase (essai principal)
    let { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any
    })

    // Fallback: certains tokens nécessitent type='signup'
    if ((error || !data?.user) && type === 'email') {
      logger.warn('🔁 [CONFIRM-ACTION] Retrying with type=signup...')
      const retry = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'signup' as any
      })

      if (!retry.error && retry.data?.user) {
        data = retry.data
        error = null as any
        logger.info('✅ [CONFIRM-ACTION] Fallback verifyOtp(type=signup) succeeded')
      }
    }

    // Gestion des erreurs OTP
    if (error || !data?.user) {
      logger.error('❌ [CONFIRM-ACTION] OTP verification failed:', {
        message: error?.message,
        status: error?.status
      })

      // Messages d'erreur user-friendly
      const errorMessages: Record<string, string> = {
        'Token has expired or is invalid': 'Le lien de confirmation a expiré. Veuillez demander un nouvel email.',
        'Email link is invalid or has expired': 'Le lien de confirmation a expiré. Veuillez demander un nouvel email.',
        'Invalid token': 'Lien de confirmation invalide. Veuillez vérifier votre email.',
      }

      const errorMessage = error?.message
        ? errorMessages[error.message] || `Erreur de confirmation: ${error.message}`
        : 'Erreur de confirmation. Veuillez réessayer.'

      return {
        success: false,
        error: errorMessage
      }
    }

    const user = data.user
    logger.info('✅ [CONFIRM-ACTION] OTP verified for:', user.email)

    // Extraire les métadonnées utilisateur
    const firstName = user.raw_user_meta_data?.first_name || user.email?.split('@')[0] || 'Utilisateur'
    const userRole = (user.raw_user_meta_data?.role ||
                     user.user_metadata?.role ||
                     'gestionnaire') as 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'

    // Envoyer email de bienvenue (non-bloquant)
    // Note: On ne bloque pas le flow si l'email échoue
    if (type === 'email') {
      const dashboardUrl = `${EMAIL_CONFIG.appUrl}/${userRole}/dashboard`

      emailService.sendWelcomeEmail(user.email!, {
        firstName,
        dashboardUrl,
        role: userRole,
      }).then(emailResult => {
        if (emailResult.success) {
          logger.info('✅ [CONFIRM-ACTION] Welcome email sent:', emailResult.emailId)
        } else {
          logger.warn('⚠️ [CONFIRM-ACTION] Welcome email failed (non-blocking):', emailResult.error)
        }
      }).catch(err => {
        logger.error('❌ [CONFIRM-ACTION] Welcome email error:', err)
      })
    }

    logger.info('✅ [CONFIRM-ACTION] Email confirmed successfully')

    return {
      success: true,
      data: {
        authUserId: user.id,
        email: user.email!,
        firstName,
        role: userRole
      }
    }

  } catch (error) {
    logger.error('❌ [CONFIRM-ACTION] Unexpected error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue. Veuillez réessayer.'
    }
  }
}

/**
 * ✅ SERVER ACTION: Vérifier que le profil utilisateur est créé
 *
 * Cette action vérifie que le trigger PostgreSQL a bien créé :
 * - Le profil dans `users`
 * - L'équipe dans `teams`
 * - L'appartenance dans `team_members`
 *
 * Utilisé par le Client Component pour faire du polling jusqu'à ce que
 * le profil soit créé (max 10 secondes)
 *
 * Note: Utilise le Service Role (admin) pour bypasser RLS et éviter les problèmes
 * de timing de propagation de session. C'est sécurisé car on vérifie juste l'existence
 * d'un profil dont on a déjà validé l'authUserId via verifyOtp().
 */
export async function checkProfileCreated(authUserId: string): Promise<CheckProfileResult> {
  logger.info('🔍 [CHECK-PROFILE] Checking profile for authUserId:', authUserId)

  try {
    // Utiliser Supabase Admin pour bypass RLS
    // Évite les problèmes de timing de propagation de session entre verifyOtp() et ce polling
    const admin = getSupabaseAdmin()

    if (!admin) {
      logger.error('❌ [CHECK-PROFILE] Admin client not available')
      return {
        success: false,
        error: 'Service admin non disponible'
      }
    }

    // Query directe sans RLS - plus rapide et plus fiable
    const { data: profile, error } = await admin
      .from('users')
      .select('id, email, name, first_name, role, team_id')
      .eq('auth_user_id', authUserId)
      .single()

    if (error) {
      // PGRST116 = "not found" - c'est normal pendant le polling
      if (error.code === 'PGRST116') {
        logger.info('⏳ [CHECK-PROFILE] Profile not created yet for:', authUserId)
        return {
          success: false,
          error: 'Profil non trouvé'
        }
      }

      // Autre erreur = problème réel
      logger.error('❌ [CHECK-PROFILE] Database error:', {
        code: error.code,
        message: error.message
      })
      return {
        success: false,
        error: `Erreur base de données: ${error.message}`
      }
    }

    if (!profile) {
      logger.warn('⚠️ [CHECK-PROFILE] Profile not found yet for:', authUserId)
      return {
        success: false,
        error: 'Profil non trouvé'
      }
    }

    // Vérifier que le profil a les champs nécessaires
    if (!profile.id || !profile.email || !profile.role) {
      logger.warn('⚠️ [CHECK-PROFILE] Incomplete profile data:', {
        hasId: !!profile.id,
        hasEmail: !!profile.email,
        hasRole: !!profile.role
      })
      return {
        success: false,
        error: 'Profil incomplet'
      }
    }

    logger.info('✅ [CHECK-PROFILE] Profile found:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      firstName: profile.first_name,
      hasTeam: !!profile.team_id
    })

    return {
      success: true,
      data: {
        id: profile.id,
        email: profile.email,
        name: profile.name || '',
        firstName: profile.first_name || profile.name?.split(' ')[0] || 'Utilisateur',
        role: profile.role,
        teamId: profile.team_id || null
      }
    }

  } catch (error) {
    logger.error('❌ [CHECK-PROFILE] Error checking profile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * ✅ SERVER ACTION: Vérifier invitation ou récupération mot de passe
 *
 * Cette action gère les cas où l'utilisateur clique sur :
 * - Un lien d'invitation (type=invite)
 * - Un lien de récupération mot de passe (type=recovery)
 *
 * Pattern Next.js 15 + Supabase SSR :
 * 1. Vérifie l'OTP avec Supabase (crée la session avec cookies)
 * 2. Retourne les infos pour que le Client Component redirige
 */
export async function verifyInviteOrRecoveryAction(
  tokenHash: string,
  type: 'invite' | 'recovery' | 'magiclink',  // ✅ BUGFIX: Ajout magiclink pour utilisateurs existants
  teamId?: string  // Pour acceptation auto des invitations multi-équipe
): Promise<{
  success: boolean
  error?: string
  data?: {
    shouldSetPassword: boolean
    role?: string
    redirectTo?: string
  }
}> {
  logger.info('🔐 [VERIFY-INVITE-RECOVERY] Starting verification:', {
    type,
    hasToken: !!tokenHash,
    tokenLength: tokenHash?.length || 0,
    teamId: teamId || 'none'
  })

  try {
    // Validation paramètres
    if (!tokenHash || !type) {
      return {
        success: false,
        error: 'Paramètres de confirmation manquants'
      }
    }

    // Créer client Supabase avec cookies (Server Action)
    const supabase = await createServerActionSupabaseClient()

    logger.info('🔧 [VERIFY-INVITE-RECOVERY] Calling verifyOtp...')

    // Vérifier l'OTP
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any
    })

    if (error || !data?.user) {
      logger.error('❌ [VERIFY-INVITE-RECOVERY] OTP verification failed:', {
        message: error?.message,
        status: error?.status
      })

      // Messages d'erreur user-friendly
      const errorMessages: Record<string, string> = {
        'Token has expired or is invalid': 'Le lien a expiré. Veuillez demander un nouveau lien.',
        'Email link is invalid or has expired': 'Le lien a expiré. Veuillez demander un nouveau lien.',
        'Invalid token': 'Lien invalide. Veuillez vérifier votre email.',
      }

      const errorMessage = error?.message
        ? errorMessages[error.message] || `Erreur de vérification: ${error.message}`
        : 'Erreur de vérification. Veuillez réessayer.'

      return {
        success: false,
        error: errorMessage
      }
    }

    const user = data.user
    logger.info('✅ [VERIFY-INVITE-RECOVERY] OTP verified for:', user.email)

    // Extraire métadonnées
    const role = (user.raw_user_meta_data?.role || user.user_metadata?.role || 'gestionnaire') as string

    // ✅ CORRECTION LOGIQUE INVERSÉE: Par défaut, on assume que le password DOIT être défini
    // Sauf si password_set est explicitement true/'true'
    // Cela gère les cas: undefined, null, false, 'false' → tous redirigent vers set-password
    const passwordSet = user.raw_user_meta_data?.password_set
    const passwordAlreadySet = passwordSet === true || passwordSet === 'true'
    const needsPasswordSetup = !passwordAlreadySet

    logger.info('📋 [VERIFY-INVITE-RECOVERY] User metadata:', {
      role,
      passwordSet,                        // Valeur brute (boolean/string/undefined)
      passwordSetType: typeof passwordSet, // Type JavaScript
      passwordAlreadySet,                 // true si explicitement défini
      needsPasswordSetup,                 // Résultat de la logique
      email: user.email
    })

    // Décider de la redirection selon le type
    if (type === 'invite') {
      if (needsPasswordSetup) {
        logger.info('🔑 [VERIFY-INVITE-RECOVERY] Invitation confirmed - password NOT set (default behavior), redirect to set-password')
        return {
          success: true,
          data: {
            shouldSetPassword: true,
            role,
            redirectTo: '/auth/set-password'
          }
        }
      } else {
        // ✅ MULTI-ÉQUIPE: Utilisateur existant - accepter l'invitation automatiquement
        logger.info('✅ [VERIFY-INVITE-RECOVERY] Invitation confirmed - password already set, accepting invitation...')

        if (teamId && user.email) {
          try {
            const admin = getSupabaseAdmin()
            if (admin) {
              // Mettre à jour le statut de l'invitation
              const { error: updateError } = await admin
                .from('user_invitations')
                .update({
                  status: 'accepted',
                  accepted_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('email', user.email)
                .eq('team_id', teamId)
                .eq('status', 'pending')

              if (updateError) {
                logger.warn('⚠️ [VERIFY-INVITE-RECOVERY] Failed to update invitation status (non-blocking):', updateError)
              } else {
                logger.info({ teamId, email: user.email }, '✅ [VERIFY-INVITE-RECOVERY] Invitation auto-accepted for existing user')
              }
            }
          } catch (acceptError) {
            logger.warn('⚠️ [VERIFY-INVITE-RECOVERY] Error accepting invitation (non-blocking):', acceptError)
            // Non-bloquant : l'utilisateur peut quand même accéder à l'app
          }
        }

        return {
          success: true,
          data: {
            shouldSetPassword: false,
            role,
            redirectTo: `/${role}/dashboard?welcome=true${teamId ? `&team=${teamId}` : ''}`
          }
        }
      }
    }

    // ✅ BUGFIX: type=magiclink pour utilisateurs existants (multi-équipe)
    // Le token a été généré avec type: 'magiclink', donc on doit le vérifier avec le même type
    // Ces utilisateurs ont TOUJOURS un mot de passe déjà défini (passwordAlreadySet = true)
    if (type === 'magiclink') {
      logger.info('✅ [VERIFY-INVITE-RECOVERY] Magic link confirmed - existing user, accepting invitation...')

      // Accepter l'invitation automatiquement
      if (teamId && user.email) {
        try {
          const admin = getSupabaseAdmin()
          if (admin) {
            const { error: updateError } = await admin
              .from('user_invitations')
              .update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('email', user.email)
              .eq('team_id', teamId)
              .eq('status', 'pending')

            if (updateError) {
              logger.warn('⚠️ [VERIFY-INVITE-RECOVERY] Failed to update invitation status (non-blocking):', updateError)
            } else {
              logger.info({ teamId, email: user.email }, '✅ [VERIFY-INVITE-RECOVERY] Invitation auto-accepted for existing user via magiclink')
            }
          }
        } catch (acceptError) {
          logger.warn('⚠️ [VERIFY-INVITE-RECOVERY] Error accepting invitation (non-blocking):', acceptError)
        }
      }

      return {
        success: true,
        data: {
          shouldSetPassword: false,  // ✅ Utilisateur existant = mot de passe déjà défini
          role,
          redirectTo: `/${role}/dashboard?welcome=true${teamId ? `&team=${teamId}` : ''}`
        }
      }
    }

    if (type === 'recovery') {
      logger.info('🔑 [VERIFY-INVITE-RECOVERY] Password recovery confirmed - redirect to update-password')
      return {
        success: true,
        data: {
          shouldSetPassword: false,
          role,
          redirectTo: '/auth/update-password'
        }
      }
    }

    // Type non reconnu (ne devrait jamais arriver)
    logger.error('❌ [VERIFY-INVITE-RECOVERY] Unknown type:', type)
    return {
      success: false,
      error: 'Type de confirmation non reconnu'
    }

  } catch (error) {
    logger.error('❌ [VERIFY-INVITE-RECOVERY] Unexpected error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue. Veuillez réessayer.'
    }
  }
}
