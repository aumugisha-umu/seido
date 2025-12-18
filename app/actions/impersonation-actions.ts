'use server'

/**
 * Server Actions for Admin User Impersonation
 *
 * Permet aux admins de se connecter en tant qu'un autre utilisateur
 * pour debugger ou effectuer des operations en leur nom.
 *
 * Flow:
 * 1. Admin appelle startImpersonationAction(userId)
 * 2. Genere un magic link pour l'utilisateur cible
 * 3. Stocke l'email admin dans un cookie JWT signe
 * 4. Redirige vers le callback qui verifie l'OTP
 * 5. Pour quitter, stopImpersonationAction() regenere la session admin
 */

import { cookies } from 'next/headers'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { getServerAuthContext } from '@/lib/server-context'
import {
  signImpersonationToken,
  verifyImpersonationToken,
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_DURATION_HOURS
} from '@/lib/impersonation-jwt'
import { logger } from '@/lib/logger'

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  redirectUrl?: string
}

/**
 * Demarre une session d'impersonation
 * L'admin sera connecte en tant que l'utilisateur cible
 */
export async function startImpersonationAction(targetUserId: string): Promise<ActionResult> {
  try {
    // 1. Verifier que l'appelant est admin
    const { profile: adminProfile } = await getServerAuthContext('admin')

    // 2. Verifier que le service admin est configure
    if (!isAdminConfigured()) {
      return {
        success: false,
        error: 'Service admin non configure - verifiez SUPABASE_SERVICE_ROLE_KEY'
      }
    }

    const supabaseAdmin = getSupabaseAdmin()!

    // 3. Empecher l'auto-impersonation
    if (adminProfile.id === targetUserId) {
      return {
        success: false,
        error: 'Vous ne pouvez pas vous connecter en tant que vous-meme'
      }
    }

    // 4. Recuperer l'utilisateur cible
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, is_active')
      .eq('id', targetUserId)
      .single()

    if (userError || !targetUser) {
      logger.error('[IMPERSONATE] User not found:', targetUserId)
      return { success: false, error: 'Utilisateur non trouve' }
    }

    if (!targetUser.email) {
      return { success: false, error: 'Cet utilisateur n\'a pas d\'email configure' }
    }

    if (!targetUser.is_active) {
      return { success: false, error: 'Cet utilisateur est desactive' }
    }

    // 5. Generer le magic link pour l'utilisateur cible
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
    })

    if (linkError) {
      logger.error('[IMPERSONATE] Failed to generate magic link:', linkError)
      return {
        success: false,
        error: 'Impossible de generer le lien de connexion'
      }
    }

    const tokenHash = linkData.properties?.hashed_token
    if (!tokenHash) {
      logger.error('[IMPERSONATE] No token hash in response')
      return { success: false, error: 'Erreur lors de la generation du token' }
    }

    // 6. Stocker les infos admin dans un cookie JWT signe
    const impersonationToken = signImpersonationToken(
      adminProfile.email || '',
      adminProfile.display_name || adminProfile.name
    )

    const cookieStore = await cookies()
    cookieStore.set(IMPERSONATION_COOKIE_NAME, impersonationToken, {
      path: '/',
      httpOnly: false, // Permet detection cote client pour afficher le bandeau
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: IMPERSONATION_DURATION_HOURS * 60 * 60
    })

    // 7. Construire l'URL de redirection
    const redirectUrl = `/auth/impersonate/callback?token_hash=${encodeURIComponent(tokenHash)}&next=/${targetUser.role}/dashboard`

    logger.info('[IMPERSONATE] Admin starting impersonation', {
      admin: adminProfile.email,
      adminId: adminProfile.id,
      target: targetUser.email,
      targetId: targetUser.id,
      targetRole: targetUser.role
    })

    return {
      success: true,
      redirectUrl
    }
  } catch (error) {
    logger.error('[IMPERSONATE] Exception in startImpersonationAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Arrete la session d'impersonation et restaure la session admin
 */
export async function stopImpersonationAction(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value

    if (!token) {
      return {
        success: false,
        error: 'Aucune session d\'impersonation active'
      }
    }

    // Verifier et decoder le token
    const payload = verifyImpersonationToken(token)
    if (!payload?.admin_email) {
      // Token invalide, supprimer quand meme le cookie
      cookieStore.delete(IMPERSONATION_COOKIE_NAME)
      return {
        success: false,
        error: 'Token d\'impersonation invalide ou expire'
      }
    }

    // Supprimer le cookie d'impersonation
    cookieStore.delete(IMPERSONATION_COOKIE_NAME)

    // Verifier que le service admin est configure
    if (!isAdminConfigured()) {
      return {
        success: false,
        error: 'Service admin non configure'
      }
    }

    const supabaseAdmin = getSupabaseAdmin()!

    // Generer un magic link pour reconnecter l'admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: payload.admin_email,
    })

    if (linkError) {
      logger.error('[IMPERSONATE] Failed to generate admin magic link:', linkError)
      return {
        success: false,
        error: 'Impossible de restaurer la session admin',
        redirectUrl: '/auth/login' // Fallback vers login
      }
    }

    const tokenHash = linkData.properties?.hashed_token
    if (!tokenHash) {
      return {
        success: false,
        error: 'Erreur lors de la generation du token admin',
        redirectUrl: '/auth/login'
      }
    }

    const redirectUrl = `/auth/impersonate/callback?token_hash=${encodeURIComponent(tokenHash)}&next=/admin/users`

    logger.info('[IMPERSONATE] Admin stopping impersonation', {
      admin: payload.admin_email
    })

    return {
      success: true,
      redirectUrl
    }
  } catch (error) {
    logger.error('[IMPERSONATE] Exception in stopImpersonationAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      redirectUrl: '/auth/login'
    }
  }
}

/**
 * Verifie si une session d'impersonation est active (server-side)
 */
export async function checkImpersonationAction(): Promise<ActionResult<{ isActive: boolean; adminEmail?: string; adminName?: string }>> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value

    if (!token) {
      return {
        success: true,
        data: { isActive: false }
      }
    }

    const payload = verifyImpersonationToken(token)
    if (!payload) {
      // Token invalide, le supprimer
      cookieStore.delete(IMPERSONATION_COOKIE_NAME)
      return {
        success: true,
        data: { isActive: false }
      }
    }

    return {
      success: true,
      data: {
        isActive: true,
        adminEmail: payload.admin_email,
        adminName: payload.admin_name
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      data: { isActive: false }
    }
  }
}
