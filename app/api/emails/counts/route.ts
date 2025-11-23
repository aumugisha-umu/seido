import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';

export async function GET(request: Request) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            return NextResponse.json({ error: 'User has no team' }, { status: 403 });
        }

        const teamId = userProfile.team_id;

        // Fetch counts in parallel
        const [inboxUnread, sentCount, archiveCount] = await Promise.all([
            // Inbox Unread
            supabase
                .from('emails')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('direction', 'received')
                .eq('status', 'unread'),

            // Sent (Total)
            supabase
                .from('emails')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('direction', 'sent'),

            // Archive (Total)
            supabase
                .from('emails')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('status', 'archived')
        ]);

        return NextResponse.json({
            counts: {
                inbox: inboxUnread.count || 0,
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
