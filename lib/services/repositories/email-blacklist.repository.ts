import { BaseRepository } from '../core/base-repository';
import { EmailBlacklist } from '@/lib/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateBlacklistEntryDTO {
    team_id: string;
    sender_email: string;
    sender_domain?: string;
    reason?: string;
    blocked_by_user_id: string;
}

export class EmailBlacklistRepository extends BaseRepository<EmailBlacklist> {
    constructor(supabaseClient: SupabaseClient) {
        super(supabaseClient, 'email_blacklist');
    }

    /**
     * Ajoute un expéditeur à la blacklist
     */
    async addToBlacklist(dto: CreateBlacklistEntryDTO): Promise<EmailBlacklist> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert(dto)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Vérifie si un expéditeur est blacklisté
     */
    async isBlacklisted(teamId: string, senderEmail: string): Promise<boolean> {
        const { data, error } = await this.supabase
            .rpc('is_sender_blacklisted', {
                p_team_id: teamId,
                p_sender_email: senderEmail
            });

        if (error) throw error;
        return data || false;
    }

    /**
     * Récupère toute la blacklist d'une équipe
     */
    async getTeamBlacklist(teamId: string): Promise<EmailBlacklist[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Retire un expéditeur de la blacklist
     */
    async removeFromBlacklist(blacklistId: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', blacklistId);

        if (error) throw error;
    }

    /**
     * Retire un expéditeur de la blacklist par email
     */
    async removeByEmail(teamId: string, senderEmail: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('team_id', teamId)
            .eq('sender_email', senderEmail);

        if (error) throw error;
    }
}
