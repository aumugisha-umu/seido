import { BaseRepository } from '../core/base-repository';
import { Email, EmailAttachment } from '@/lib/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateEmailDTO {
    team_id: string;
    email_connection_id?: string;
    direction: 'received' | 'sent';

    message_id?: string;
    in_reply_to?: string;
    references?: string;

    from_address: string;
    to_addresses: string[];
    cc_addresses?: string[];
    bcc_addresses?: string[];

    subject: string;
    body_text?: string;
    body_html?: string;

    received_at?: string;
    sent_at?: string;
}

export class EmailRepository extends BaseRepository<Email> {
    constructor(supabaseClient: SupabaseClient) {
        super(supabaseClient, 'emails');
    }

    /**
     * Crée un nouvel email
     */
    async createEmail(dto: CreateEmailDTO): Promise<Email> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert(dto)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Récupère les emails d'une équipe (avec pagination)
     */
    async getEmailsByTeam(
        teamId: string,
        options?: {
            limit?: number;
            offset?: number;
            status?: 'unread' | 'read' | 'archived';
            direction?: 'received' | 'sent';
        }
    ): Promise<Email[]> {
        let query = this.supabase
            .from(this.tableName)
            .select('*')
            .eq('team_id', teamId)
            .order('received_at', { ascending: false });

        if (options?.status) {
            query = query.eq('status', options.status);
        }

        if (options?.direction) {
            query = query.eq('direction', options.direction);
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    /**
     * Recherche plein texte
     */
    async searchEmails(teamId: string, query: string): Promise<Email[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('team_id', teamId)
            .textSearch('search_vector', query, {
                type: 'websearch',
                config: 'french'
            })
            .order('received_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Marque un email comme lu
     */
    async markAsRead(emailId: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ status: 'read' })
            .eq('id', emailId);

        if (error) throw error;
    }

    /**
     * Associe un email à un bâtiment
     */
    async linkToBuilding(emailId: string, buildingId: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ building_id: buildingId })
            .eq('id', emailId);

        if (error) throw error;
    }

    /**
     * Récupère les pièces jointes d'un email
     */
    async getAttachments(emailId: string): Promise<EmailAttachment[]> {
        const { data, error } = await this.supabase
            .from('email_attachments')
            .select('*')
            .eq('email_id', emailId);

        if (error) throw error;
        return data || [];
    }

    /**
     * Soft delete un email (marqué comme supprimé mais reste en DB)
     */
    async softDeleteEmail(emailId: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', emailId);

        if (error) throw error;
    }

    /**
     * Restaurer un email soft-deleted
     */
    async restoreEmail(emailId: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ deleted_at: null })
            .eq('id', emailId);

        if (error) throw error;
    }
}
