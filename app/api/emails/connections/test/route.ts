import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            imapHost,
            imapPort,
            imapUseSsl,
            imapUsername,
            imapPassword,
            smtpHost,
            smtpPort,
            smtpUseTls,
            smtpUsername,
            smtpPassword,
        } = body;

        // Test IMAP connection
        try {
            const Imap = require('node-imap');
            await new Promise((resolve, reject) => {
                const imap = new Imap({
                    user: imapUsername,
                    password: imapPassword,
                    host: imapHost,
                    port: imapPort,
                    tls: imapUseSsl,
                    tlsOptions: { rejectUnauthorized: false },
                    connTimeout: 10000,
                    authTimeout: 5000,
                });

                imap.once('ready', () => {
                    imap.end();
                    resolve(true);
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
                host: smtpHost,
                port: smtpPort,
                secure: smtpUseTls,
                auth: {
                    user: smtpUsername,
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
