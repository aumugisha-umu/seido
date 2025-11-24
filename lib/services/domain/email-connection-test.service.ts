import Imap from 'node-imap';
import nodemailer from 'nodemailer';
import { TeamEmailConnection } from '@/lib/types/email-integration';

export interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}

export interface SmtpConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    secure: boolean;
}

export class EmailConnectionTestService {
    /**
     * Test IMAP connection
     */
    static async testImapConnection(config: ImapConfig): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            try {
                const imap = new Imap({
                    user: config.user,
                    password: config.password,
                    host: config.host,
                    port: config.port,
                    tls: config.tls,
                    tlsOptions: { rejectUnauthorized: false }, // Allow self-signed certs
                    connTimeout: 10000,
                    authTimeout: 10000
                });

                imap.once('ready', () => {
                    imap.end();
                    resolve({ success: true });
                });

                imap.once('error', (err: any) => {
                    resolve({ success: false, error: err.message || 'IMAP connection failed' });
                });

                imap.connect();
            } catch (error: any) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * Test SMTP connection
     */
    static async testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
        try {
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: {
                    user: config.user,
                    pass: config.password
                },
                tls: {
                    rejectUnauthorized: false // Allow self-signed certs
                }
            });

            await transporter.verify();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'SMTP connection failed' };
        }
    }
}
