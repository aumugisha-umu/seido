import { redirect } from 'next/navigation'
import { ConfirmFlow } from '@/components/auth/confirm-flow'
import { InviteRecoveryFlow } from '@/components/auth/invite-recovery-flow'
import { logger } from '@/lib/logger'

/**
 * 📧 PAGE DE CONFIRMATION - Email & Invitations
 *
 * Gère 3 types de confirmations :
 * 1. type=email/signup → Confirmation inscription → ConfirmFlow avec modale de succès
 * 2. type=invite → Invitation équipe → InviteRecoveryFlow
 * 3. type=recovery → Récupération mot de passe → InviteRecoveryFlow
 *
 * Pattern Next.js 15 + Supabase SSR :
 * - Server Component pour validation des paramètres
 * - Client Components (ConfirmFlow, InviteRecoveryFlow) pour UI + Server Actions
 * - Server Actions pour verifyOtp + modification cookies (dans confirm-actions.ts)
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
  // CAS SPÉCIAUX : Invitations et récupération
  // Utilise InviteRecoveryFlow qui appelle une Server Action pour verifyOtp
  // ============================================================================

  if (type === 'invite' || type === 'recovery') {
    logger.info(`✅ [CONFIRM-PAGE] Rendering InviteRecoveryFlow for type: ${type}`)
    return <InviteRecoveryFlow tokenHash={token_hash} type={type} />
  }

  // Type non reconnu
  logger.error('❌ [CONFIRM-PAGE] Unknown type:', type)
  redirect('/auth/login?error=invalid_confirmation_type')
}
