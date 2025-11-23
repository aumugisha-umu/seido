import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailSyncService } from '@/lib/services/domain/email-sync.service';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            return NextResponse.json({ error: 'No team found' }, { status: 404 });
        }

        const connectionId = id;

        // Fetch connection details
        const { data: connection, error } = await supabase
            .from('team_email_connections')
            .select('*')
            .eq('id', connectionId)
            .eq('team_id', userProfile.team_id)
            .single();

        if (error || !connection) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        const syncService = new EmailSyncService(supabase);
        const result = await syncService.syncConnection(connection as unknown as any);

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
