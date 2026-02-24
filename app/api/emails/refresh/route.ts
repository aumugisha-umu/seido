import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient } from '@/lib/api-service-role-helper'

/**
 * Lightweight endpoint for email polling
 * Returns counts + latest email IDs without triggering IMAP sync
 * Used for soft refresh every 60 seconds
 */
export async function GET(request: Request) {
  try {
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Get team_id from team_members
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userProfile?.id)
      .in('role', ['gestionnaire', 'admin'])
      .is('left_at', null)
      .single()

    if (membershipError || !membership?.team_id) {
      return NextResponse.json({ error: 'User is not a team manager' }, { status: 403 })
    }

    const teamId = membership.team_id

    // Use service role client for email queries (bypasses slow RLS with 6 policies)
    // Security: User already validated as team manager above
    const supabaseAdmin = getServiceRoleClient()

    // Fetch counts + latest emails in parallel (lightweight queries)
    const [inboxUnread, processedCount, sentCount, archiveCount, latestEmails, lastSync] = await Promise.all([
      // Inbox: Unread received emails
      supabaseAdmin
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('direction', 'received')
        .eq('status', 'unread')
        .is('deleted_at', null),

      // Processed: Read received emails
      supabaseAdmin
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('direction', 'received')
        .eq('status', 'read')
        .is('deleted_at', null),

      // Sent
      supabaseAdmin
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('direction', 'sent')
        .is('deleted_at', null),

      // Archive
      supabaseAdmin
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'archived')
        .is('deleted_at', null),

      // Latest 10 emails (ID only for comparison)
      supabaseAdmin
        .from('emails')
        .select('id, created_at, from_address, subject, status')
        .eq('team_id', teamId)
        .eq('direction', 'received')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10),

      // Last sync timestamp
      supabaseAdmin
        .from('team_email_connections')
        .select('last_sync_at')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('last_sync_at', { ascending: false })
        .limit(1)
    ])

    return NextResponse.json({
      success: true,
      counts: {
        inbox: inboxUnread.count || 0,
        processed: processedCount.count || 0,
        sent: sentCount.count || 0,
        archive: archiveCount.count || 0,
        drafts: 0
      },
      latestEmails: latestEmails.data || [],
      lastSyncAt: lastSync.data?.[0]?.last_sync_at || null,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        // Short cache - this is for polling
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    })

  } catch (error: unknown) {
    console.error('[EMAIL-REFRESH] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
