import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailSyncService } from '@/lib/services/domain/email-sync.service';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/emails/sync
 *
 * Route de synchronisation manuelle des emails pour les utilisateurs authentifiés.
 * Différente de /api/cron/sync-emails qui est protégée par CRON_SECRET.
 *
 * Synchronise toutes les connexions email actives de l'équipe de l'utilisateur.
 */
export async function POST(request: Request) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            return NextResponse.json({ error: 'No team found' }, { status: 404 });
        }

        console.log('📧 [MANUAL-SYNC] Starting sync for team:', userProfile.team_id);

        // Service client pour accéder aux connexions (bypass RLS)
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Récupérer les connexions de l'équipe de l'utilisateur
        const { data: connections, error } = await serviceClient
            .from('team_email_connections')
            .select('*')
            .eq('team_id', userProfile.team_id)
            .eq('is_active', true);

        if (error) {
            console.error('📧 [MANUAL-SYNC] Error fetching connections:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!connections?.length) {
            console.log('📧 [MANUAL-SYNC] No active connections found');
            return NextResponse.json({
                success: true,
                message: 'No active connections to sync',
                results: []
            });
        }

        console.log(`📧 [MANUAL-SYNC] Found ${connections.length} active connection(s)`);

        const syncService = new EmailSyncService(serviceClient);

        // Sync parallèle de toutes les connexions de l'équipe
        const syncPromises = connections.map(async (connection) => {
            try {
                console.log(`📧 [MANUAL-SYNC] Syncing connection ${connection.id} (${connection.email_address})`);
                const result = await syncService.syncConnection(connection as any);
                console.log(`📧 [MANUAL-SYNC] Connection ${connection.id} result:`, result.status);
                return result;
            } catch (err: any) {
                console.error(`📧 [MANUAL-SYNC] Connection ${connection.id} error:`, err.message);
                return { connectionId: connection.id, status: 'error', error: err.message };
            }
        });

        const settledResults = await Promise.allSettled(syncPromises);
        const syncResults = settledResults.map(result =>
            result.status === 'fulfilled' ? result.value : result.reason
        );

        // Compter les résultats
        const successCount = syncResults.filter(r => r.status === 'success' || r.status === 'no_new_emails').length;
        const errorCount = syncResults.filter(r => r.status === 'error').length;
        const totalNewEmails = syncResults.reduce((acc, r) => acc + (r.count || 0), 0);

        console.log(`📧 [MANUAL-SYNC] Completed: ${successCount} success, ${errorCount} errors, ${totalNewEmails} new emails`);

        return NextResponse.json({
            success: true,
            results: syncResults,
            summary: {
                connections: connections.length,
                successful: successCount,
                errors: errorCount,
                newEmails: totalNewEmails
            }
        });
    } catch (error: any) {
        console.error('📧 [MANUAL-SYNC] Fatal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
