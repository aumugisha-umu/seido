import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { getServiceRoleClient } from '@/lib/api-service-role-helper';
import { logger } from '@/lib/logger';
import { getTeamManagerContext } from '@/lib/services/helpers/api-team-context';
import { EmailVisibilityService } from '@/lib/services/domain/email-visibility.service';

export async function GET() {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        // Retrieve team_id from team_members (source of truth)
        const teamId = await getTeamManagerContext(supabase, userProfile?.id);

        if (!teamId) {
            return NextResponse.json({ error: 'User is not a team manager' }, { status: 403 });
        }

        // Use service role client for email queries (bypasses slow RLS with 6 policies)
        // Security: User already validated as team manager above
        const supabaseAdmin = getServiceRoleClient();

        // Get accessible connection IDs for visibility filtering
        const connectionIds = await EmailVisibilityService.getAccessibleConnectionIds(
            supabaseAdmin, teamId, userProfile!.id
        );

        // Build base query helper with visibility filter
        const baseQuery = () => {
            let q = supabaseAdmin
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .is('deleted_at', null);
            if (connectionIds.length > 0) {
                q = q.in('email_connection_id', connectionIds);
            }
            return q;
        };

        // Fetch counts in parallel
        const [inboxUnread, processedCount, sentCount, archiveCount] = await Promise.all([
            // Inbox: Unread received emails
            baseQuery()
                .eq('direction', 'received')
                .eq('status', 'unread'),

            // Processed: Read received emails (not archived)
            baseQuery()
                .eq('direction', 'received')
                .eq('status', 'read'),

            // Sent (Total)
            baseQuery()
                .eq('direction', 'sent'),

            // Archive (Total)
            baseQuery()
                .eq('status', 'archived')
        ]);

        return NextResponse.json({
            counts: {
                inbox: inboxUnread.count || 0,
                processed: processedCount.count || 0,
                sent: sentCount.count || 0,
                archive: archiveCount.count || 0,
                drafts: 0 // Not implemented yet
            }
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: message }, '[EMAILS-API] Get email counts error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
