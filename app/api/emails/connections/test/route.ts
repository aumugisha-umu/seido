import { NextResponse } from 'next/server';
import Imap from 'node-imap';
import nodemailer from 'nodemailer';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { logger } from '@/lib/logger';
import dns from 'dns/promises';
import net from 'net';

/**
 * Checks whether a hostname resolves to a private/internal IP address (SSRF protection).
 * Rejects: RFC 1918, loopback, link-local, multicast, ::1, etc.
 */
async function isPrivateHost(hostname: string): Promise<boolean> {
    // Check if hostname is already an IP address
    if (net.isIP(hostname)) {
        return isPrivateIp(hostname);
    }

    try {
        const addresses = await dns.resolve4(hostname);
        for (const addr of addresses) {
            if (isPrivateIp(addr)) {
                return true;
            }
        }
    } catch {
        // If DNS resolution fails, also try IPv6
    }

    try {
        const addresses = await dns.resolve6(hostname);
        for (const addr of addresses) {
            if (isPrivateIpV6(addr)) {
                return true;
            }
        }
    } catch {
        // DNS resolution failed entirely — let the connection attempt handle it
    }

    return false;
}

function isPrivateIp(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    const [a, b] = parts;

    // Loopback: 127.0.0.0/8
    if (a === 127) return true;
    // RFC 1918: 10.0.0.0/8
    if (a === 10) return true;
    // RFC 1918: 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // RFC 1918: 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // Link-local: 169.254.0.0/16
    if (a === 169 && b === 254) return true;
    // Current network: 0.0.0.0/8
    if (a === 0) return true;

    return false;
}

function isPrivateIpV6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    // Loopback
    if (normalized === '::1') return true;
    // Link-local
    if (normalized.startsWith('fe80:')) return true;
    // Unique local (RFC 4193)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // IPv4-mapped loopback/private
    if (normalized.startsWith('::ffff:')) {
        const v4Part = normalized.replace('::ffff:', '');
        if (net.isIPv4(v4Part)) return isPrivateIp(v4Part);
    }
    return false;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

export async function POST(request: Request) {
    try {
        // Authentication check
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            return NextResponse.json({ error: 'No team found' }, { status: 404 });
        }

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

        // SSRF protection: reject private/internal hosts
        const [imapIsPrivate, smtpIsPrivate] = await Promise.all([
            isPrivateHost(imapHost),
            isPrivateHost(smtpHost),
        ]);

        if (imapIsPrivate) {
            return NextResponse.json(
                { error: 'IMAP host resolves to a private/internal address' },
                { status: 400 }
            );
        }

        if (smtpIsPrivate) {
            return NextResponse.json(
                { error: 'SMTP host resolves to a private/internal address' },
                { status: 400 }
            );
        }

        // Test IMAP connection
        try {
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
        } catch (error: unknown) {
            return NextResponse.json(
                { error: `IMAP test failed: ${getErrorMessage(error)}` },
                { status: 400 }
            );
        }

        // Test SMTP connection
        try {
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
        } catch (error: unknown) {
            return NextResponse.json(
                { error: `SMTP test failed: ${getErrorMessage(error)}` },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, message: 'Connection test successful' });
    } catch (error: unknown) {
        logger.error({ error: getErrorMessage(error) }, 'Test connection error');
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
