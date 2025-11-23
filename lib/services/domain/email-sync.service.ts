import { SupabaseClient } from '@supabase/supabase-js';
import { ImapService } from '@/lib/services/domain/imap.service';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { EmailBlacklistRepository } from '@/lib/services/repositories/email-blacklist.repository';
import { TeamEmailConnection } from '@/lib/types/email-integration';

export interface SyncResult {
    connectionId: string;
    status: 'success' | 'no_new_emails' | 'error';
    count?: number;
    error?: string;
}

export class EmailSyncService {
    private connectionRepo: EmailConnectionRepository;
    private emailRepo: EmailRepository;
    private blacklistRepo: EmailBlacklistRepository;
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
        this.connectionRepo = new EmailConnectionRepository(supabase);
        this.emailRepo = new EmailRepository(supabase);
        this.blacklistRepo = new EmailBlacklistRepository(supabase);
    }

    async syncConnection(connection: TeamEmailConnection): Promise<SyncResult> {
        try {
            // Fetch new emails
            const parsedEmails = await ImapService.fetchNewEmails(connection);

            if (parsedEmails.length === 0) {
                return { connectionId: connection.id, status: 'no_new_emails' };
            }

            let processedCount = 0;

            for (const email of parsedEmails) {
                // Check blacklist
                const isBlacklisted = await this.blacklistRepo.isBlacklisted(
                    connection.team_id,
                    email.from
                );

                if (isBlacklisted) {
                    console.log(`Skipping blacklisted email from ${email.from}`);
                    continue;
                }

                // Save email
                const savedEmail = await this.emailRepo.createEmail({
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

                // Save attachments
                if (email.attachments.length > 0) {
                    for (const att of email.attachments) {
                        const fileName = `${connection.team_id}/${Date.now()}_${att.filename}`;

                        // Upload to Storage
                        const { data: uploadData, error: uploadError } = await this.supabase.storage
                            .from('email-attachments')
                            .upload(fileName, att.content);

                        if (uploadError) {
                            console.error('Failed to upload attachment', uploadError);
                            continue;
                        }

                        // Save metadata
                        await this.supabase.from('email_attachments').insert({
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

            // Update connection status
            await this.connectionRepo.updateLastUid(connection.id, connection.last_uid); // Keep same UID for now, just update timestamp

            return {
                connectionId: connection.id,
                status: 'success',
                count: processedCount
            };

        } catch (err: any) {
            console.error(`Error syncing connection ${connection.id}:`, err);
            await this.connectionRepo.recordError(connection.id, err.message);
            return { connectionId: connection.id, status: 'error', error: err.message };
        }
    }
}
