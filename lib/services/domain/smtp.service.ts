import nodemailer from 'nodemailer';
import { SupabaseClient } from '@supabase/supabase-js';
import { EncryptionService } from './encryption.service';
import { EmailRepository } from '@/lib/services/repositories/email.repository';

interface SendEmailParams {
    connectionId: string;
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html: string;
    text?: string;
    inReplyToEmailId?: string;
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }[];
}

export class SMTPService {
    private supabase: SupabaseClient;
    private emailRepo: EmailRepository;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
        this.emailRepo = new EmailRepository(supabase);
    }

    async sendEmail(params: SendEmailParams): Promise<{ success: boolean; emailId?: string; error?: string }> {
        try {
            // 1. Fetch connection details
            const { data: connection, error: connectionError } = await this.supabase
                .from('team_email_connections')
                .select('*')
                .eq('id', params.connectionId)
                .single();

            if (connectionError || !connection) {
                throw new Error('Email connection not found');
            }

            // 2. Decrypt SMTP password
            const smtpPassword = EncryptionService.decrypt(connection.smtp_password_encrypted);

            // 3. Create transporter
            const transporter = nodemailer.createTransport({
                host: connection.smtp_host,
                port: connection.smtp_port,
                secure: connection.smtp_use_tls,
                auth: {
                    user: connection.smtp_username,
                    pass: smtpPassword
                },
                tls: {
                    rejectUnauthorized: false // Allow self-signed certs
                }
            });

            // 4. Handle threading (In-Reply-To)
            let references = undefined;
            let inReplyTo = undefined;

            if (params.inReplyToEmailId) {
                const { data: originalEmail } = await this.supabase
                    .from('emails')
                    .select('message_id, references')
                    .eq('id', params.inReplyToEmailId)
                    .single();

                if (originalEmail) {
                    inReplyTo = originalEmail.message_id;
                    // Append original message ID to references
                    references = originalEmail.references
                        ? `${originalEmail.references} ${originalEmail.message_id}`
                        : originalEmail.message_id;
                }
            }

            // 5. Send email
            const mailOptions = {
                from: connection.email_address,
                to: params.to,
                cc: params.cc,
                bcc: params.bcc,
                subject: params.subject,
                text: params.text || params.html.replace(/<[^>]*>?/gm, ''), // Simple strip tags fallback
                html: params.html,
                inReplyTo,
                references,
                attachments: params.attachments
            };

            const info = await transporter.sendMail(mailOptions);

            // 6. Save sent email to database
            const sentEmail = await this.emailRepo.createEmail({
                team_id: connection.team_id,
                email_connection_id: connection.id,
                direction: 'sent',
                message_id: info.messageId,
                from_address: connection.email_address,
                to_addresses: Array.isArray(params.to) ? params.to : [params.to],
                cc_addresses: params.cc ? (Array.isArray(params.cc) ? params.cc : [params.cc]) : undefined,
                bcc_addresses: params.bcc ? (Array.isArray(params.bcc) ? params.bcc : [params.bcc]) : undefined,
                subject: params.subject,
                body_text: mailOptions.text,
                body_html: params.html,
                sent_at: new Date().toISOString(),
                in_reply_to: params.inReplyToEmailId,
                references: references
            });

            return { success: true, emailId: sentEmail.id };

        } catch (error: any) {
            console.error('SMTP Send Error:', error);
            return { success: false, error: error.message };
        }
    }
}
