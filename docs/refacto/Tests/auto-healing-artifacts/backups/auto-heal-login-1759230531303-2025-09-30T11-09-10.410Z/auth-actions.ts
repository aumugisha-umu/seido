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
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client'
import { requireGuest, invalidateAuth, getDashboardPath } from '@/lib/auth-dal'
import { createServerUserService } from '@/lib/services'
import { z } from 'zod'
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
    [key: string]: unknown
  }
}

/**
 * ✅ SERVER ACTION: Connexion utilisateur
 */
export async function loginAction(prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  console.log('🚀 [LOGIN-ACTION] Starting server-side login...')

  // ✅ PATTERN OFFICIEL NEXT.JS 15: Gestion d'erreur AVANT le try/catch principal
  try {
    await requireGuest()
  } catch {
    // Utilisateur déjà connecté - retourner succès
    console.log('🔄 [LOGIN-ACTION] User already authenticated')
    return { success: true, data: { message: 'Already authenticated' } }
  }

  // ✅ VALIDATION: Parser et valider les données
  let validatedData
  try {
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string
    }
    validatedData = LoginSchema.parse(rawData)
    console.log('📝 [LOGIN-ACTION] Data validated for:', validatedData.email)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }
    return { success: false, error: 'Données invalides' }
  }

  // ✅ AUTHENTIFICATION: Utiliser client server Supabase
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validatedData.email,
    password: validatedData.password
  })

  if (error) {
    console.log('❌ [LOGIN-ACTION] Authentication failed:', error.message)

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

  console.log('✅ [LOGIN-ACTION] User authenticated:', data.user.email)

  // ✅ PATTERN SUPABASE SSR: Attendre que les cookies soient propagés
  console.log('⏳ [LOGIN-ACTION] Waiting for session cookies to be propagated...')

  // La session Supabase utilise des cookies HTTP qui prennent un moment à être écrits
  // On doit attendre que ces cookies soient disponibles pour le middleware
  // Delay recommandé : 500-1000ms pour garantir la propagation
  await new Promise(resolve => setTimeout(resolve, 800))

  console.log('✅ [LOGIN-ACTION] Session cookies should be ready')

  // ✅ CACHE: Invalider le cache selon les bonnes pratiques
  revalidatePath('/', 'layout')

  // ✅ DÉTERMINER REDIRECTION: Selon le rôle utilisateur
  let dashboardPath = '/admin/dashboard' // Fallback par défaut

  try {
    const userService = await createServerUserService()
    const userResult = await userService.getByAuthUserId(data.user.id)

    if (userResult.success && userResult.data && userResult.data.role) {
      dashboardPath = getDashboardPath(userResult.data.role)
      console.log('🔄 [LOGIN-ACTION] Redirecting to role-specific dashboard:', {
        role: userResult.data.role,
        dashboard: dashboardPath,
        sessionEstablished
      })
    } else {
      console.log('⚠️ [LOGIN-ACTION] No role found, using default dashboard')
    }
  } catch (error) {
    console.log('⚠️ [LOGIN-ACTION] Error determining role, using fallback:', error)
  }

  // ✅ PATTERN OFFICIEL: redirect() HORS de tout try/catch
  redirect(dashboardPath)
}

/**
 * ✅ SERVER ACTION: Inscription utilisateur
 */
export async function signupAction(prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  console.log('🚀 [SIGNUP-ACTION] Starting server-side signup...')

  try {
    // ✅ SÉCURITÉ: Vérifier que l'utilisateur n'est pas déjà connecté
    await requireGuest()

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
    console.log('📝 [SIGNUP-ACTION] Data validated for:', validatedData.email)

    // ✅ AUTHENTIFICATION: Utiliser client server Supabase
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData._password,
      options: {
        data: {
          first_name: validatedData.firstName,
          last_name: validatedData.lastName,
          phone: validatedData.phone,
          full_name: `${validatedData.firstName} ${validatedData.lastName}`
        }
      }
    })

    if (error) {
      console.log('❌ [SIGNUP-ACTION] Signup failed:', error.message)

      // ✅ GESTION ERREURS: Messages utilisateur-friendly
      if (error.message.includes('User already registered')) {
        return { success: false, error: 'Un compte existe déjà avec cette adresse email' }
      }
      return { success: false, error: 'Erreur lors de la création du compte : ' + error.message }
    }

    if (!data.user) {
      return { success: false, error: 'Erreur de création de compte inattendue' }
    }

    console.log('✅ [SIGNUP-ACTION] User created:', data.user.email)

    // ✅ CACHE: Invalider le cache des données auth
    revalidatePath('/', 'layout')

    // ✅ REDIRECTION: Vers page de confirmation email
    console.log('📧 [SIGNUP-ACTION] Redirecting to email confirmation page')
    redirect('/auth/signup-success?email=' + encodeURIComponent(validatedData.email))

  } catch (error) {
    console.error('❌ [SIGNUP-ACTION] Exception:', error)

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
 */
export async function resetPasswordAction(prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  console.log('🚀 [RESET-PASSWORD-ACTION] Starting server-side reset...')

  try {
    // ✅ SÉCURITÉ: Vérifier que l'utilisateur n'est pas déjà connecté
    await requireGuest()

    // ✅ VALIDATION: Parser et valider les données
    const rawData = {
      email: formData.get('email') as string
    }

    const validatedData = ResetPasswordSchema.parse(rawData)
    console.log('📝 [RESET-PASSWORD-ACTION] Data validated for:', validatedData.email)

    // ✅ AUTHENTIFICATION: Utiliser client server Supabase
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`
    })

    if (error) {
      console.log('❌ [RESET-PASSWORD-ACTION] Reset failed:', error.message)

      // ✅ GESTION ERREURS: Messages utilisateur-friendly
      if (error.message.includes('User not found')) {
        return { success: false, error: 'Aucun compte associé à cette adresse email' }
      }
      if (error.message.includes('Email rate limit')) {
        return { success: false, error: 'Trop de tentatives. Veuillez patienter avant de réessayer.' }
      }
      return { success: false, error: 'Erreur lors de l\'envoi de l\'email : ' + error.message }
    }

    console.log('✅ [RESET-PASSWORD-ACTION] Reset email sent to:', validatedData.email)

    // ✅ SUCCÈS: Retourner succès sans redirection
    return {
      success: true,
      data: {
        message: 'Email de réinitialisation envoyé avec succès',
        email: validatedData.email
      }
    }

  } catch (error) {
    console.error('❌ [RESET-PASSWORD-ACTION] Exception:', error)

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
  console.log('🚀 [LOGOUT-ACTION] Starting server-side logout...')

  try {
    // ✅ AUTHENTIFICATION: Invalider session
    await invalidateAuth()

    console.log('✅ [LOGOUT-ACTION] User logged out successfully')

    // ✅ CACHE: Invalider tout le cache auth
    revalidatePath('/', 'layout')

    // ✅ REDIRECTION: Vers page de connexion
    redirect('/auth/login')

  } catch (error) {
    console.error('❌ [LOGOUT-ACTION] Exception:', error)

    // ✅ FALLBACK: Redirection même en cas d'erreur
    redirect('/auth/login')
  }
}
