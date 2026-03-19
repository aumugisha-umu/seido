import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient } from '@/lib/api-service-role-helper'
import { EmailShareRepository } from '@/lib/services/repositories/email-share.repository'

/**
 * GET /api/emails/shared-with-me/groups
 * Returns emails shared with the current user, grouped by source connection.
 * Used for the "Partagés avec moi" sidebar section.
 */
export async function GET() {
  try {
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Verify team membership
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

    const supabaseAdmin = getServiceRoleClient()
    const shareRepo = new EmailShareRepository(supabaseAdmin)
    const groups = await shareRepo.getSharedWithUser(userProfile!.id, membership.team_id)

    return NextResponse.json({ groups })
  } catch (error: unknown) {
    const err = error as { message?: string }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
