import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EmailSyncService } from '@/lib/services/domain/email-sync.service';

// This route is called by Vercel Cron
export async function GET(request: Request) {
    // Verify Vercel Cron header
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Create a Supabase client with service role to bypass RLS
        // We need to fetch ALL active connections across ALL teams
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch all active connections
        const { data: connections, error } = await supabase
            .from('team_email_connections')
            .select('*')
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching connections:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!connections || connections.length === 0) {
            return NextResponse.json({ message: 'No active connections to sync' });
        }

        console.log(`Starting sync for ${connections.length} connections...`);

        const syncService = new EmailSyncService(supabase);

        // ⚡ OPTIMISATION: Paralléliser le sync de toutes les connections
        // Avant: for séquentiel (~5min pour 10 connections)
        // Après: Promise.allSettled parallèle (~30s pour 10 connections)
        const syncPromises = connections.map(async (connection) => {
            try {
                const result = await syncService.syncConnection(connection as any);
                return result;
            } catch (err: any) {
                console.error(`Failed to sync connection ${connection.id}:`, err);
                return {
                    connectionId: connection.id,
                    status: 'error',
                    error: err.message
                };
            }
        });

        // Promise.allSettled permet de continuer même si certains échouent
        const settledResults = await Promise.allSettled(syncPromises);
        const results = settledResults.map((result) =>
            result.status === 'fulfilled' ? result.value : result.reason
        );

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        console.error('Cron sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
