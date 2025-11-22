import { BaseRepository } from '../core/base-repository';
import { TeamEmailConnection } from '@/lib/database.types';
import { EncryptionService } from '../domain/encryption.service';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateEmailConnectionDTO {
    team_id: string;
    provider: 'gmail' | 'outlook' | 'yahoo' | 'ovh' | 'custom';
    email_address: string;

    imap_host: string;
    imap_port: number;
    imap_use_ssl: boolean;
    imap_username: string;
    imap_password: string; // Plain text (will be encrypted)

    smtp_host: string;
    smtp_port: number;
    smtp_use_tls: boolean;
    smtp_username: string;
    smtp_password: string; // Plain text (will be encrypted)
}

export class EmailConnectionRepository extends BaseRepository<TeamEmailConnection> {
    constructor(supabaseClient: SupabaseClient) {
        super(supabaseClient, 'team_email_connections');
    }

    /**
     * Crée une nouvelle connexion email (avec chiffrement automatique)
     */
    async createConnection(dto: CreateEmailConnectionDTO): Promise<TeamEmailConnection> {
        const encrypted = {
            ...dto,
            imap_password_encrypted: EncryptionService.encryptPassword(dto.imap_password),
            smtp_password_encrypted: EncryptionService.encryptPassword(dto.smtp_password),
        };

        // Supprimer les mots de passe en clair
        // @ts-ignore
        delete encrypted.imap_password;
        // @ts-ignore
        delete encrypted.smtp_password;

        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert(encrypted)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Récupère toutes les connexions actives (pour le cron job)
     */
    async getActiveConnections(): Promise<TeamEmailConnection[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        return data || [];
    }

    /**
     * Récupère les connexions d'une équipe
     */
    async getConnectionsByTeam(teamId: string): Promise<TeamEmailConnection[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('team_id', teamId);

        if (error) throw error;
        return data || [];
    }

    /**
     * Met à jour le last_uid après synchronisation
     */
    async updateLastUid(connectionId: string, lastUid: number): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({
                last_uid: lastUid,
                last_sync_at: new Date().toISOString(),
                last_error: null
            })
            .eq('id', connectionId);

        if (error) throw error;
    }

    /**
     * Enregistre une erreur de synchronisation
     */
    async recordError(connectionId: string, errorMessage: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({
                last_error: errorMessage,
                last_sync_at: new Date().toISOString()
            })
            .eq('id', connectionId);

        if (error) throw error;
    }
}
