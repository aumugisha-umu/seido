import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EncryptionService } from '@/lib/services/domain/encryption.service';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            return NextResponse.json({ error: 'No team found' }, { status: 404 });
        }

        const connectionId = id;

        // Fetch connection details
        const { data: connection, error } = await supabase
            .from('team_email_connections')
            .select('*')
            .eq('id', connectionId)
            .eq('team_id', userProfile.team_id)
            .single();

        if (error || !connection) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        // Decrypt passwords
        let imapPassword = '';
        let smtpPassword = '';

        try {
            if (connection.imap_password_encrypted) {
                imapPassword = EncryptionService.decryptPassword(connection.imap_password_encrypted);
            }
            if (connection.smtp_password_encrypted) {
                smtpPassword = EncryptionService.decryptPassword(connection.smtp_password_encrypted);
            }
        } catch (e) {
            console.error('Decryption error:', e);
            return NextResponse.json({ error: 'Failed to decrypt credentials' }, { status: 500 });
        }

        // Test IMAP connection
        try {
            const Imap = require('node-imap');
            await new Promise((resolve, reject) => {
                const imap = new Imap({
                    user: connection.imap_username,
                    password: imapPassword,
                    host: connection.imap_host,
                    port: connection.imap_port,
                    tls: connection.imap_use_ssl,
                    tlsOptions: { rejectUnauthorized: false },
                    connTimeout: 10000,
                    authTimeout: 5000,
                });

                imap.once('ready', () => {
                    imap.openBox('INBOX', true, (err, box) => {
                        if (err) {
                            imap.end();
                            return reject(err);
                        }
                        // Try to find at least one email to verify search
                        imap.search(['ALL'], (err, results) => {
                            if (err) {
                                imap.end();
                                return reject(err);
                            }
                            console.log(`Test found ${results.length} emails in INBOX`);
                            imap.end();
                            resolve(true);
                        });
                    });
                });

                imap.once('error', (err: Error) => {
                    reject(new Error(`IMAP connection failed: ${err.message}`));
                });

                imap.connect();
            });
        } catch (error: any) {
            return NextResponse.json(
                { error: `IMAP test failed: ${error.message}` },
                { status: 400 }
            );
        }

        // Test SMTP connection
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: connection.smtp_host,
                port: connection.smtp_port,
                secure: connection.smtp_port === 465 || (connection.smtp_use_tls && connection.smtp_port !== 587),
                auth: {
                    user: connection.smtp_username,
                    pass: smtpPassword,
                },
            });

            await transporter.verify();
        } catch (error: any) {
            return NextResponse.json(
                { error: `SMTP test failed: ${error.message}` },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, message: 'Connection test successful' });
    } catch (error: any) {
        console.error('Test connection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
