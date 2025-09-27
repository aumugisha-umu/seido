import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'
import { userService } from './database-service'

export interface AuthUser {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  display_name?: string
  role: Database['public']['Enums']['user_role']
  team_id?: string
  phone?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

/**
 * 🔐 DATA ACCESS LAYER (DAL) - SEIDO
 *
 * Implementation des bonnes pratiques Next.js 15 pour l'authentification:
 * - Utilise cache() de React pour memoization
 * - Validation serveur uniquement avec getUser()
 * - Authentification proche des données (pas dans middleware)
 * - Session management sécurisé
 */

// Créer le client Supabase côté serveur
async function createServerSupabaseClient() {
  const cookieStore = await cookies()

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
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Next.js bug: https://github.com/vercel/next.js/issues/48081
            // Ignore la tentative de set cookies depuis Server Component
          }
        },
      },
    }
  )
}

/**
 * Vérifie la session utilisateur côté serveur
 * Utilise cache() pour éviter les requêtes multiples dans le même render
 */
export const verifySession = cache(async (): Promise<{ isValid: boolean; user: AuthUser | null }> => {
  const supabase = await createServerSupabaseClient()

  try {
    // ✅ BONNE PRATIQUE 2025: Utiliser getUser() au lieu de getSession()
    // getUser() valide toujours le token côté serveur
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('🚫 [DAL] No valid session found:', error?.message || 'No user')
      return { isValid: false, user: null }
    }

    console.log('✅ [DAL] Valid session found for user:', user.id)

    // Récupérer le profil utilisateur complet depuis la base de données
    const userProfile = await userService.findByAuthUserId(user.id)

    if (!userProfile) {
      console.log('⚠️ [DAL] User authenticated but no profile found')
      return { isValid: false, user: null }
    }

    // Construire l'objet AuthUser complet
    const authUser: AuthUser = {
      id: userProfile.id,
      email: user.email!,
      name: userProfile.name,
      first_name: userProfile.first_name || undefined,
      last_name: userProfile.last_name || undefined,
      display_name: userProfile.display_name || userProfile.name,
      role: userProfile.role,
      team_id: userProfile.team_id || undefined,
      phone: userProfile.phone || undefined,
      avatar_url: userProfile.avatar_url || undefined,
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at
    }

    console.log('✅ [DAL] Complete user profile loaded:', {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      team_id: authUser.team_id
    })

    return { isValid: true, user: authUser }
  } catch (error) {
    console.error('❌ [DAL] Session verification failed:', error)
    return { isValid: false, user: null }
  }
})

/**
 * Récupère l'utilisateur authentifié ou lève une erreur de redirection
 * À utiliser dans les pages protégées
 */
export const getAuthenticatedUser = cache(async (): Promise<AuthUser> => {
  const { isValid, user } = await verifySession()

  if (!isValid || !user) {
    console.log('🚫 [DAL] Unauthenticated user detected, redirecting to login')
    redirect('/auth/login?reason=session_invalid')
  }

  return user
})

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 */
export const requireRole = cache(async (requiredRole: Database['public']['Enums']['user_role']): Promise<AuthUser> => {
  const user = await getAuthenticatedUser()

  if (user.role !== requiredRole) {
    console.log(`🚫 [DAL] User ${user.id} has role ${user.role}, required: ${requiredRole}`)
    redirect('/auth/unauthorized')
  }

  return user
})

/**
 * Vérifie si l'utilisateur a un des rôles autorisés
 */
export const requireAnyRole = cache(async (allowedRoles: Database['public']['Enums']['user_role'][]): Promise<AuthUser> => {
  const user = await getAuthenticatedUser()

  if (!allowedRoles.includes(user.role)) {
    console.log(`🚫 [DAL] User ${user.id} has role ${user.role}, allowed: [${allowedRoles.join(', ')}]`)
    redirect('/auth/unauthorized')
  }

  return user
})

/**
 * Récupère les permissions de l'utilisateur basées sur son rôle
 */
export const getUserPermissions = cache(async (): Promise<string[]> => {
  const user = await getAuthenticatedUser()

  // Définir les permissions par rôle
  const rolePermissions = {
    admin: ['*'], // Toutes les permissions
    gestionnaire: [
      'interventions.read',
      'interventions.create',
      'interventions.update',
      'quotes.read',
      'quotes.approve',
      'properties.read',
      'properties.create',
      'properties.update',
      'tenants.read',
      'tenants.create',
      'providers.read'
    ],
    prestataire: [
      'interventions.read',
      'interventions.update_status',
      'quotes.create',
      'quotes.update',
      'availability.manage'
    ],
    locataire: [
      'interventions.read',
      'interventions.create',
      'properties.read'
    ]
  }

  return rolePermissions[user.role] || []
})

/**
 * Vérifie si l'utilisateur a une permission spécifique
 */
export const hasPermission = cache(async (permission: string): Promise<boolean> => {
  const permissions = await getUserPermissions()
  return permissions.includes('*') || permissions.includes(permission)
})

/**
 * Middleware de vérification de permissions pour les actions
 */
export const requirePermission = cache(async (permission: string): Promise<AuthUser> => {
  const user = await getAuthenticatedUser()
  const userHasPermission = await hasPermission(permission)

  if (!userHasPermission) {
    console.log(`🚫 [DAL] User ${user.id} lacks permission: ${permission}`)
    redirect('/auth/unauthorized')
  }

  return user
})

/**
 * Récupère les données de base de l'utilisateur (utilisé dans layouts)
 */
export const getUserBasicInfo = cache(async (): Promise<{ id: string; name: string; role: string; email: string } | null> => {
  const { isValid, user } = await verifySession()

  if (!isValid || !user) {
    return null
  }

  return {
    id: user.id,
    name: user.display_name || user.name,
    role: user.role,
    email: user.email
  }
})

/**
 * Détermine la route de dashboard appropriée pour un utilisateur
 */
export const getUserDashboardRoute = cache(async (): Promise<string> => {
  const user = await getAuthenticatedUser()

  const dashboardRoutes = {
    admin: '/admin',
    gestionnaire: '/gestionnaire',
    prestataire: '/prestataire',
    locataire: '/locataire'
  }

  return dashboardRoutes[user.role] || '/auth/login'
})