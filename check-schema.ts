
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking schema for team_email_connections...');

    // Try to select the new column
    const { data, error } = await supabase
        .from('team_email_connections')
        .select('id, sync_from_date')
        .limit(1);

    if (error) {
        console.error('Error querying table:', error);
    } else {
        console.log('Query successful. Data:', data);
    }
}

checkSchema();
