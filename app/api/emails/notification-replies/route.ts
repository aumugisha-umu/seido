import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * GET /api/emails/notification-replies
 * Returns notification reply emails grouped by intervention.
 *
 * These are emails received via webhook (email_connection_id IS NULL)
 * that are linked to interventions via the email_links table.
 */
export async function GET() {
  try {
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    if (!userProfile?.team_id) {
      return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
    }

    // Get emails that:
    // 1. Are from this team
    // 2. Have email_connection_id IS NULL (webhook inbound)
    // 3. Are linked to interventions via email_links
    const { data: linkData, error: linkError } = await supabase
      .from('email_links')
      .select(`
        entity_id,
        emails!inner (
          id,
          status
        )
      `)
      .eq('team_id', userProfile.team_id)
      .eq('entity_type', 'intervention')
      .is('emails.email_connection_id', null)
      .eq('emails.direction', 'received')
      .is('emails.deleted_at', null)

    if (linkError) {
      console.error('[NOTIFICATION-REPLIES] Error fetching links:', linkError)
      return NextResponse.json({ success: false, error: 'Error fetching links' }, { status: 500 })
    }

    // Group by intervention
    const interventionMap = new Map<string, { emailCount: number; unreadCount: number }>()

    linkData?.forEach((row: any) => {
      const interventionId = row.entity_id
      const email = row.emails

      if (!interventionMap.has(interventionId)) {
        interventionMap.set(interventionId, { emailCount: 0, unreadCount: 0 })
      }

      const stats = interventionMap.get(interventionId)!
      stats.emailCount++
      if (email.status === 'unread') {
        stats.unreadCount++
      }
    })

    // If no interventions with replies, return empty
    if (interventionMap.size === 0) {
      return NextResponse.json({ success: true, groups: [] })
    }

    // Fetch intervention details
    const interventionIds = Array.from(interventionMap.keys())
    const { data: interventions, error: intError } = await supabase
      .from('interventions')
      .select('id, title, reference')
      .in('id', interventionIds)

    if (intError) {
      console.error('[NOTIFICATION-REPLIES] Error fetching interventions:', intError)
      return NextResponse.json({ success: false, error: 'Error fetching interventions' }, { status: 500 })
    }

    // Build response groups sorted by unread count (most unread first)
    const groups = (interventions || [])
      .map(intervention => ({
        intervention: {
          id: intervention.id,
          title: intervention.title,
          reference: intervention.reference
        },
        emailCount: interventionMap.get(intervention.id)?.emailCount || 0,
        unreadCount: interventionMap.get(intervention.id)?.unreadCount || 0
      }))
      .sort((a, b) => b.unreadCount - a.unreadCount)

    return NextResponse.json({ success: true, groups })

  } catch (error) {
    console.error('[NOTIFICATION-REPLIES] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
