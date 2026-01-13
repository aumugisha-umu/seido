import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { TeamEmailConnection } from '@/lib/types/email-integration';
import { EncryptionService } from './encryption.service';
import { GmailOAuthService } from './gmail-oauth.service';

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
                    console.log('Access token expiré, rafraîchissement en cours...');
                    const refreshed = await GmailOAuthService.refreshAccessToken(refreshToken);
                    finalAccessToken = refreshed.accessToken;

                    // Note: Le nouveau token devrait être sauvegardé en DB
                    // Cela sera géré par le service de sync qui a accès à Supabase
                    console.log('Token rafraîchi avec succès');
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

                    // Search strategy:
                    // 1. If last_uid > 0, search for UIDs > last_uid
                    // 2. If sync_from_date is set, search SINCE date (initial sync)
                    // 3. Fallback to UNSEEN
                    let searchCriteria: any[];

                    if (connection.last_uid && connection.last_uid > 0) {
                        // UID search: last_uid + 1 : *
                        searchCriteria = [['UID', `${connection.last_uid + 1}:*`]];
                    } else if (connection.sync_from_date) {
                        const date = new Date(connection.sync_from_date);
                        searchCriteria = [['SINCE', date]];
                    } else {
                        searchCriteria = ['UNSEEN'];
                    }

                    console.log('IMAP Search Criteria:', searchCriteria);

                    imap.search(searchCriteria, (err, uids) => {
                        if (err) {
                            console.error('IMAP Search Error:', err);
                            imap.end();
                            return reject(err);
                        }

                        if (!uids || uids.length === 0) {
                            imap.end();
                            return resolve({ emails: [], maxUid });
                        }

                        // Update maxUid
                        const currentMax = Math.max(...uids);
                        if (currentMax > maxUid) maxUid = currentMax;

                        console.log(`Found ${uids.length} emails. Fetching...`);

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
                                                messageId: parsed.messageId || '',
                                                inReplyTo: parsed.inReplyTo || undefined,
                                                references: referencesStr,
                                                from: parsed.from?.text || '',
                                                to: Array.isArray(parsed.to) ? parsed.to.map(t => t.text) : [parsed.to?.text || ''],
                                                subject: parsed.subject || '',
                                                text: parsed.text,
                                                html: parsed.html || parsed.textAsHtml,
                                                date: parsed.date || new Date(),
                                                attachments: parsed.attachments.map(att => ({
                                                    filename: att.filename || 'unknown',
                                                    contentType: att.contentType,
                                                    size: att.size,
                                                    content: att.content
                                                }))
                                            });
                                            resolveParse();
                                        })
                                        .catch(err => {
                                            console.error('Error parsing email:', err);
                                            resolveParse(); // Resolve anyway to not block other emails
                                        });
                                });
                            });
                            parsingPromises.push(parsePromise);
                        });

                        f.once('error', (err) => {
                            console.error('Fetch error:', err);
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

            imap.once('error', (err: any) => {
                reject(err);
            });

            imap.connect();
        });
    }
}
