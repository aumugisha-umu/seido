import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

/**
 * Get the database user ID from the authenticated auth user
 *
 * IMPORTANT: This returns the user.id from the users table,
 * NOT the auth.users.id from Supabase Auth
 *
 * @param supabase - Authenticated Supabase client
 * @returns Database user object or null if not found
 */
export async function getDatabaseUser(
  supabase: SupabaseClient<Database>
): Promise<Database['public']['Tables']['users']['Row'] | null> {
  try {
    // Get current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.error('❌ [user-utils] Auth error:', authError)
      return null
    }

    // Get database user from auth user
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      console.error('❌ [user-utils] Database user not found:', userError)
      return null
    }

    return dbUser
  } catch (error) {
    console.error('❌ [user-utils] Error getting database user:', error)
    return null
  }
}

/**
 * Get only the database user ID from the authenticated auth user
 *
 * @param supabase - Authenticated Supabase client
 * @returns Database user ID or null if not found
 */
export async function getDatabaseUserId(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const user = await getDatabaseUser(supabase)
  return user?.id || null
}

/**
 * Check if a user has a specific role
 *
 * @param supabase - Authenticated Supabase client
 * @param role - Role to check for
 * @returns Boolean indicating if user has the role
 */
export async function userHasRole(
  supabase: SupabaseClient<Database>,
  role: Database['public']['Enums']['user_role']
): Promise<boolean> {
  const user = await getDatabaseUser(supabase)
  return user?.role === role
}

/**
 * Check if a user is a member of a specific team
 *
 * @param supabase - Authenticated Supabase client
 * @param teamId - Team ID to check
 * @returns Boolean indicating if user is a team member
 */
export async function isTeamMember(
  supabase: SupabaseClient<Database>,
  teamId: string
): Promise<boolean> {
  const userId = await getDatabaseUserId(supabase)

  if (!userId) return false

  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  return !error && !!data
}

/**
 * Check if a user has access to a specific intervention
 *
 * @param supabase - Authenticated Supabase client
 * @param interventionId - Intervention ID to check
 * @returns Boolean indicating if user has access
 */
export async function hasInterventionAccess(
  supabase: SupabaseClient<Database>,
  interventionId: string
): Promise<boolean> {
  const user = await getDatabaseUser(supabase)

  if (!user) return false

  // Get intervention with team info
  const { data: intervention, error } = await supabase
    .from('interventions')
    .select(`
      id,
      team_id,
      tenant_id
    `)
    .eq('id', interventionId)
    .single()

  if (error || !intervention) return false

  // Check if user is the tenant
  if (intervention.tenant_id === user.id) return true

  // Check if user is a team member
  if (intervention.team_id) {
    return await isTeamMember(supabase, intervention.team_id)
  }

  // Check if user is assigned as a contact (provider)
  const { data: contact } = await supabase
    .from('intervention_contacts')
    .select('id')
    .eq('intervention_id', interventionId)
    .eq('user_id', user.id)
    .single()

  return !!contact
}