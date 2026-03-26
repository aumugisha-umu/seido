import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { logger } from '@/lib/logger';

/**
 * GET /api/emails/connections
 * Returns all email connections for the team with unread counts.
 */
export async function GET() {
    const startTime = Date.now();
    try {
        logger.debug({ startTime }, '[PERF] GET /api/emails/connections - Start');
        const authResult = await getApiAuthContext();
        logger.debug({ elapsed: Date.now() - startTime }, '[PERF] Auth context retrieved');
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            logger.info('No team found for user, returning empty connections');
            return NextResponse.json({ connections: [] });
        }

        const queryStart = Date.now();
        // RLS policy already filters: shared connections + user's own private
        const { data: connections, error } = await supabase
            .from('team_email_connections')
            .select('id, provider, email_address, is_active, last_sync_at, last_error, sync_from_date, created_at, auth_method, oauth_token_expires_at, visibility, added_by_user_id')
            .eq('team_id', userProfile.team_id)
            .order('created_at', { ascending: false });
        logger.debug({ elapsed: Date.now() - queryStart }, '[PERF] DB query completed');

        if (error) throw error;

        const connectionIds = (connections || []).map(c => c.id);

        // Batch count queries: 2 queries total instead of 2 per connection (N+1 fix)
        const countStart = Date.now();
        const totalCounts: Record<string, number> = {};
        const unreadCounts: Record<string, number> = {};

        if (connectionIds.length > 0) {
            const [totalResult, unreadResult] = await Promise.all([
                // Single query for total counts grouped by connection
                supabase
                    .from('emails')
                    .select('email_connection_id', { count: 'exact' })
                    .in('email_connection_id', connectionIds)
                    .is('deleted_at', null),
                // Single query for unread counts grouped by connection
                supabase
                    .from('emails')
                    .select('email_connection_id', { count: 'exact' })
                    .in('email_connection_id', connectionIds)
                    .eq('direction', 'received')
                    .eq('status', 'unread')
                    .is('deleted_at', null),
            ]);

            // Group total counts by connection_id
            if (totalResult.data) {
                for (const row of totalResult.data) {
                    const connId = row.email_connection_id as string;
                    totalCounts[connId] = (totalCounts[connId] || 0) + 1;
                }
            }

            // Group unread counts by connection_id
            if (unreadResult.data) {
                for (const row of unreadResult.data) {
                    const connId = row.email_connection_id as string;
                    unreadCounts[connId] = (unreadCounts[connId] || 0) + 1;
                }
            }
        }

        logger.debug({ elapsed: Date.now() - countStart }, '[PERF] Email count queries completed');

        // Merge connections with their counts
        const connectionsWithCount = (connections || []).map(conn => ({
            ...conn,
            email_count: totalCounts[conn.id] || 0,
            unread_count: unreadCounts[conn.id] || 0
        }));

        logger.debug({ elapsed: Date.now() - startTime }, '[PERF] Total request time');
        return NextResponse.json({
            connections: connectionsWithCount
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: message }, '[EMAILS-API] Get connections error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            return NextResponse.json({ error: 'No team found' }, { status: 404 });
        }

        const body = await request.json();
        logger.debug({ body }, 'Received connection request body');
        const {
            provider,
            emailAddress,
            syncFromDate,
            imapUsername,
            imapPassword,
            imapHost,
            imapPort,
            imapUseSsl,
            smtpUsername,
            smtpPassword,
            smtpHost,
            smtpPort,
            smtpUseTls,
            visibility,
        } = body;

        // Validate required fields
        if (!provider || !emailAddress || !imapUsername || !imapPassword || !smtpUsername || !smtpPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const connectionRepo = new EmailConnectionRepository(supabase);

        // Create connection (passwords will be encrypted by repository)
        const connection = await connectionRepo.createConnection({
            team_id: userProfile.team_id,
            provider,
            email_address: emailAddress,
            added_by_user_id: userProfile.id,
            visibility: visibility || 'shared',
            sync_from_date: syncFromDate ? new Date(syncFromDate).toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            imap_host: imapHost,
            imap_port: imapPort,
            imap_use_ssl: imapUseSsl,
            imap_username: imapUsername,
            imap_password: imapPassword,
            smtp_host: smtpHost,
            smtp_port: smtpPort,
            smtp_use_tls: smtpUseTls,
            smtp_username: smtpUsername,
            smtp_password: smtpPassword,
        });

        return NextResponse.json({ connection }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: message }, '[EMAILS-API] Create connection error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
