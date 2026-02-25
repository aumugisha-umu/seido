import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { getServiceRoleClient } from '@/lib/api-service-role-helper';

export async function GET(request: Request) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        // Récupérer le team_id depuis team_members (source de vérité)
        const { data: membership, error: membershipError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', userProfile?.id)
            .in('role', ['gestionnaire', 'admin'])
            .is('left_at', null)
            .single();

        if (membershipError || !membership?.team_id) {
            return NextResponse.json({ error: 'User is not a team manager' }, { status: 403 });
        }

        const teamId = membership.team_id;

        // Use service role client for email queries (bypasses slow RLS with 6 policies)
        // Security: User already validated as team manager above
        const supabaseAdmin = getServiceRoleClient();

        // Fetch counts in parallel
        const [inboxUnread, processedCount, sentCount, archiveCount] = await Promise.all([
            // Inbox: Unread received emails
            supabaseAdmin
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('direction', 'received')
                .eq('status', 'unread')
                .is('deleted_at', null),

            // Processed: Read received emails (not archived)
            supabaseAdmin
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('direction', 'received')
                .eq('status', 'read')
                .is('deleted_at', null),

            // Sent (Total)
            supabaseAdmin
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('direction', 'sent')
                .is('deleted_at', null),

            // Archive (Total)
            supabaseAdmin
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('status', 'archived')
                .is('deleted_at', null)
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

    } catch (error: any) {
        console.error('Get email counts error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
