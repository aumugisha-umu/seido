import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImapService } from '@/lib/services/domain/imap.service';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { EmailBlacklistRepository } from '@/lib/services/repositories/email-blacklist.repository';

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
        const emailRepo = new EmailRepository(supabaseAdmin);
        const blacklistRepo = new EmailBlacklistRepository(supabaseAdmin);

        // 1. Get all active connections
        const connections = await connectionRepo.getActiveConnections();
        const results = [];

        for (const connection of connections) {
            try {
                // 2. Fetch new emails
                const parsedEmails = await ImapService.fetchNewEmails(connection);

                if (parsedEmails.length === 0) {
                    results.push({ connectionId: connection.id, status: 'no_new_emails' });
                    continue;
                }

                let processedCount = 0;

                for (const email of parsedEmails) {
                    // 3. Check blacklist
                    const isBlacklisted = await blacklistRepo.isBlacklisted(
                        connection.team_id,
                        email.from
                    );

                    if (isBlacklisted) {
                        console.log(`Skipping blacklisted email from ${email.from}`);
                        continue;
                    }

                    // 4. Save email
                    const savedEmail = await emailRepo.createEmail({
                        team_id: connection.team_id,
                        email_connection_id: connection.id,
                        direction: 'received',
                        message_id: email.messageId,
                        from_address: email.from,
                        to_addresses: email.to,
                        subject: email.subject,
                        body_text: email.text,
                        body_html: email.html,
                        received_at: email.date.toISOString(),
                    });

                    // 5. Save attachments
                    if (email.attachments.length > 0) {
                        for (const att of email.attachments) {
                            const fileName = `${connection.team_id}/${Date.now()}_${att.filename}`;

                            // Upload to Storage
                            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                                .from('email-attachments')
                                .upload(fileName, att.content);

                            if (uploadError) {
                                console.error('Failed to upload attachment', uploadError);
                                continue;
                            }

                            // Save metadata
                            await supabaseAdmin.from('email_attachments').insert({
                                email_id: savedEmail.id,
                                filename: att.filename,
                                content_type: att.contentType,
                                size_bytes: att.size,
                                storage_path: uploadData.path
                            });
                        }
                    }

                    processedCount++;
                }

                // 6. Update connection status
                await connectionRepo.updateLastUid(connection.id, connection.last_uid); // Keep same UID for now, just update timestamp

                results.push({
                    connectionId: connection.id,
                    status: 'success',
                    count: processedCount
                });

            } catch (err: any) {
                console.error(`Error syncing connection ${connection.id}:`, err);
                await connectionRepo.recordError(connection.id, err.message);
                results.push({ connectionId: connection.id, status: 'error', error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
