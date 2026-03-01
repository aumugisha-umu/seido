/**
 * 🚀 SERVER ACTIONS - AUTHENTICATION
 *
 * Conformément aux bonnes pratiques Next.js 15 / Server Actions :
 * - Authentification server-side sécurisée
 * - Validation côté serveur systématique
 * - Gestion erreurs appropriée
 * - Redirections sécurisées avec redirect()
 */

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { requireGuest, invalidateAuth, getDashboardPath } from '@/lib/auth-dal'
import { createServerUserService, createServerTeamService } from '@/lib/services'
import { z } from 'zod'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
// ✅ VALIDATION: Schemas Zod pour sécurité server-side
const LoginSchema = z.object({
  email: z.string().email('Email invalide').min(1, 'Email requis'),
  password: z.string().min(1, 'Mot de passe requis')
})

const SignupSchema = z.object({
  email: z.string().email('Email invalide').min(1, 'Email requis'),
  password: z.string()
    .min(8, 'Au moins 8 caractères')
    .regex(/[A-Z]/, 'Une majuscule requise')
    .regex(/[a-z]/, 'Une minuscule requise')
    .regex(/\d/, 'Un chiffre requis'),
  firstName: z.string().min(1, 'Prénom requis').trim(),
  lastName: z.string().min(1, 'Nom requis').trim(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'gestionnaire', 'prestataire', 'locataire']).optional().default('gestionnaire'),
  acceptTerms: z.boolean().refine(val => val === true, 'Acceptation des conditions requise')
})

const ResetPasswordSchema = z.object({
  email: z.string().email('Email invalide').min(1, 'Email requis')
})

// ✅ TYPES: Return types pour actions
type AuthActionResult = {
  success: boolean
  error?: string
  data?: {
    message?: string
    email?: string
    redirectTo?: string // Pour la navigation client-side post-authentification
    [key: string]: unknown
  }
}

/**
 * ✅ SERVER ACTION: Connexion utilisateur
 */
export async function loginAction(prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  logger.info('🚀 [LOGIN-ACTION] Starting server-side login...')

  // ✅ PATTERN OFFICIEL NEXT.JS 15: Gestion d'erreur AVANT le try/catch principal
  try {
    await requireGuest()
  } catch {
    // Utilisateur déjà connecté - retourner succès
    logger.info('🔄 [LOGIN-ACTION] User already authenticated')
    return { success: true, data: { message: 'Already authenticated' } }
  }

  // ✅ Paramètre de redirection personnalisée (depuis magic link expiré)
  const customRedirectTo = formData.get('redirectTo') as string | null

  // ✅ VALIDATION: Parser et valider les données
  let validatedData
  try {
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string
    }
    validatedData = LoginSchema.parse(rawData)
    logger.info(`📝 [LOGIN-ACTION] Data validated for: ${validatedData.email}`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }
    return { success: false, error: 'Données invalides' }
  }

  // ✅ AUTHENTIFICATION: Utiliser client server ACTION Supabase (READ-WRITE pour cookies)
  const supabase = await createServerActionSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validatedData.email,
    password: validatedData.password
  })

  if (error) {
    logger.info(`❌ [LOGIN-ACTION] Authentication failed: ${error.message}`)

    // ✅ GESTION ERREURS: Messages utilisateur-friendly
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { success: false, error: 'Veuillez confirmer votre email avant de vous connecter' }
    }
    return { success: false, error: 'Erreur de connexion : ' + error.message }
  }

  if (!data.user) {
    return { success: false, error: 'Erreur de connexion inattendue' }
  }

  logger.info(`✅ [LOGIN-ACTION] User authenticated: ${data.user.email}`)

  // 🔍 DEBUG: Vérifier les détails de la session
  logger.info('🔍 [LOGIN-DEBUG] Session details:', {
    userId: data.user?.id,
    userEmail: data.user?.email,
    hasSession: !!data.session,
    sessionExpiry: data.session?.expires_at
  })

  // ✅ DÉTERMINER REDIRECTION: Selon le rôle utilisateur
  let dashboardPath = '/admin/dashboard' // Fallback par défaut

  try {
    const userService = await createServerUserService()
    const userResult = await userService.getByAuthUserId(data.user.id)

    if (userResult.success && userResult.data) {
      const userData = userResult.data
      if ('role' in userData && userData.role) {
        dashboardPath = getDashboardPath(userData.role)
        logger.info({
          role: userData.role,
          dashboard: dashboardPath
        }, '🔄 [LOGIN-ACTION] Determined role-specific dashboard')
      } else {
        logger.info('⚠️ [LOGIN-ACTION] No role found, using default dashboard')
      }
    } else {
      logger.info('⚠️ [LOGIN-ACTION] User not found, using default dashboard')
    }
  } catch (error) {
    logger.info(`⚠️ [LOGIN-ACTION] Error determining role, using fallback: ${error instanceof Error ? error.message : String(error)}`)
  }

  // ✅ WORKAROUND NEXT.JS 15 BUG #72842
  // Issue: redirect() ne fonctionne pas correctement avec useActionState
  // - Symptom: POST returns 303 but redirects to wrong path (/auth instead of /gestionnaire/dashboard)
  // - Root Cause: Next.js 15.2.4 bug when combining redirect() + useActionState
  // - Fix Merged: PR #73063 (not yet in 15.2.4)
  // - Workaround: Return redirectTo path for client-side navigation
  // - Refs: https://github.com/vercel/next.js/issues/72842
  logger.info('🚀 [LOGIN-ACTION] Authentication successful, returning redirect path')

  // ✅ ÉTAPE 1: Invalider le cache pour forcer refresh des données
  revalidatePath('/', 'layout')

  // ✅ ÉTAPE 2: Déterminer la redirection finale
  // Si une redirection personnalisée est fournie (depuis magic link expiré), l'utiliser
  // Sinon, utiliser le dashboard par défaut selon le rôle
  const finalRedirect = customRedirectTo && customRedirectTo.startsWith('/')
    ? customRedirectTo
    : dashboardPath

  if (customRedirectTo) {
    logger.info('🔄 [LOGIN-ACTION] Using custom redirect from magic link:', customRedirectTo)
  }

  // ✅ ÉTAPE 3: Retourner le path de redirection (navigation sera gérée côté client)
  return {
    success: true,
    data: {
      message: 'Connexion réussie',
      redirectTo: finalRedirect
    }
  }
}

/**
 * ✅ SERVER ACTION: Inscription utilisateur
 *
 * NOUVEAU FLUX (Resend emails) :
 * 1. Validation des données
 * 2. admin.generateLink() crée user SANS email automatique
 * 3. emailService.sendSignupConfirmationEmail() via Resend
 *    → Lien envoyé: `/auth/confirm?token_hash=...&type=email` (interne)
 *    → Pourquoi: éviter les incohérences `redirect_to` de Supabase et unifier le flow
 * 4. User confirme → verifyOtp() (dans route `/auth/confirm`) → Trigger crée profile + team
 * 5. emailService.sendWelcomeEmail() après confirmation
 *
 * Notes pour repreneur:
 * - Référence détaillée: `docs/refacto/signup-fix.md`
 * - On NE redirige plus via `action_link` Supabase (qui peut contenir `type=signup` et un `redirect_to`
 *   divergents). On construit désormais un lien interne basé sur `hashed_token` et `type=email`.
 * - Fallback: si `hashed_token` est indisponible (cas anormal), on retombe sur `properties.action_link`.
 */
export async function signupAction(prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  logger.info('🚀 [SIGNUP-ACTION] Starting server-side signup...')

  // ✅ PATTERN OFFICIEL NEXT.JS 15: Gestion d'erreur AVANT le try/catch principal
  try {
    await requireGuest()
  } catch {
    // Utilisateur déjà connecté - retourner succès
    logger.info('🔄 [SIGNUP-ACTION] User already authenticated')
    return { success: true, data: { message: 'Already authenticated' } }
  }

  try {
    // ✅ VALIDATION: Parser et valider les données
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      phone: formData.get('phone') as string || undefined,
      acceptTerms: formData.get('acceptTerms') === 'true'
    }

    const validatedData = SignupSchema.parse(rawData)
    logger.info(`📝 [SIGNUP-ACTION] Data validated for: ${validatedData.email}`)

    // ✅ VÉRIFIER: Service admin disponible
    if (!isAdminConfigured()) {
      logger.error('❌ [SIGNUP-ACTION] Admin service not configured - SERVICE_ROLE_KEY missing')
      return {
        success: false,
        error: 'Service d\'inscription non configuré. Veuillez contacter l\'administrateur.'
      }
    }

    const supabaseAdmin = getSupabaseAdmin()!

    // ✅ NOUVELLE APPROCHE: Utiliser admin.generateLink() pour créer user SANS email automatique
    logger.info('🔧 [SIGNUP-ACTION] Using admin.generateLink() to create user without automatic email')

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          first_name: validatedData.firstName,
          last_name: validatedData.lastName,
          phone: validatedData.phone,
          role: validatedData.role || 'gestionnaire', // ✅ AJOUT: role requis pour le trigger
          full_name: `${validatedData.firstName} ${validatedData.lastName}`,
          password_set: true // ✅ SIGNUP: User définit son password lors de l'inscription
        }
      }
    })

    if (linkError || !linkData) {
      logger.error(`❌ [SIGNUP-ACTION] Failed to generate signup link: ${linkError?.message || 'Unknown error'}`)

      // ✅ GESTION ERREURS: Messages utilisateur-friendly
      if (linkError?.message.includes('User already registered')) {
        return { success: false, error: 'Un compte existe déjà avec cette adresse email' }
      }
      if (linkError?.message.includes('rate limit')) {
        return { success: false, error: 'Trop de tentatives. Veuillez patienter quelques minutes.' }
      }
      return {
        success: false,
        error: 'Erreur lors de la création du compte : ' + (linkError?.message || 'Unknown error')
      }
    }

    logger.info({
      userId: linkData.user.id,
      email: linkData.user.email,
      hasActionLink: !!linkData.properties.action_link,
      properties: linkData.properties // 🔍 DEBUG: Voir toutes les propriétés disponibles
    }, '✅ [SIGNUP-ACTION] User created in auth.users')

    // ✅ UTILISER NOTRE ROUTE /auth/confirm AVEC token_hash
    // Objectif: éviter les incohérences de redirect_to côté Supabase et unifier le flow
    // Détail: Supabase renvoie `properties.hashed_token` et `properties.action_link`.
    //  - Nous privilégions `hashed_token` pour construire un lien interne:
    //      `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=...&type=email`
    //  - Cela garantit l'usage de verifyOtp(type='email') dans notre route dédiée.
    //  - En fallback (rare), on réutilise `action_link` tel quel.
    logger.info('📧 [SIGNUP-ACTION] Preparing confirmation email via Resend...')

    const hashedToken = (linkData as any)?.properties?.hashed_token as string | undefined
    const fallbackActionLink = (linkData as any)?.properties?.action_link as string | undefined

    // Construire l'URL interne de confirmation lorsque possible
    const internalConfirmUrl = hashedToken
      ? `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=email`
      : undefined

    const confirmationUrl = internalConfirmUrl || fallbackActionLink

    logger.info({
      internalConfirmUrl,
      usingInternal: !!internalConfirmUrl,
      hasFallbackActionLink: !!fallbackActionLink
    }, '🔗 [SIGNUP-ACTION] Built confirmation URL')

    // ✅ OPTIMISATION: Envoi d'email en arrière-plan (fire-and-forget)
    // Permet de ne pas bloquer la réponse de signup (~2-5s économisés)
    // L'utilisateur reçoit une réponse immédiate, l'email arrive quelques secondes après
    emailService.sendSignupConfirmationEmail(validatedData.email, {
      firstName: validatedData.firstName,
      confirmationUrl: confirmationUrl!,
      expiresIn: 60, // 60 minutes
    }).then(emailResult => {
      if (!emailResult.success) {
        logger.error(`❌ [SIGNUP-ACTION] Background email failed: ${emailResult.error}`)
        // ⚠️ User créé mais email échoué - nécessite intervention manuelle
        logger.warn('⚠️ [SIGNUP-ACTION] User created but email failed - manual intervention required')
      } else {
        logger.info(`✅ [SIGNUP-ACTION] Background email sent successfully via Resend: ${emailResult.emailId}`)
      }
    }).catch(err => {
      logger.error('❌ [SIGNUP-ACTION] Email exception:', err)
    })

    logger.info('📨 [SIGNUP-ACTION] Confirmation email queued for background sending')

    // ✅ NOTE: Le profil et l'équipe seront créés automatiquement par le Database Trigger
    // après que l'utilisateur confirme son email. Voir migration 20251002000001_fix_profile_creation_timing.sql
    logger.info('📍 [SIGNUP-ACTION] Profile creation will be handled by database trigger after email confirmation')

    // ✅ WORKAROUND NEXT.JS 15 BUG #72842
    // Issue: redirect() ne fonctionne pas correctement avec useActionState
    // Solution: Retourner redirectTo pour navigation client-side (pattern identique à loginAction)
    // Refs: https://github.com/vercel/next.js/issues/72842
    logger.info('🚀 [SIGNUP-ACTION] Signup successful, returning redirect path')

    // ✅ ÉTAPE 1: Invalider le cache pour forcer refresh des données
    revalidatePath('/', 'layout')

    // ✅ ÉTAPE 2: Retourner le path de redirection (navigation sera gérée côté client)
    return {
      success: true,
      data: {
        message: 'Compte créé avec succès',
        email: validatedData.email,
        redirectTo: '/auth/signup-success?email=' + encodeURIComponent(validatedData.email)
      }
    }

  } catch (error) {
    logger.error(`❌ [SIGNUP-ACTION] Exception: ${error instanceof Error ? error.message : String(error)}`)

    // ✅ GESTION: Erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }

    return { success: false, error: 'Une erreur est survenue lors de la création du compte' }
  }
}

/**
 * ✅ SERVER ACTION: Réinitialisation mot de passe
 * 
 * NOUVEAU FLUX (Resend emails) :
 * 1. Validation des données
 * 2. admin.generateLink() crée un lien de récupération SANS email automatique
 * 3. emailService.sendPasswordResetEmail() via Resend
 *    → Lien envoyé: `/auth/update-password?token_hash=...&type=recovery`
 * 4. User clique → verifyOtp() dans route `/auth/update-password`
 * 5. User définit nouveau mot de passe
 */
export async function resetPasswordAction(prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  logger.info('🚀 [RESET-PASSWORD-ACTION] Starting server-side reset...')

  // ✅ PATTERN OFFICIEL NEXT.JS 15: Gestion d'erreur AVANT le try/catch principal
  try {
    await requireGuest()
  } catch {
    // Utilisateur déjà connecté - retourner succès
    logger.info('🔄 [RESET-PASSWORD-ACTION] User already authenticated')
    return { success: true, data: { message: 'Already authenticated' } }
  }

  try {
    // ✅ VALIDATION: Parser et valider les données
    const rawData = {
      email: formData.get('email') as string
    }

    const validatedData = ResetPasswordSchema.parse(rawData)
    logger.info(`📝 [RESET-PASSWORD-ACTION] Data validated for: ${validatedData.email}`)

    // ✅ VÉRIFIER: Service admin disponible
    if (!isAdminConfigured()) {
      logger.error('❌ [RESET-PASSWORD-ACTION] Admin service not configured - SERVICE_ROLE_KEY missing')
      return {
        success: false,
        error: 'Service de réinitialisation non configuré. Veuillez contacter l\'administrateur.'
      }
    }

    const supabaseAdmin = getSupabaseAdmin()!

    // ✅ NOUVELLE APPROCHE: Utiliser admin.generateLink() pour créer un lien SANS email automatique
    logger.info('🔧 [RESET-PASSWORD-ACTION] Using admin.generateLink() to create recovery link without automatic email')

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: validatedData.email,
    })

    if (linkError || !linkData) {
      logger.error(`❌ [RESET-PASSWORD-ACTION] Failed to generate recovery link: ${linkError?.message || 'Unknown error'}`)

      // ✅ GESTION ERREURS: Messages utilisateur-friendly
      if (linkError?.message.includes('User not found')) {
        // ⚠️ SÉCURITÉ: Ne pas révéler si l'email existe ou non
        // Retourner succès même si l'utilisateur n'existe pas
        logger.info('⚠️ [RESET-PASSWORD-ACTION] User not found, but returning success for security')
        return {
          success: true,
          data: {
            message: 'Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation',
            email: validatedData.email
          }
        }
      }
      if (linkError?.message.includes('rate limit')) {
        return { success: false, error: 'Trop de tentatives. Veuillez patienter avant de réessayer.' }
      }
      return {
        success: false,
        error: 'Erreur lors de la génération du lien : ' + (linkError?.message || 'Unknown error')
      }
    }

    logger.info({
      userId: linkData.user.id,
      email: linkData.user.email,
      hasActionLink: !!linkData.properties.action_link,
      properties: linkData.properties
    }, '✅ [RESET-PASSWORD-ACTION] Recovery link generated')

    // ✅ CONSTRUIRE L'URL DE RÉCUPÉRATION
    const hashedToken = (linkData as any)?.properties?.hashed_token as string | undefined
    const fallbackActionLink = (linkData as any)?.properties?.action_link as string | undefined

    // Construire l'URL interne de récupération
    const internalRecoveryUrl = hashedToken
      ? `${EMAIL_CONFIG.appUrl}/auth/update-password?token_hash=${hashedToken}&type=recovery`
      : undefined

    const recoveryUrl = internalRecoveryUrl || fallbackActionLink

    if (!recoveryUrl) {
      logger.error('❌ [RESET-PASSWORD-ACTION] No recovery URL available')
      return {
        success: false,
        error: 'Erreur lors de la génération du lien de récupération'
      }
    }

    logger.info({
      internalRecoveryUrl,
      usingInternal: !!internalRecoveryUrl,
      hasFallbackActionLink: !!fallbackActionLink
    }, '🔗 [RESET-PASSWORD-ACTION] Built recovery URL')

    // ✅ ENVOI D'EMAIL: Via Resend (fire-and-forget pour ne pas bloquer la réponse)
    logger.info('📧 [RESET-PASSWORD-ACTION] Sending password reset email via Resend...')

    emailService.sendPasswordResetEmail(validatedData.email, {
      resetUrl: recoveryUrl,
      expiresIn: 60, // 60 minutes
    }).then(emailResult => {
      if (!emailResult.success) {
        logger.error(`❌ [RESET-PASSWORD-ACTION] Background email failed: ${emailResult.error}`)
      } else {
        logger.info(`✅ [RESET-PASSWORD-ACTION] Background email sent successfully via Resend: ${emailResult.emailId}`)
      }
    }).catch(err => {
      logger.error('❌ [RESET-PASSWORD-ACTION] Email exception:', err)
    })

    logger.info('📨 [RESET-PASSWORD-ACTION] Password reset email queued for background sending')

    // ✅ SUCCÈS: Retourner succès sans redirection
    return {
      success: true,
      data: {
        message: 'Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation',
        email: validatedData.email
      }
    }

  } catch (error) {
    logger.error(`❌ [RESET-PASSWORD-ACTION] Exception: ${error instanceof Error ? error.message : String(error)}`)

    // ✅ GESTION: Erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }

    return { success: false, error: 'Une erreur est survenue lors de l\'envoi de l\'email' }
  }
}

/**
 * ✅ SERVER ACTION: Déconnexion utilisateur
 */
export async function logoutAction(): Promise<never> {
  logger.info('🚀 [LOGOUT-ACTION] Starting server-side logout...')

  try {
    // ✅ AUTHENTIFICATION: Invalider session
    await invalidateAuth()

    logger.info('✅ [LOGOUT-ACTION] User logged out successfully')

    // ✅ REDIRECTION: Vers page de connexion
    // Note: revalidatePath retiré car redirect() force déjà un refresh complet
    // et Next.js 15 n'autorise pas revalidatePath dans un page component render
    redirect('/auth/login')

  } catch (error) {
    // redirect() throws NEXT_REDIRECT — re-throw it, it's not an error
    if (error instanceof Error &&
        (error.message.includes('NEXT_REDIRECT') || (error as any).digest?.startsWith('NEXT_REDIRECT'))) {
      throw error
    }
    logger.error(`❌ [LOGOUT-ACTION] Exception: ${error instanceof Error ? error.message : String(error)}`)

    // ✅ FALLBACK: Redirection même en cas d'erreur
    redirect('/auth/login')
  }
}
