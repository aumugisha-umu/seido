'use server'

import { createServerSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * Check if the current user has a push subscription in the database
 * This is the source of truth for whether push notifications are enabled
 */
export async function checkUserPushSubscription(): Promise<{
  hasSubscription: boolean
  subscriptionCount: number
  error?: string
}> {
  try {
    const supabase = await createServerSupabaseClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.debug('[PUSH-ACTION] No authenticated user')
      return { hasSubscription: false, subscriptionCount: 0 }
    }

    // Get user profile to get the correct user_id (from users table, not auth.users)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .is('deleted_at', null)
      .limit(1)
      .single()

    if (profileError || !profile) {
      logger.debug('[PUSH-ACTION] No user profile found')
      return { hasSubscription: false, subscriptionCount: 0 }
    }

    // Check for subscriptions in the database
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', profile.id)

    if (subError) {
      logger.error({ error: subError }, '❌ [PUSH-ACTION] Error checking subscriptions')
      return { hasSubscription: false, subscriptionCount: 0, error: subError.message }
    }

    const count = subscriptions?.length || 0
    logger.debug({ userId: profile.id, count }, '🔔 [PUSH-ACTION] Subscription check')

    return {
      hasSubscription: count > 0,
      subscriptionCount: count
    }
  } catch (error) {
    logger.error({ error }, '❌ [PUSH-ACTION] Unexpected error in checkUserPushSubscription')
    return {
      hasSubscription: false,
      subscriptionCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete all push subscriptions for the current user
 * Used when user wants to disable push notifications
 */
export async function deleteUserPushSubscriptions(): Promise<{
  success: boolean
  deletedCount: number
  error?: string
}> {
  try {
    const supabase = await createServerSupabaseClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, deletedCount: 0, error: 'Non authentifié' }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .is('deleted_at', null)
      .limit(1)
      .single()

    if (profileError || !profile) {
      return { success: false, deletedCount: 0, error: 'Profil utilisateur introuvable' }
    }

    // Delete all subscriptions for this user
    const { error: deleteError, count } = await supabase
      .from('push_subscriptions')
      .delete({ count: 'exact' })
      .eq('user_id', profile.id)

    if (deleteError) {
      logger.error({ error: deleteError }, '❌ [PUSH-ACTION] Error deleting subscriptions')
      return { success: false, deletedCount: 0, error: deleteError.message }
    }

    logger.info({ userId: profile.id, deletedCount: count }, '✅ [PUSH-ACTION] Subscriptions deleted')

    return {
      success: true,
      deletedCount: count || 0
    }
  } catch (error) {
    logger.error({ error }, '❌ [PUSH-ACTION] Unexpected error in deleteUserPushSubscriptions')
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
