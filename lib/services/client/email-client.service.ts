import { Email } from '@/lib/types/email-integration';

export class EmailClientService {
    /**
     * Fetch emails from the API
     */
    static async getEmails(
        folder: string = 'inbox',
        search?: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ emails: Email[]; total: number }> {
        const params = new URLSearchParams();
        if (folder) params.append('folder', folder);
        if (search) params.append('search', search);
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());

        const response = await fetch(`/api/emails?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch emails');
        }

        const data = await response.json();
        return {
            emails: data.emails,
            total: data.total || 0
        };
    }

    /**
     * Fetch email counts
     */
    static async getCounts(): Promise<{ inbox: number; processed: number; sent: number; archive: number; drafts: number }> {
        const response = await fetch('/api/emails/counts');
        if (!response.ok) {
            throw new Error('Failed to fetch email counts');
        }
        const data = await response.json();
        return data.counts;
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
    /**
     * Update an email
     */
    static async updateEmail(emailId: string, updates: Partial<Email>): Promise<Email> {
        const response = await fetch(`/api/emails/${emailId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error('Failed to update email');
        }

        const data = await response.json();
        return data.email;
    }

    static async archiveEmail(emailId: string): Promise<void> {
        await this.updateEmail(emailId, { status: 'archived' });
    }

    static async deleteEmail(emailId: string): Promise<void> {
        // Soft delete via API special flag or just status if we prefer
        // The API route handles { deleted: true } for soft delete
        const response = await fetch(`/api/emails/${emailId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleted: true }),
        });

        if (!response.ok) {
            throw new Error('Failed to delete email');
        }
    }

    static async markAsRead(emailId: string): Promise<void> {
        await this.updateEmail(emailId, { status: 'read' });
    }

    static async markAsUnread(emailId: string): Promise<void> {
        await this.updateEmail(emailId, { status: 'unread' });
    }

    static async linkToBuilding(emailId: string, buildingId: string, lotId?: string): Promise<void> {
        await this.updateEmail(emailId, { building_id: buildingId, lot_id: lotId || null });
    }
}
