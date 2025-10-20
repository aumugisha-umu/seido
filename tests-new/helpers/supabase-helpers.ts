/**
 * 🗄️ SUPABASE HELPERS - Helpers pour accéder à Supabase en tests
 *
 * Fonctionnalités :
 * - Récupérer le token de confirmation email
 * - Construire l'URL de confirmation
 * - Vérifier l'état de l'utilisateur
 */

import { createClient } from '@supabase/supabase-js'
import { TEST_CONFIG } from '../config/test-config'

/**
 * Créer un client Supabase admin pour les tests
 */
export const createTestSupabaseClient = () => {
  // Charger les variables d'environnement depuis .env.local si nécessaire
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ [SUPABASE-HELPER] Missing environment variables')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)

    // Essayer de les récupérer via fetch de l'API test
    throw new Error('SUPABASE credentials not configured for tests. Please ensure .env.local is loaded.')
  }

  console.log('✅ [SUPABASE-HELPER] Creating admin client')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Récupérer le lien de confirmation pour un email
 * Utilise l'API /api/test/get-confirmation-link pour éviter les problèmes de variables d'environnement
 */
export const getConfirmationLinkForEmail = async (
  email: string
): Promise<string | null> => {
  console.log('🔍 Fetching confirmation link for:', email)

  try {
    const response = await fetch(`${TEST_CONFIG.baseURL}/api/test/get-confirmation-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Failed to get confirmation link:', error)
      return null
    }

    const data = await response.json()

    if (data.confirmed) {
      console.log('✅ Email already confirmed')
      return null
    }

    if (!data.confirmationLink) {
      console.warn('⚠️  No confirmation link received')
      return null
    }

    console.log('🔗 Confirmation link received:', data.confirmationLink)

    return data.confirmationLink
  } catch (error) {
    console.error('❌ Error fetching confirmation link:', error)
    return null
  }
}

/**
 * Vérifier si un utilisateur existe dans Supabase
 * Utilise l'API /api/test/get-confirmation-link pour vérifier l'existence
 */
export const userExistsInSupabase = async (email: string): Promise<boolean> => {
  console.log('🔍 Checking if user exists:', email)

  try {
    const response = await fetch(`${TEST_CONFIG.baseURL}/api/test/get-confirmation-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (response.status === 404) {
      console.log('⚠️  User not found')
      return false
    }

    if (!response.ok) {
      console.error('❌ Error checking user existence')
      return false
    }

    console.log('✅ User exists')
    return true
  } catch (error) {
    console.error('❌ Error checking user:', error)
    return false
  }
}

/**
 * Attendre qu'un utilisateur soit créé dans Supabase
 * Si expectToExist = false, vérifie qu'il n'existe PAS
 */
export const waitForUserInSupabase = async (
  email: string,
  options: { timeout?: number; interval?: number; expectToExist?: boolean } = {}
): Promise<boolean> => {
  const timeout = options.timeout || 10000 // 10s par défaut
  const interval = options.interval || 500  // 500ms entre checks
  const expectToExist = options.expectToExist !== false // true par défaut

  if (expectToExist) {
    console.log(`⏳ Waiting for user to be created in Supabase: ${email}`)
  } else {
    console.log(`⏳ Waiting to verify user does NOT exist in Supabase: ${email}`)
  }

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const exists = await userExistsInSupabase(email)

    if (expectToExist && exists) {
      console.log('✅ User found in Supabase')
      return true
    }

    if (!expectToExist && !exists) {
      console.log('✅ User does NOT exist (as expected)')
      return false // Retourne false car l'utilisateur n'existe pas (ce qui est attendu)
    }

    // Attendre avant le prochain check
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  if (expectToExist) {
    console.error(`❌ User not found after ${timeout}ms`)
    return false
  } else {
    console.warn(`⚠️  User still exists after ${timeout}ms (expected NOT to exist)`)
    return true // Retourne true car l'utilisateur existe (non attendu)
  }
}

/**
 * Supprimer un utilisateur de Supabase (cleanup)
 */
export const deleteUserFromSupabase = async (email: string): Promise<void> => {
  console.log('🧹 Deleting user from Supabase:', email)

  const supabase = createTestSupabaseClient()

  // Trouver l'utilisateur
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Failed to list users:', listError)
    return
  }

  const user = users.find((u) => u.email === email)

  if (!user) {
    console.warn('⚠️  User not found, already deleted?')
    return
  }

  // Supprimer l'utilisateur
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

  if (deleteError) {
    console.error('❌ Failed to delete user:', deleteError)
    return
  }

  console.log('✅ User deleted from Supabase')
}

export default {
  createTestSupabaseClient,
  getConfirmationLinkForEmail,
  userExistsInSupabase,
  waitForUserInSupabase,
  deleteUserFromSupabase,
}
