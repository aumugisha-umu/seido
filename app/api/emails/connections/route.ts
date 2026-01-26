import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';

/**
 * GET /api/emails/connections
 * Returns all email connections for the team with unread counts.
 *
 * Also returns "notificationRepliesCount" - unread emails received via webhook
 * (email_connection_id IS NULL) for the "Réponses notifs" virtual box.
 */
export async function GET() {
    const startTime = Date.now();
    try {
        console.log('[PERF] GET /api/emails/connections - Start');
        const authResult = await getApiAuthContext();
        console.log(`[PERF] Auth context retrieved in ${Date.now() - startTime}ms`);
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            console.log('No team found for user, returning empty connections');
            return NextResponse.json({ connections: [], notificationRepliesCount: 0 });
        }

        const connectionRepo = new EmailConnectionRepository(supabase);

        const queryStart = Date.now();
        // Get all connections for the team (including OAuth fields)
        const { data: connections, error } = await supabase
            .from('team_email_connections')
            .select('id, provider, email_address, is_active, last_sync_at, last_error, sync_from_date, created_at, auth_method, oauth_token_expires_at')
            .eq('team_id', userProfile.team_id)
            .order('created_at', { ascending: false });
        console.log(`[PERF] DB query completed in ${Date.now() - queryStart}ms`);

        if (error) throw error;

        const connectionIds = (connections || []).map(c => c.id);

        // Parallel queries for counts
        const countStart = Date.now();
        const countPromises: Promise<void>[] = [];

        // Counts per connection
        let totalCounts: Record<string, number> = {};
        let unreadCounts: Record<string, number> = {};

        if (connectionIds.length > 0) {
            // Total emails per connection
            countPromises.push(
                supabase
                    .from('emails')
                    .select('email_connection_id')
                    .in('email_connection_id', connectionIds)
                    .is('deleted_at', null)
                    .then(({ data: counts }) => {
                        if (counts) {
                            totalCounts = counts.reduce((acc, email) => {
                                const connId = email.email_connection_id;
                                if (connId) {
                                    acc[connId] = (acc[connId] || 0) + 1;
                                }
                                return acc;
                            }, {} as Record<string, number>);
                        }
                    })
            );

            // Unread emails per connection (inbox)
            countPromises.push(
                supabase
                    .from('emails')
                    .select('email_connection_id')
                    .in('email_connection_id', connectionIds)
                    .eq('direction', 'received')
                    .eq('status', 'unread')
                    .is('deleted_at', null)
                    .then(({ data: counts }) => {
                        if (counts) {
                            unreadCounts = counts.reduce((acc, email) => {
                                const connId = email.email_connection_id;
                                if (connId) {
                                    acc[connId] = (acc[connId] || 0) + 1;
                                }
                                return acc;
                            }, {} as Record<string, number>);
                        }
                    })
            );
        }

        // Count webhook inbound emails (notification replies) - email_connection_id IS NULL
        let notificationRepliesCount = 0;
        countPromises.push(
            supabase
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', userProfile.team_id)
                .is('email_connection_id', null)
                .eq('direction', 'received')
                .eq('status', 'unread')
                .is('deleted_at', null)
                .then(({ count }) => {
                    notificationRepliesCount = count || 0;
                })
        );

        await Promise.all(countPromises);
        console.log(`[PERF] Email count queries completed in ${Date.now() - countStart}ms`);

        // Merge connections with their counts
        const connectionsWithCount = (connections || []).map(conn => ({
            ...conn,
            email_count: totalCounts[conn.id] || 0,
            unread_count: unreadCounts[conn.id] || 0
        }));

        console.log(`[PERF] Total request time: ${Date.now() - startTime}ms`);
        return NextResponse.json({
            connections: connectionsWithCount,
            notificationRepliesCount
        });
    } catch (error: any) {
        console.error('Get connections error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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
        console.log('Received connection request body:', JSON.stringify(body, null, 2));
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
    } catch (error: any) {
        console.error('Create connection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
