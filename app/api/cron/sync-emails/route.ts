import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImapService } from '@/lib/services/domain/imap.service';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { EmailBlacklistRepository } from '@/lib/services/repositories/email-blacklist.repository';
import { EmailSyncService } from '@/lib/services/domain/email-sync.service';

// Service Role Client for Cron Job (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    // Verify Cron Secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const connectionRepo = new EmailConnectionRepository(supabaseAdmin);
        const syncService = new EmailSyncService(supabaseAdmin);

        // 1. Get all active connections
        const connections = await connectionRepo.getActiveConnections();
        const results = [];

        for (const connection of connections) {
            const result = await syncService.syncConnection(connection);
            results.push(result);
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
