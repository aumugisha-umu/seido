import { Email } from '@/lib/types/email-integration';

export class EmailClientService {
    /**
     * Fetch emails from the API
     */
    static async getEmails(folder: string = 'inbox', search?: string): Promise<Email[]> {
        const params = new URLSearchParams();
        if (folder) params.append('folder', folder);
        if (search) params.append('search', search);

        const response = await fetch(`/api/emails?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch emails');
        }

        const data = await response.json();
        return data.emails;
    }

    /**
     * Send an email
     */
    static async sendEmail(data: {
        emailConnectionId: string;
        to: string | string[];
        subject: string;
        body: string;
        inReplyToEmailId?: string;
    }): Promise<{ success: boolean; emailId: string }> {
        const response = await fetch('/api/emails/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send email');
        }

        return response.json();
    }

    /**
     * Sync emails manually (trigger cron)
     */
    static async syncEmails(): Promise<void> {
        const response = await fetch('/api/cron/sync-emails');
        if (!response.ok) {
            throw new Error('Failed to sync emails');
        }
    }
}
