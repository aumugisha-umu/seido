import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient } from '@/lib/api-service-role-helper'
import { EmailBlacklistRepository } from '@/lib/services/repositories/email-blacklist.repository'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve team_id from authenticated user's team membership.
 * Reusable pattern from /api/emails/route.ts.
 */
const getTeamId = async (supabase: SupabaseClient, userId: string) => {
    const { data: membership, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .in('role', ['gestionnaire', 'admin'])
        .is('left_at', null)
        .single()

    if (error || !membership?.team_id) return null
    return membership.team_id
}

/**
 * GET /api/emails/blacklist
 * Returns the team's blacklist with blocked_by user name.
 */
export async function GET() {
    try {
        const authResult = await getApiAuthContext()
        if (!authResult.success) return authResult.error

        const { supabase, userProfile } = authResult.data
        const userId = userProfile?.id
        if (!userId) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 })
        }

        const teamId = await getTeamId(supabase, userId)
        if (!teamId) {
            return NextResponse.json({ error: 'User is not a team manager' }, { status: 403 })
        }

        // Use service role to bypass RLS for the JOIN query
        const supabaseAdmin = getServiceRoleClient()

        const { data, error } = await supabaseAdmin
            .from('email_blacklist')
            .select('*, users:blocked_by_user_id(first_name, last_name)')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Map to BlacklistEntry shape expected by the UI
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries = (data || []).map((entry: any) => {
            const user = entry.users
            const userName = user
                ? [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Inconnu'
                : 'Inconnu'
            return {
                id: entry.id,
                sender_email: entry.sender_email,
                sender_domain: entry.sender_domain,
                reason: entry.reason,
                blocked_by_user_name: userName,
                is_current_user: entry.blocked_by_user_id === userId,
                created_at: entry.created_at,
            }
        })

        return NextResponse.json({ success: true, entries })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.error({ error: message }, '[BLACKLIST-API] GET error')
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * POST /api/emails/blacklist
 * Add a sender to the blacklist.
 * Body: { senderEmail, reason?, archiveExisting? }
 */
export async function POST(request: Request) {
    try {
        const authResult = await getApiAuthContext()
        if (!authResult.success) return authResult.error

        const { supabase, userProfile } = authResult.data
        const userId = userProfile?.id
        if (!userId) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 })
        }

        const teamId = await getTeamId(supabase, userId)
        if (!teamId) {
            return NextResponse.json({ error: 'User is not a team manager' }, { status: 403 })
        }

        const body = await request.json()
        const { senderEmail, reason, archiveExisting } = body

        if (!senderEmail || typeof senderEmail !== 'string') {
            return NextResponse.json({ error: 'senderEmail is required' }, { status: 400 })
        }

        const supabaseAdmin = getServiceRoleClient()
        const blacklistRepo = new EmailBlacklistRepository(supabaseAdmin)

        // Clean email address (strip RFC 5322 display name)
        const cleanEmail = senderEmail.trim().toLowerCase()

        const entry = await blacklistRepo.addToBlacklist({
            team_id: teamId,
            sender_email: cleanEmail,
            // No sender_domain — block only the exact email, not the whole domain
            reason: reason || undefined,
            blocked_by_user_id: userId,
        })

        logger.info({ teamId, senderEmail: cleanEmail, archiveExisting }, '[BLACKLIST-API] Sender blacklisted')

        // Bulk archive existing emails from this sender if requested
        // from_address in DB may be RFC 5322 format: "Name" <email> or just email
        // Use ILIKE to match both: exact email OR <email> inside angle brackets
        let archivedCount = 0
        if (archiveExisting) {
            const { data, error } = await supabaseAdmin
                .from('emails')
                .update({ status: 'archived' })
                .eq('team_id', teamId)
                .or(`from_address.eq.${cleanEmail},from_address.ilike.%<${cleanEmail}>%`)
                .neq('status', 'archived')
                .select('id')

            if (error) {
                logger.error({ error: error.message }, '[BLACKLIST-API] Bulk archive failed')
            } else {
                archivedCount = data?.length || 0
                logger.info({ archivedCount, senderEmail: cleanEmail }, '[BLACKLIST-API] Existing emails archived')
            }
        }

        return NextResponse.json({
            success: true,
            entry: { id: entry.id, sender_email: entry.sender_email },
            archivedCount,
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        // Handle duplicate entry gracefully
        if (message.includes('unique_blacklist_per_team') || message.includes('duplicate key')) {
            return NextResponse.json({ success: true, alreadyBlocked: true })
        }
        logger.error({ error: message }, '[BLACKLIST-API] POST error')
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * DELETE /api/emails/blacklist
 * Remove a sender from the blacklist.
 * Body: { blacklistId }
 */
export async function DELETE(request: Request) {
    try {
        const authResult = await getApiAuthContext()
        if (!authResult.success) return authResult.error

        const { supabase, userProfile } = authResult.data
        const userId = userProfile?.id
        if (!userId) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 })
        }

        const teamId = await getTeamId(supabase, userId)
        if (!teamId) {
            return NextResponse.json({ error: 'User is not a team manager' }, { status: 403 })
        }

        const body = await request.json()
        const { blacklistId } = body

        if (!blacklistId || typeof blacklistId !== 'string') {
            return NextResponse.json({ error: 'blacklistId is required' }, { status: 400 })
        }

        const supabaseAdmin = getServiceRoleClient()
        const blacklistRepo = new EmailBlacklistRepository(supabaseAdmin)

        await blacklistRepo.removeFromBlacklist(blacklistId)

        logger.info({ teamId, blacklistId }, '[BLACKLIST-API] Sender unblocked')

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.error({ error: message }, '[BLACKLIST-API] DELETE error')
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
