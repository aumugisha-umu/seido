/**
 * 🔐 SERVER ACTIONS - EMAIL CONFIRMATION
 *
 * Actions pour la confirmation d'email et vérification de profil
 */

'use server'

import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { createServerUserService } from '@/lib/services'
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
 */
export async function checkProfileCreated(authUserId: string): Promise<CheckProfileResult> {
  logger.info('🔍 [CHECK-PROFILE] Checking profile for authUserId:', authUserId)

  try {
    // Créer le service utilisateur
    const userService = await createServerUserService()

    // Récupérer le profil par auth_user_id
    const result = await userService.getByAuthUserId(authUserId)

    if (!result.success || !result.data) {
      logger.warn('⚠️ [CHECK-PROFILE] Profile not found yet for:', authUserId)
      return {
        success: false,
        error: 'Profil non trouvé'
      }
    }

    const profile = result.data

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
      hasTeam: !!(profile as any).team_id
    })

    return {
      success: true,
      data: {
        id: profile.id,
        email: profile.email,
        name: profile.name || '',
        role: profile.role,
        teamId: (profile as any).team_id || null
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
