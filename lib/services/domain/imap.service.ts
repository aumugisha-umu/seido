import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { TeamEmailConnection } from '@/lib/types/email-integration';
import { EncryptionService } from './encryption.service';
import { GmailOAuthService } from './gmail-oauth.service';
import { logger } from '@/lib/logger';

/**
 * Sanitizes error messages by removing invalid Unicode escape sequences
 * that could cause "unsupported Unicode escape sequence" errors
 */
function sanitizeErrorMessage(error: Error): string {
    try {
        // Replace invalid Unicode escape sequences and other problematic patterns
        const message = error.message || error.toString();
        return message
            .replace(/\\u[\da-fA-F]{0,3}(?![0-9a-fA-F])/g, '') // Remove incomplete \u sequences
            .replace(/\\x[\da-fA-F]{0,1}(?![0-9a-fA-F])/g, '') // Remove incomplete \x sequences
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .trim();
    } catch {
        return 'Error parsing email (message sanitization failed)';
    }
}

/**
 * Sanitizes email content (text and HTML) to remove invalid Unicode sequences
 * that PostgreSQL would reject with error 22P05
 */
function sanitizeEmailContent(content: string | undefined): string | undefined {
    if (!content) return content;
    
    try {
        return content
            // Remove standalone backslashes followed by invalid escape sequences
            .replace(/\\u(?![0-9a-fA-F]{4})/g, '') // Remove incomplete \u sequences
            .replace(/\\x(?![0-9a-fA-F]{2})/g, '') // Remove incomplete \x sequences
            .replace(/\\(?![\\'"tnrbfv0])/g, '') // Remove invalid backslash escapes
            // Replace null bytes and other control characters that PostgreSQL rejects
            .replace(/\x00/g, '') // NULL byte
            .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ''); // Other control chars (keep \t \n \r)
    } catch (err) {
        // If sanitization fails, return empty string to avoid DB errors
        logger.error({ err }, 'Email content sanitization failed');
        return '';
    }
}

export interface ParsedEmail {
    messageId: string;
    inReplyTo?: string;      // RFC 5322 In-Reply-To header for threading
    references?: string;     // RFC 5322 References header for threading
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    date: Date;
    attachments: {
        filename: string;
        contentType: string;
        size: number;
        content: Buffer;
    }[];
}

/**
 * Configuration IMAP pour différentes méthodes d'authentification
 */
interface ImapConfig {
    user: string;
    password?: string;
    xoauth2?: string;
    host: string;
    port: number;
    tls: boolean;
    tlsOptions: { rejectUnauthorized: boolean };
    connTimeout: number;
    authTimeout: number;
}

export class ImapService {
    /**
     * Construit la configuration IMAP selon la méthode d'authentification
     */
    private static async buildImapConfig(
        connection: TeamEmailConnection
    ): Promise<ImapConfig> {
        const baseConfig: ImapConfig = {
            user: connection.imap_username || connection.email_address,
            host: connection.imap_host,
            port: connection.imap_port,
            tls: connection.imap_use_ssl,
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: 30000,
            authTimeout: 10000
        };

        if (connection.auth_method === 'oauth') {
            // Authentification OAuth avec XOAUTH2
            if (!connection.oauth_access_token || !connection.oauth_refresh_token) {
                throw new Error('OAuth tokens manquants pour la connexion');
            }

            // Déchiffrer les tokens
            const { accessToken, refreshToken } = GmailOAuthService.decryptTokens(
                connection.oauth_access_token,
                connection.oauth_refresh_token
            );

            // Vérifier si le token est expiré et le rafraîchir si nécessaire
            let finalAccessToken = accessToken;
            if (connection.oauth_token_expires_at) {
                const isExpired = GmailOAuthService.isTokenExpired(
                    new Date(connection.oauth_token_expires_at)
                );

                if (isExpired) {
                    logger.info('Access token expired, refreshing...');
                    const refreshed = await GmailOAuthService.refreshAccessToken(refreshToken);
                    finalAccessToken = refreshed.accessToken;

                    // Note: Le nouveau token devrait être sauvegardé en DB
                    // Cela sera géré par le service de sync qui a accès à Supabase
                    logger.info('Token refreshed successfully');
                }
            }

            // Générer le token XOAUTH2
            baseConfig.xoauth2 = GmailOAuthService.generateXOAuth2Token(
                connection.email_address,
                finalAccessToken
            );
        } else {
            // Authentification par mot de passe classique
            if (!connection.imap_password_encrypted) {
                throw new Error('Mot de passe IMAP manquant pour la connexion');
            }
            baseConfig.password = EncryptionService.decrypt(
                connection.imap_password_encrypted
            );
        }

        return baseConfig;
    }

    static async fetchNewEmails(
        connection: TeamEmailConnection
    ): Promise<{ emails: ParsedEmail[], maxUid: number }> {
        // Construire la configuration IMAP
        const imapConfig = await this.buildImapConfig(connection);

        return new Promise((resolve, reject) => {
            const imap = new Imap(imapConfig);

            const parsedEmails: ParsedEmail[] = [];
            let maxUid = connection.last_uid || 0;
            const parsingPromises: Promise<void>[] = [];

            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        imap.end();
                        return reject(err);
                    }

                    logger.info({
                        totalMessages: box.messages.total,
                        uidNext: box.uidnext,
                        lastUid: connection.last_uid,
                        syncFromDate: connection.sync_from_date,
                    }, '[IMAP] Mailbox opened');

                    // Search strategy:
                    // 1. If last_uid > 0, search for UIDs > last_uid
                    // 2. If sync_from_date is set, search SINCE date (initial sync)
                    // 3. Fallback to UNSEEN
                    logger.info({
                        connectionId: connection.id,
                        email: connection.email_address,
                        lastUid: connection.last_uid,
                        syncFromDate: connection.sync_from_date,
                        searchStrategy: connection.last_uid && connection.last_uid > 0 ? 'UID_RANGE' : connection.sync_from_date ? 'SINCE_DATE' : 'UNSEEN',
                    }, '[IMAP] Search strategy selected');

                    let searchCriteria: unknown[];

                    if (connection.last_uid && connection.last_uid > 0) {
                        // UID search: last_uid + 1 : *
                        searchCriteria = [['UID', `${connection.last_uid + 1}:*`]];
                    } else if (connection.sync_from_date) {
                        const date = new Date(connection.sync_from_date);
                        searchCriteria = [['SINCE', date]];
                    } else {
                        searchCriteria = ['UNSEEN'];
                    }

                    logger.debug({ searchCriteria }, 'IMAP Search Criteria');

                    imap.search(searchCriteria, (err, uids) => {
                        if (err) {
                            logger.error({ error: sanitizeErrorMessage(err as Error) }, 'IMAP Search Error');
                            imap.end();
                            return reject(new Error(sanitizeErrorMessage(err as Error)));
                        }

                        logger.info({
                            uidCount: uids?.length || 0,
                            uidRange: uids?.length ? `${Math.min(...uids)}..${Math.max(...uids)}` : 'none',
                        }, '[IMAP] Search results');

                        if (!uids || uids.length === 0) {
                            imap.end();
                            return resolve({ emails: [], maxUid });
                        }

                        // Update maxUid
                        const currentMax = Math.max(...uids);
                        if (currentMax > maxUid) maxUid = currentMax;

                        logger.info({ emailCount: uids.length }, 'Found emails. Fetching...');

                        const f = imap.fetch(uids, { bodies: '', struct: true });

                        f.on('message', (msg, seqno) => {
                            const parsePromise = new Promise<void>((resolveParse) => {
                                let buffer = '';

                                msg.on('body', (stream, info) => {
                                    stream.on('data', (chunk) => {
                                        buffer += chunk.toString('utf8');
                                    });
                                });

                                msg.once('end', () => {
                                    simpleParser(buffer)
                                        .then(parsed => {
                                            // mailparser returns references as string or array
                                            let referencesStr: string | undefined;
                                            if (parsed.references) {
                                                referencesStr = Array.isArray(parsed.references)
                                                    ? parsed.references.join(' ')
                                                    : parsed.references;
                                            }

                                            parsedEmails.push({
                                                messageId: sanitizeEmailContent(parsed.messageId) || '',
                                                inReplyTo: sanitizeEmailContent(parsed.inReplyTo) || undefined,
                                                references: sanitizeEmailContent(referencesStr),
                                                from: sanitizeEmailContent(parsed.from?.text) || '',
                                                to: Array.isArray(parsed.to) 
                                                    ? parsed.to.map(t => sanitizeEmailContent(t.text) || '') 
                                                    : [sanitizeEmailContent(parsed.to?.text) || ''],
                                                subject: sanitizeEmailContent(parsed.subject) || '',
                                                text: sanitizeEmailContent(parsed.text),
                                                html: sanitizeEmailContent(parsed.html || parsed.textAsHtml),
                                                date: parsed.date || new Date(),
                                                attachments: parsed.attachments.map(att => ({
                                                    filename: sanitizeEmailContent(att.filename) || 'unknown',
                                                    contentType: att.contentType,
                                                    size: att.size,
                                                    content: att.content
                                                }))
                                            });
                                            resolveParse();
                                        })
                                        .catch(err => {
                                            const sanitizedMessage = sanitizeErrorMessage(err);
                                            logger.error({ error: sanitizedMessage }, 'Error parsing email');
                                            resolveParse(); // Resolve anyway to not block other emails
                                        });
                                });
                            });
                            parsingPromises.push(parsePromise);
                        });

                        f.once('error', (err) => {
                            logger.error({ error: sanitizeErrorMessage(err as Error) }, 'IMAP fetch error');
                        });

                        f.once('end', () => {
                            // Wait for all parsing to complete
                            Promise.all(parsingPromises).then(() => {
                                imap.end();
                                resolve({ emails: parsedEmails, maxUid });
                            });
                        });
                    });
                });
            });

            imap.once('error', (err: unknown) => {
                reject(err);
            });

            imap.connect();
        });
    }
}
