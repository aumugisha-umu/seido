import nodemailer from 'nodemailer';
import { TeamEmailConnection } from '@/lib/types/email-integration';
import { EncryptionService } from './encryption.service';

export interface SendEmailDTO {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
    inReplyTo?: string;
    references?: string;
}

export class SmtpService {
    static async sendEmail(
        connection: TeamEmailConnection,
        emailData: SendEmailDTO
    ): Promise<{ messageId: string }> {
        const password = EncryptionService.decryptPassword(
            connection.smtp_password_encrypted
        );

        const transporter = nodemailer.createTransport({
            host: connection.smtp_host,
            port: connection.smtp_port,
            secure: connection.smtp_use_tls, // true for 465, false for other ports
            auth: {
                user: connection.smtp_username,
                pass: password
            }
        });

        const mailOptions = {
            from: connection.email_address,
            to: emailData.to,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
            inReplyTo: emailData.inReplyTo,
            references: emailData.references
        };

        const info = await transporter.sendMail(mailOptions);

        return { messageId: info.messageId };
    }
}
