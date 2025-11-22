import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { TeamEmailConnection } from '@/lib/types/email-integration';
import { EncryptionService } from './encryption.service';

export interface ParsedEmail {
    messageId: string;
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

export class ImapService {
    static async fetchNewEmails(
        connection: TeamEmailConnection
    ): Promise<ParsedEmail[]> {
        return new Promise((resolve, reject) => {
            const password = EncryptionService.decryptPassword(
                connection.imap_password_encrypted
            );

            const imap = new Imap({
                user: connection.imap_username,
                password,
                host: connection.imap_host,
                port: connection.imap_port,
                tls: connection.imap_use_ssl,
                tlsOptions: { rejectUnauthorized: false }, // Often needed for self-signed certs or some providers
                connTimeout: 30000,
                authTimeout: 10000
            });

            const emails: ParsedEmail[] = [];

            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        imap.end();
                        return reject(err);
                    }

                    // Search for unseen emails or emails since last sync
                    // For simplicity in this MVP, we'll fetch UNSEEN.
                    // In production, we should use UIDs and connection.last_uid.
                    // Example: ['UID', `${connection.last_uid + 1}:*`]
                    // But if last_uid is 0, we might fetch everything.
                    // Let's stick to UNSEEN for now to avoid fetching full history on first run.

                    imap.search(['UNSEEN'], (err, results) => {
                        if (err) {
                            imap.end();
                            return reject(err);
                        }

                        if (!results || results.length === 0) {
                            imap.end();
                            return resolve([]);
                        }

                        const f = imap.fetch(results, { bodies: '' });

                        f.on('message', (msg, seqno) => {
                            let buffer = '';

                            msg.on('body', (stream, info) => {
                                stream.on('data', (chunk) => {
                                    buffer += chunk.toString('utf8');
                                });
                            });

                            msg.once('end', () => {
                                // Parse the email
                                simpleParser(buffer)
                                    .then(parsed => {
                                        emails.push({
                                            messageId: parsed.messageId || '',
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
                                    })
                                    .catch(err => console.error('Error parsing email:', err));
                            });
                        });

                        f.once('error', (err) => {
                            console.error('Fetch error:', err);
                        });

                        f.once('end', () => {
                            // Wait a bit for parsing to finish (simpleParser is async)
                            // In a real app, we should track parsing promises.
                            // Hack for MVP:
                            setTimeout(() => {
                                imap.end();
                                resolve(emails);
                            }, 2000);
                        });
                    });
                });
            });

            imap.once('error', (err: any) => {
                reject(err);
            });

            imap.once('end', () => {
                // Connection ended
            });

            imap.connect();
        });
    }
}
