'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { Database } from './database.types'
import { userService, teamService } from './database-service'
import { activityLogger } from './activity-logger'

export interface SignUpData {
  email: string
  password: string
  name: string
  first_name: string
  last_name: string
  phone?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface ResetPasswordData {
  email: string
}

export interface UpdatePasswordData {
  password: string
  accessToken: string
  refreshToken: string
}

/**
 * 🔐 SERVER ACTIONS - AUTHENTIFICATION SEIDO (Bonnes Pratiques 2025)
 *
 * - Server Actions pour toutes les mutations d'authentification
 * - Validation côté serveur uniquement
 * - HTTP-only cookies pour sécurité
 * - CSRF protection automatique
 */

function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                // ✅ BONNE PRATIQUE 2025: HTTP-only cookies pour sécurité
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
              })
            })
          } catch {
            // Ignore l'erreur de set cookies depuis Server Action
            console.log('Note: Cookie setting ignored in Server Action context')
          }
        },
      },
    }
  )
}

/**
 * Action de connexion
 */
export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !_password) {
    return { error: 'Email et mot de passe requis' }
  }

  const supabase = await createServerSupabaseClient()

  try {
    // ✅ BONNE PRATIQUE 2025: Authentification côté serveur
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.log('❌ [AUTH-ACTION] Sign in failed:', error.message)
      return { error: 'Email ou mot de passe incorrect' }
    }

    if (!data.user) {
      return { error: 'Erreur de connexion' }
    }

    console.log('✅ [AUTH-ACTION] User signed in:', data.user.id)

    // Vérifier que l'utilisateur a un profil
    const userProfile = await userService.getByAuthUserId(data.user.id)
    if (!userProfile) {
      // Déconnecter si pas de profil
      await supabase.auth.signOut()
      return { error: 'Profil utilisateur non trouvé' }
    }

    // Redirection basée sur le rôle
    const dashboardRoutes = {
      admin: '/admin',
      gestionnaire: '/gestionnaire',
      prestataire: '/prestataire',
      locataire: '/locataire'
    }

    const redirectPath = dashboardRoutes[userProfile.role] || '/auth/login'
    redirect(redirectPath)
  } catch (error) {
    console.error('❌ [AUTH-ACTION] Sign in error:', error)
    return { error: 'Erreur de connexion' }
  }
}

/**
 * Action d'inscription
 */
export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const phone = formData.get('phone') as string || undefined

  if (!email || !password || !name || !first_name || !last_name) {
    return { error: 'Tous les champs requis doivent être remplis' }
  }

  const supabase = await createServerSupabaseClient()

  try {
    // Créer l'utilisateur auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      _password,
      options: {
        data: {
          full_name: name,
          first_name,
          last_name,
          display_name: name
        }
      }
    })

    if (authError || !authData.user) {
      console.log('❌ [AUTH-ACTION] Sign up failed:', authError?.message)
      return { error: authError?.message || 'Erreur création compte' }
    }

    // Créer le profil utilisateur
    const userProfile = await userService.create({
      auth_user_id: authData.user.id,
      email: authData.user.email!,
      name,
      first_name,
      last_name,
      role: 'gestionnaire' as Database['public']['Enums']['user_role'],
      provider_category: null,
      phone: phone || null,
    })

    // Créer l'équipe personnelle
    const team = await teamService.create({
      name: `Équipe de ${name}`,
      description: `Équipe personnelle de ${name}`,
      created_by: userProfile.id
    })

    // Logs d'activité
    try {
      activityLogger.setContext({
        teamId: team.id,
        userId: userProfile.id
      })

      await activityLogger.logTeamAction(
        'create',
        team.id,
        team.name,
        {
          description: 'Création équipe lors inscription',
          created_by: userProfile.id
        }
      )

      await activityLogger.logUserAction(
        'create',
        userProfile.id,
        name,
        {
          email: authData.user.email,
          role: 'gestionnaire',
          team_id: team.id
        }
      )
    } catch (logError) {
      console.warn('⚠️ [AUTH-ACTION] Activity logging failed:', logError)
    }

    console.log('✅ [AUTH-ACTION] User signed up:', authData.user.id)

    // Si email confirmé, rediriger vers dashboard
    if (authData.user.email_confirmed_at) {
      redirect('/gestionnaire')
    } else {
      // Sinon, rediriger vers page de confirmation
      redirect('/auth/signup-success')
    }
  } catch (error) {
    console.error('❌ [AUTH-ACTION] Sign up error:', error)
    return { error: 'Erreur création compte' }
  }
}

/**
 * Action de déconnexion
 */
export async function signOutAction() {
  const supabase = await createServerSupabaseClient()

  try {
    await supabase.auth.signOut()
    console.log('✅ [AUTH-ACTION] User signed out')
  } catch (error) {
    console.error('❌ [AUTH-ACTION] Sign out error:', error)
  }

  redirect('/auth/login')
}

/**
 * Action de réinitialisation de mot de passe
 */
export async function resetPasswordAction(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email requis' }
  }

  const supabase = await createServerSupabaseClient()

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`
    })

    if (error) {
      console.log('❌ [AUTH-ACTION] Password reset failed:', error.message)
      return { error: 'Erreur envoi email de réinitialisation' }
    }

    console.log('✅ [AUTH-ACTION] Password reset email sent to:', email)
    return { success: 'Email de réinitialisation envoyé' }
  } catch (error) {
    console.error('❌ [AUTH-ACTION] Password reset error:', error)
    return { error: 'Erreur envoi email' }
  }
}

/**
 * Action de mise à jour du mot de passe
 */
export async function updatePasswordAction(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Mot de passe et confirmation requis' }
  }

  if (password !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas' }
  }

  if (password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères' }
  }

  const supabase = await createServerSupabaseClient()

  try {
    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      console.log('❌ [AUTH-ACTION] Password update failed:', error.message)
      return { error: 'Erreur mise à jour mot de passe' }
    }

    console.log('✅ [AUTH-ACTION] Password updated successfully')
    redirect('/auth/login?message=Mot de passe mis à jour avec succès')
  } catch (error) {
    console.error('❌ [AUTH-ACTION] Password update error:', error)
    return { error: 'Erreur mise à jour mot de passe' }
  }
}
