'use server'

/**
 * Server Actions for Admin User Management
 *
 * Uses service_role key to bypass RLS for admin operations.
 * All actions verify admin role before executing.
 */

import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { getServerAuthContext } from '@/lib/server-context'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { User, UserInsert, UserUpdate } from '@/lib/services/core/service-types'

// Type for action results
interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Verify admin role and get supabase admin client
 */
async function getAdminContext() {
  // Verify admin role
  const { profile } = await getServerAuthContext('admin')

  // Get admin client
  if (!isAdminConfigured()) {
    throw new Error('Service admin non configure - verifiez SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    throw new Error('Client admin non disponible')
  }

  return { profile, supabase }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsersAction(): Promise<ActionResult<User[]>> {
  try {
    const { supabase } = await getAdminContext()
    logger.info('[ADMIN-USERS] Fetching all users')

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[ADMIN-USERS] Error fetching users:', error)
      return { success: false, error: error.message }
    }

    logger.info(`[ADMIN-USERS] Fetched ${data?.length || 0} users`)
    return { success: true, data: data as User[] }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in getAllUsersAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get user by ID (admin only)
 */
export async function getUserByIdAction(id: string): Promise<ActionResult<User>> {
  try {
    const { supabase } = await getAdminContext()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as User }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Create a new user (admin only)
 */
export async function createUserAction(userData: UserInsert): Promise<ActionResult<User>> {
  try {
    const { supabase } = await getAdminContext()
    logger.info('[ADMIN-USERS] Creating new user:', userData.email)

    // Check email uniqueness
    if (userData.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .is('deleted_at', null)
        .single()

      if (existing) {
        return { success: false, error: 'Cet email est deja utilise' }
      }
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        ...userData,
        is_active: userData.is_active ?? true,
        password_set: userData.password_set ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logger.error('[ADMIN-USERS] Error creating user:', error)
      return { success: false, error: error.message }
    }

    logger.info('[ADMIN-USERS] User created:', data.id)
    revalidatePath('/admin/users')
    return { success: true, data: data as User }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in createUserAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Update an existing user (admin only)
 */
export async function updateUserAction(
  id: string,
  updates: UserUpdate
): Promise<ActionResult<User>> {
  try {
    const { supabase } = await getAdminContext()
    logger.info('[ADMIN-USERS] Updating user:', id)

    // Check email uniqueness if changing email
    if (updates.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', updates.email)
        .neq('id', id)
        .is('deleted_at', null)
        .single()

      if (existing) {
        return { success: false, error: 'Cet email est deja utilise par un autre utilisateur' }
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[ADMIN-USERS] Error updating user:', error)
      return { success: false, error: error.message }
    }

    logger.info('[ADMIN-USERS] User updated:', id)
    revalidatePath('/admin/users')
    return { success: true, data: data as User }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in updateUserAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Delete a user (soft delete - admin only)
 */
export async function deleteUserAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, profile } = await getAdminContext()
    logger.info('[ADMIN-USERS] Deleting user:', id)

    // Prevent self-deletion
    if (profile.id === id) {
      return { success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' }
    }

    // Check if user is last admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single()

    if (user?.role === 'admin') {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .is('deleted_at', null)

      if (admins && admins.length <= 1) {
        return { success: false, error: 'Impossible de supprimer le dernier administrateur' }
      }
    }

    // Soft delete
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('[ADMIN-USERS] Error deleting user:', error)
      return { success: false, error: error.message }
    }

    logger.info('[ADMIN-USERS] User deleted:', id)
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in deleteUserAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Change user role (admin only)
 */
export async function changeUserRoleAction(
  id: string,
  newRole: User['role']
): Promise<ActionResult<User>> {
  try {
    const { supabase, profile } = await getAdminContext()
    logger.info('[ADMIN-USERS] Changing role for user:', id, 'to', newRole)

    // Prevent changing own role
    if (profile.id === id) {
      return { success: false, error: 'Vous ne pouvez pas modifier votre propre role' }
    }

    // Check if removing last admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single()

    if (user?.role === 'admin' && newRole !== 'admin') {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .is('deleted_at', null)

      if (admins && admins.filter(a => a.id !== id).length === 0) {
        return { success: false, error: 'Impossible de retirer le role admin au dernier administrateur' }
      }
    }

    return updateUserAction(id, { role: newRole })
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in changeUserRoleAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Toggle user active status (admin only)
 */
export async function toggleUserStatusAction(id: string): Promise<ActionResult<User>> {
  try {
    const { supabase, profile } = await getAdminContext()
    logger.info('[ADMIN-USERS] Toggling status for user:', id)

    // Prevent deactivating self
    if (profile.id === id) {
      return { success: false, error: 'Vous ne pouvez pas desactiver votre propre compte' }
    }

    const { data: user } = await supabase
      .from('users')
      .select('is_active, role')
      .eq('id', id)
      .single()

    if (!user) {
      return { success: false, error: 'Utilisateur non trouve' }
    }

    // Prevent deactivating last active admin
    if (user.is_active && user.role === 'admin') {
      const { data: activeAdmins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .is('deleted_at', null)

      if (activeAdmins && activeAdmins.filter(a => a.id !== id).length === 0) {
        return { success: false, error: 'Impossible de desactiver le dernier administrateur actif' }
      }
    }

    return updateUserAction(id, { is_active: !user.is_active })
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in toggleUserStatusAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Search users by query (admin only)
 */
export async function searchUsersAction(query: string): Promise<ActionResult<User[]>> {
  try {
    const { supabase } = await getAdminContext()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(50)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as User[] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get users by role (admin only)
 */
export async function getUsersByRoleAction(role: User['role']): Promise<ActionResult<User[]>> {
  try {
    const { supabase } = await getAdminContext()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as User[] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
