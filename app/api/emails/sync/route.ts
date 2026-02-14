import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailSyncService } from '@/lib/services/domain/email-sync.service';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

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

        logger.info({ teamId: userProfile.team_id }, '[MANUAL-SYNC] Starting sync for team');

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
            logger.info('[MANUAL-SYNC] No active connections found');
            return NextResponse.json({
                success: true,
                message: 'No active connections to sync',
                results: []
            });
        }

        logger.info({ connectionCount: connections.length }, '[MANUAL-SYNC] Found active connections');

        const syncService = new EmailSyncService(serviceClient);

        // Sync parallèle de toutes les connexions de l'équipe
        const syncPromises = connections.map(async (connection) => {
            try {
                logger.info({ connectionId: connection.id, email: connection.email_address }, '[MANUAL-SYNC] Syncing connection');
                const result = await syncService.syncConnection(connection as any);
                logger.info({ connectionId: connection.id, status: result.status }, '[MANUAL-SYNC] Connection sync result');
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

        logger.info({ successCount, errorCount, totalNewEmails }, '[MANUAL-SYNC] Completed');

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
