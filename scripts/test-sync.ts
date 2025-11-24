import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    // Import services after env vars are loaded
    const { ImapService } = await import('../lib/services/domain/imap.service');

    console.log('Starting sync test...');

    const { data: connections, error } = await supabase
        .from('team_email_connections')
        .select('*');

    if (error) {
        console.error('Error fetching connections:', error);
        return;
    }

    console.log(`Found ${connections.length} connections.`);

    for (const connection of connections) {
        console.log(`Testing connection: ${connection.email_address}`);
        try {
            const emails = await ImapService.fetchNewEmails(connection);
            console.log(`Fetched ${emails.length} emails.`);
            if (emails.length > 0) {
                console.log('First email subject:', emails[0].subject);
                console.log('First email date:', emails[0].date);
            }
        } catch (err) {
            console.error(`Error syncing ${connection.email_address}:`, err);
        }
    }
}

main();
