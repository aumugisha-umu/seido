import { SupabaseClient } from '@supabase/supabase-js';
import { ImapService } from '@/lib/services/domain/imap.service';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { EmailBlacklistRepository } from '@/lib/services/repositories/email-blacklist.repository';
import { GmailOAuthService } from '@/lib/services/domain/gmail-oauth.service';
import { TeamEmailConnection } from '@/lib/types/email-integration';
import { logger } from '@/lib/logger';

/**
 * Sanitizes error messages before storing in DB or logging
 */
function sanitizeErrorForStorage(error: Error | any): string {
    try {
        const message = error?.message || error?.toString() || 'Unknown error';
        return message
            .replace(/\\u[\da-fA-F]{0,3}(?![0-9a-fA-F])/g, '') // Remove incomplete \u sequences
            .replace(/\\x[\da-fA-F]{0,1}(?![0-9a-fA-F])/g, '') // Remove incomplete \x sequences
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .substring(0, 500) // Limit length for DB storage
            .trim();
    } catch {
        return 'Error during synchronization (message sanitization failed)';
    }
}

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

    /**
     * Rafraîchit le token OAuth si nécessaire et met à jour la DB
     */
    private async refreshOAuthTokenIfNeeded(connection: TeamEmailConnection): Promise<TeamEmailConnection> {
        if (connection.auth_method !== 'oauth') {
            return connection;
        }

        if (!connection.oauth_refresh_token || !connection.oauth_token_expires_at) {
            return connection;
        }

        const isExpired = GmailOAuthService.isTokenExpired(
            new Date(connection.oauth_token_expires_at)
        );

        if (!isExpired) {
            return connection;
        }

        logger.info({ connectionId: connection.id }, 'Refreshing OAuth token for connection');

        try {
            // Déchiffrer le refresh token
            const { refreshToken } = GmailOAuthService.decryptTokens(
                connection.oauth_access_token || '',
                connection.oauth_refresh_token
            );

            // Obtenir un nouveau access token
            const { accessToken, expiresAt } = await GmailOAuthService.refreshAccessToken(refreshToken);

            // Chiffrer le nouveau token
            const encryptedTokens = GmailOAuthService.encryptTokens({
                accessToken,
                refreshToken,
                expiresAt,
                scope: connection.oauth_scope || ''
            });

            // Mettre à jour la DB
            const { error } = await this.supabase
                .from('team_email_connections')
                .update({
                    oauth_access_token: encryptedTokens.encryptedAccessToken,
                    oauth_token_expires_at: expiresAt.toISOString()
                })
                .eq('id', connection.id);

            if (error) {
                console.error('Failed to update refreshed token:', error);
            } else {
                logger.info('OAuth token refreshed successfully');
            }

            // Retourner la connexion avec le nouveau token
            return {
                ...connection,
                oauth_access_token: encryptedTokens.encryptedAccessToken,
                oauth_token_expires_at: expiresAt.toISOString()
            };
        } catch (err: any) {
            console.error('Failed to refresh OAuth token:', err);
            throw new Error(`Échec du rafraîchissement du token OAuth: ${err.message}`);
        }
    }

    async syncConnection(connection: TeamEmailConnection): Promise<SyncResult> {
        try {
            // Rafraîchir le token OAuth si nécessaire
            const refreshedConnection = await this.refreshOAuthTokenIfNeeded(connection);

            // Fetch new emails (utilise la connexion avec token rafraîchi)
            const { emails: parsedEmails, maxUid } = await ImapService.fetchNewEmails(refreshedConnection);

            if (parsedEmails.length === 0) {
                // Still update last_sync_at even if no new emails
                await this.connectionRepo.updateLastUid(connection.id, maxUid);
                return { connectionId: connection.id, status: 'no_new_emails' };
            }

            let processedCount = 0;
            let blacklistedCount = 0;
            let duplicateCount = 0;

            for (const email of parsedEmails) {
                // Extract clean email from RFC 5322 format for blacklist check
                // "Display Name" <email@domain.com> → email@domain.com
                const cleanFrom = email.from.match(/<([^>]+)>/)?.[1]?.trim().toLowerCase()
                    || email.from.trim().toLowerCase();

                // Check blacklist
                const isBlacklisted = await this.blacklistRepo.isBlacklisted(
                    connection.team_id,
                    cleanFrom
                );

                if (isBlacklisted) {
                    blacklistedCount++;
                    logger.debug({ from: email.from }, '[SYNC] Skipping blacklisted email');
                    continue;
                }

                // Deduplicate: skip if message_id already exists for this team
                if (email.messageId) {
                    const { count } = await this.supabase
                        .from('emails')
                        .select('id', { count: 'exact', head: true })
                        .eq('team_id', connection.team_id)
                        .eq('message_id', email.messageId);

                    if (count && count > 0) {
                        duplicateCount++;
                        logger.debug({ messageId: email.messageId }, '[SYNC] Skipping duplicate email');
                        continue;
                    }
                }

                // Save email with RFC 5322 threading headers
                // Wrapped in try-catch to handle UNIQUE constraint race condition
                let savedEmail;
                try {
                    savedEmail = await this.emailRepo.createEmail({
                        team_id: connection.team_id,
                        email_connection_id: connection.id,
                        direction: 'received',
                        message_id: email.messageId,
                        in_reply_to_header: email.inReplyTo, // RFC 5322 In-Reply-To header
                        references: email.references,        // RFC 5322 References header
                        from_address: email.from,
                        to_addresses: email.to,
                        subject: email.subject,
                        body_text: email.text,
                        body_html: email.html,
                        received_at: email.date.toISOString(),
                    });
                } catch (insertError: any) {
                    // UNIQUE constraint violation (23505) = duplicate, skip silently
                    if (insertError?.code === '23505') {
                        logger.debug({ messageId: email.messageId }, 'Skipping duplicate email (constraint)');
                        continue;
                    }
                    throw insertError;
                }

                logger.debug({
                    messageId: email.messageId,
                    from: email.from,
                    subject: email.subject?.substring(0, 50),
                    date: email.date,
                }, '[SYNC] Email inserted');

                // Save attachments
                if (email.attachments.length > 0) {
                    for (const att of email.attachments) {
                        // Sanitize filename to prevent Storage errors (remove special chars)
                        const sanitizedFilename = (att.filename || 'unknown').replace(/[^a-zA-Z0-9.-]/g, '_');
                        const fileName = `${connection.team_id}/${Date.now()}_${sanitizedFilename}`;

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

            logger.info({
                connectionId: connection.id,
                email: connection.email_address,
                imapFetched: parsedEmails.length,
                inserted: processedCount,
                blacklisted: blacklistedCount,
                duplicates: duplicateCount,
                parseErrors: parsedEmails.length - processedCount - blacklistedCount - duplicateCount,
            }, '[SYNC] Connection sync summary');

            // Update connection status with new maxUid
            await this.connectionRepo.updateLastUid(connection.id, maxUid);

            return {
                connectionId: connection.id,
                status: 'success',
                count: processedCount
            };

        } catch (err: any) {
            const sanitizedError = sanitizeErrorForStorage(err);
            console.error(`Error syncing connection ${connection.id}:`, sanitizedError);
            await this.connectionRepo.recordError(connection.id, sanitizedError);
            return { connectionId: connection.id, status: 'error', error: sanitizedError };
        }
    }
}
