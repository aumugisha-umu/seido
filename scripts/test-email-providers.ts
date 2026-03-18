import * as dotenv from 'dotenv';
import path from 'path';
import Imap from 'node-imap';
import nodemailer from 'nodemailer';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ──────────────────────────────────────────────
// Provider configurations from .env.local
// ──────────────────────────────────────────────

interface ProviderConfig {
    name: string;
    imap: { host: string; port: number; tls: boolean };
    smtp: { host: string; port: number; secure: boolean };
    user: string;
    password: string;
}

const providers: ProviderConfig[] = [
    {
        name: 'Gmail',
        imap: { host: 'imap.gmail.com', port: 993, tls: true },
        smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
        user: process.env.TEST_GMAIL_USER || '',
        password: process.env.TEST_GMAIL_APP_PASSWORD || '',
    },
    {
        name: 'Outlook',
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        smtp: { host: 'smtp.office365.com', port: 587, secure: false },
        user: process.env.TEST_OUTLOOK_USER || '',
        password: process.env.TEST_OUTLOOK_APP_PASSWORD || '',
    },
    {
        name: 'Yahoo',
        imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
        user: process.env.TEST_YAHOO_USER || '',
        password: process.env.TEST_YAHOO_APP_PASSWORD || '',
    },
];

// ──────────────────────────────────────────────
// Test functions
// ──────────────────────────────────────────────

const testImapConnection = (provider: ProviderConfig): Promise<{ success: boolean; folders?: string[]; emailCount?: number; error?: string }> => {
    return new Promise((resolve) => {
        const imap = new Imap({
            user: provider.user,
            password: provider.password,
            host: provider.imap.host,
            port: provider.imap.port,
            tls: provider.imap.tls,
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: 15000,
            authTimeout: 10000,
        });

        imap.once('ready', () => {
            // List folders
            imap.getBoxes((err, boxes) => {
                const folders = err ? [] : Object.keys(boxes);

                // Open INBOX and count emails
                imap.openBox('INBOX', true, (err, box) => {
                    if (err) {
                        imap.end();
                        return resolve({ success: true, folders, emailCount: 0 });
                    }

                    imap.search(['ALL'], (err, results) => {
                        imap.end();
                        resolve({
                            success: true,
                            folders,
                            emailCount: err ? 0 : results.length,
                        });
                    });
                });
            });
        });

        imap.once('error', (err: Error) => {
            resolve({ success: false, error: err.message });
        });

        imap.connect();
    });
};

const testSmtpConnection = async (provider: ProviderConfig): Promise<{ success: boolean; error?: string }> => {
    try {
        const transporter = nodemailer.createTransport({
            host: provider.smtp.host,
            port: provider.smtp.port,
            secure: provider.smtp.secure,
            auth: {
                user: provider.user,
                pass: provider.password,
            },
            tls: { rejectUnauthorized: false },
        });

        await transporter.verify();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

const main = async () => {
    console.log('===========================================');
    console.log('  SEIDO - Email Provider Connection Test');
    console.log('===========================================\n');

    // Filter providers with credentials
    const activeProviders = providers.filter((p) => p.user && p.password);
    const skippedProviders = providers.filter((p) => !p.user || !p.password);

    if (skippedProviders.length > 0) {
        console.log('Skipped (no credentials in .env.local):');
        skippedProviders.forEach((p) => console.log(`  - ${p.name}`));
        console.log('');
    }

    if (activeProviders.length === 0) {
        console.error('No providers configured. Add credentials to .env.local:');
        console.error('  TEST_GMAIL_USER=xxx@gmail.com');
        console.error('  TEST_GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx');
        console.error('  TEST_OUTLOOK_USER=xxx@outlook.com');
        console.error('  TEST_OUTLOOK_APP_PASSWORD=xxxx');
        console.error('  TEST_YAHOO_USER=xxx@yahoo.com');
        console.error('  TEST_YAHOO_APP_PASSWORD=xxxx');
        process.exit(1);
    }

    const results: { provider: string; imap: string; smtp: string }[] = [];

    for (const provider of activeProviders) {
        console.log(`--- ${provider.name} (${provider.user}) ---`);

        // Test IMAP
        process.stdout.write('  IMAP: testing... ');
        const imapResult = await testImapConnection(provider);
        if (imapResult.success) {
            console.log(`OK (${imapResult.emailCount} emails, ${imapResult.folders?.length} folders)`);
            if (imapResult.folders && imapResult.folders.length > 0) {
                console.log(`        Folders: ${imapResult.folders.slice(0, 8).join(', ')}${(imapResult.folders.length > 8 ? '...' : '')}`);
            }
        } else {
            console.log(`FAILED: ${imapResult.error}`);
        }

        // Test SMTP
        process.stdout.write('  SMTP: testing... ');
        const smtpResult = await testSmtpConnection(provider);
        if (smtpResult.success) {
            console.log('OK');
        } else {
            console.log(`FAILED: ${smtpResult.error}`);
        }

        results.push({
            provider: provider.name,
            imap: imapResult.success ? 'OK' : 'FAIL',
            smtp: smtpResult.success ? 'OK' : 'FAIL',
        });

        console.log('');
    }

    // Summary table
    console.log('===========================================');
    console.log('  Summary');
    console.log('===========================================');
    console.log('  Provider    | IMAP  | SMTP');
    console.log('  ------------|-------|------');
    results.forEach((r) => {
        const pad = (s: string, n: number) => s.padEnd(n);
        console.log(`  ${pad(r.provider, 12)}| ${pad(r.imap, 6)}| ${r.smtp}`);
    });
    console.log('');
};

main();
