import { redirect } from 'next/navigation'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { ConfirmFlow } from '@/components/auth/confirm-flow'
import { logger } from '@/lib/logger'

/**
 * 📧 PAGE DE CONFIRMATION - Email & Invitations
 *
 * Gère 3 types de confirmations :
 * 1. type=email/signup → Confirmation inscription → ConfirmFlow avec modale de succès
 * 2. type=invite → Invitation équipe → verifyOtp puis redirection
 * 3. type=recovery → Récupération mot de passe → verifyOtp puis redirection
 *
 * Pattern moderne :
 * - Server Component pour validation et redirections simples (invite/recovery)
 * - Client Component ConfirmFlow pour signup avec modale interactive
 */

interface ConfirmPageProps {
  searchParams: Promise<{
    token_hash?: string
    type?: 'email' | 'invite' | 'recovery' | 'signup'
  }>
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams
  const { token_hash, type } = params

  logger.info('🔐 [CONFIRM-PAGE] Page loaded:', {
    type,
    hasToken: !!token_hash,
    tokenLength: token_hash?.length || 0
  })

  // Validation des paramètres
  if (!token_hash || !type) {
    logger.error('❌ [CONFIRM-PAGE] Missing parameters:', {
      hasToken: !!token_hash,
      type
    })
    redirect('/auth/login?error=invalid_confirmation_link')
  }

  // ============================================================================
  // CAS PRINCIPAL : Confirmation d'inscription (type=email ou type=signup)
  // Utilise le ConfirmFlow avec modale de succès et vérification de profil
  // ============================================================================

  if (type === 'email' || type === 'signup') {
    logger.info('✅ [CONFIRM-PAGE] Rendering ConfirmFlow for signup')
    const confirmType = type === 'signup' ? 'email' : type
    return <ConfirmFlow tokenHash={token_hash} type={confirmType} />
  }

  // ============================================================================
  // CAS SPÉCIAUX : Invitations et récupération (verifyOtp côté serveur)
  // Ces cas n'ont pas besoin de modale, on fait le verifyOtp puis redirige
  // ============================================================================

  try {
    const supabase = await createServerActionSupabaseClient()

    logger.info('🔧 [CONFIRM-PAGE] Verifying OTP for type:', type)

    // Vérifier l'OTP
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any
    })

    if (error || !data?.user) {
      logger.error('❌ [CONFIRM-PAGE] OTP verification failed:', {
        message: error?.message,
        status: error?.status
      })

      // Rediriger vers login avec erreur
      const errorCode = error?.message?.includes('expired')
        ? 'expired_token'
        : 'invalid_token'
      redirect(`/auth/login?error=${errorCode}`)
    }

    const user = data.user
    logger.info('✅ [CONFIRM-PAGE] OTP verified for:', user.email)

    // Gestion par type
    if (type === 'invite') {
      logger.info('👥 [CONFIRM-PAGE] Invitation confirmed')

      // Vérifier si mot de passe déjà défini
      const skipPassword = user.raw_user_meta_data?.skip_password === 'true'

      if (skipPassword) {
        // Rediriger vers page définition mot de passe
        redirect('/auth/set-password')
      } else {
        // Mot de passe déjà défini, rediriger vers dashboard
        const role = user.raw_user_meta_data?.role || 'gestionnaire'
        redirect(`/${role}/dashboard?welcome=true`)
      }
    }

    if (type === 'recovery') {
      logger.info('🔑 [CONFIRM-PAGE] Password recovery confirmed')
      // Rediriger vers page mise à jour mot de passe
      redirect('/auth/update-password')
    }

    // Type non reconnu
    logger.error('❌ [CONFIRM-PAGE] Unknown type:', type)
    redirect('/auth/login?error=invalid_confirmation_type')

  } catch (error) {
    logger.error('❌ [CONFIRM-PAGE] Unexpected error:', error)
    redirect('/auth/login?error=confirmation_failed')
  }
}
