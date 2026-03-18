/**
 * Internal API: Admin Signup Notification
 *
 * Called from the set-password page (email signup flow) after the user
 * successfully sets their password. Sends a notification to platform admins.
 *
 * OAuth signup notifications are handled directly in completeOAuthProfileAction.
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { createAdminNotificationService } from '@/lib/services/domain/admin-notification/admin-notification.service'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    // 1. Auth check — get current user
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Get admin client for cross-team queries
    if (!isAdminConfigured()) {
      return NextResponse.json({ success: false, error: 'Admin not configured' }, { status: 500 })
    }
    const supabaseAdmin = getSupabaseAdmin()!

    // 3. Get user profile from DB
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, name, created_at')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!profile || !profile.email) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })
    }

    // 4. Only notify for recent signups (< 1 hour) to avoid duplicate notifications
    const createdAt = new Date(profile.created_at)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (createdAt < hourAgo) {
      return NextResponse.json({ success: true, skipped: true, reason: 'User created more than 1 hour ago' })
    }

    // 5. Send admin notification (fire-and-forget)
    const adminService = createAdminNotificationService(supabaseAdmin)

    // Parse first/last name from the name field if individual fields aren't set
    const firstName = profile.first_name || profile.name?.split(' ')[0] || 'Inconnu'
    const lastName = profile.last_name || profile.name?.split(' ').slice(1).join(' ') || ''

    await adminService.notifyNewSignup({
      firstName,
      lastName,
      email: profile.email,
      method: 'email',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, '[ADMIN-SIGNUP-NOTIFY] Unexpected error')
    // Non-blocking — return 200 even on failure to not disrupt user flow
    return NextResponse.json({ success: false, error: 'Internal error' })
  }
}
