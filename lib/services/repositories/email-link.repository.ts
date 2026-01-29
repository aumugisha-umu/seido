import { BaseRepository } from '../core/base-repository';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import {
    EmailLink,
    EmailLinkWithDetails,
    EmailLinkEntityType,
    CreateEmailLinkDTO,
    LinkedEmail
} from '@/lib/types/email-links';

// Type for the raw row from Supabase (before types regeneration)
type EmailLinkRow = {
    id: string;
    email_id: string;
    entity_type: EmailLinkEntityType;
    entity_id: string;
    linked_by: string | null;
    linked_at: string;
    notes: string | null;
    team_id: string;
};

/**
 * Repository pour la gestion des liens entre emails et entités SEIDO
 *
 * Utilise une table polymorphique avec entity_type + entity_id
 * pour permettre de lier un email à plusieurs entités de types différents
 */
export class EmailLinkRepository extends BaseRepository<EmailLinkRow, CreateEmailLinkDTO, Partial<EmailLinkRow>> {
    constructor(supabaseClient: SupabaseClient<Database>) {
        super(supabaseClient, 'email_links');
    }

    /**
     * Validation (required by BaseRepository)
     */
    protected async validate(_data: CreateEmailLinkDTO | Partial<EmailLinkRow>): Promise<void> {
        // Le trigger SQL gère la validation et synchronise team_id
    }

    /**
     * Crée un lien entre un email et une entité
     * Note: team_id est auto-rempli par le trigger sync_email_link_team_id
     */
    async createLink(data: CreateEmailLinkDTO & { linked_by?: string }): Promise<EmailLink> {
        const { data: link, error } = await this.supabase
            .from('email_links')
            .insert({
                email_id: data.email_id,
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                linked_by: data.linked_by || null,
                notes: data.notes || null,
                // team_id est auto-rempli par le trigger
            } as any) // Type cast car team_id est requis mais auto-rempli
            .select()
            .single();

        if (error) {
            // Gestion spéciale pour le doublon
            if (error.code === '23505') {
                throw new Error('Ce lien existe déjà');
            }
            throw error;
        }
        return link as EmailLink;
    }

    /**
     * Supprime un lien par son ID
     */
    async deleteLink(linkId: string): Promise<void> {
        const { error } = await this.supabase
            .from('email_links')
            .delete()
            .eq('id', linkId);

        if (error) throw error;
    }

    /**
     * Supprime un lien par email + entité
     */
    async deleteLinkByEntity(
        emailId: string,
        entityType: EmailLinkEntityType,
        entityId: string
    ): Promise<void> {
        const { error } = await this.supabase
            .from('email_links')
            .delete()
            .eq('email_id', emailId)
            .eq('entity_type', entityType)
            .eq('entity_id', entityId);

        if (error) throw error;
    }

    /**
     * Récupère tous les liens d'un email
     */
    async getLinksByEmail(emailId: string): Promise<EmailLink[]> {
        const { data, error } = await this.supabase
            .from('email_links')
            .select('*')
            .eq('email_id', emailId)
            .order('linked_at', { ascending: false });

        if (error) throw error;
        return (data || []) as EmailLink[];
    }

    /**
     * Récupère les liens d'un email avec les détails des entités
     * Fait des JOINs dynamiques selon le type d'entité
     */
    async getLinksByEmailWithDetails(emailId: string): Promise<EmailLinkWithDetails[]> {
        // D'abord récupérer les liens bruts
        const links = await this.getLinksByEmail(emailId);

        if (links.length === 0) return [];

        // Grouper par type d'entité pour optimiser les requêtes
        const linksByType = links.reduce((acc, link) => {
            if (!acc[link.entity_type]) acc[link.entity_type] = [];
            acc[link.entity_type].push(link);
            return acc;
        }, {} as Record<EmailLinkEntityType, EmailLink[]>);

        // Enrichir avec les noms des entités
        const enrichedLinks: EmailLinkWithDetails[] = [];

        for (const [entityType, typeLinks] of Object.entries(linksByType)) {
            const entityIds = typeLinks.map(l => l.entity_id);
            const entityNames = await this.getEntityNames(entityType as EmailLinkEntityType, entityIds);

            for (const link of typeLinks) {
                const entityInfo = entityNames[link.entity_id];
                enrichedLinks.push({
                    ...link,
                    entity_name: entityInfo?.name || 'Inconnu',
                    entity_address: entityInfo?.address,
                    entity_reference: entityInfo?.reference
                });
            }
        }

        return enrichedLinks.sort((a, b) =>
            new Date(b.linked_at).getTime() - new Date(a.linked_at).getTime()
        );
    }

    /**
     * Récupère les noms des entités par type et IDs
     */
    private async getEntityNames(
        entityType: EmailLinkEntityType,
        entityIds: string[]
    ): Promise<Record<string, { name: string; address?: string; reference?: string }>> {
        const result: Record<string, { name: string; address?: string; reference?: string }> = {};

        if (entityIds.length === 0) return result;

        let query;
        let selectFields: string;

        switch (entityType) {
            case 'building':
                // address est maintenant dans la table addresses via address_id
                selectFields = 'id, name, address_id, address_record:address_id(street, city, postal_code)';
                query = this.supabase.from('buildings').select(selectFields).in('id', entityIds);
                break;
            case 'lot':
                selectFields = 'id, reference, apartment_number';
                query = this.supabase.from('lots').select(selectFields).in('id', entityIds);
                break;
            case 'contract':
                selectFields = 'id, title, contract_type, start_date';
                query = this.supabase.from('contracts').select(selectFields).in('id', entityIds);
                break;
            case 'contact':
                selectFields = 'id, name, email';
                query = this.supabase.from('users').select(selectFields).in('id', entityIds);
                break;
            case 'company':
                selectFields = 'id, name, vat_number';
                query = this.supabase.from('companies').select(selectFields).in('id', entityIds);
                break;
            case 'intervention':
                selectFields = 'id, title, reference';
                query = this.supabase.from('interventions').select(selectFields).in('id', entityIds);
                break;
            default:
                return result;
        }

        const { data, error } = await query;
        if (error || !data) return result;

        for (const entity of data as any[]) {
            switch (entityType) {
                case 'building':
                    // Construire l'adresse depuis la relation address_record
                    const buildingAddress = entity.address_record
                        ? `${entity.address_record.street || ''}, ${entity.address_record.postal_code || ''} ${entity.address_record.city || ''}`.trim().replace(/^,\s*/, '')
                        : undefined;
                    result[entity.id] = { name: entity.name, address: buildingAddress };
                    break;
                case 'lot':
                    result[entity.id] = {
                        name: entity.reference || (entity.apartment_number ? `Lot ${entity.apartment_number}` : 'Lot'),
                        reference: entity.apartment_number || entity.reference
                    };
                    break;
                case 'contract':
                    result[entity.id] = {
                        name: entity.title || `Contrat ${entity.contract_type || 'N/A'}`,
                        reference: entity.start_date
                    };
                    break;
                case 'contact':
                    result[entity.id] = {
                        name: entity.name || 'Contact'
                    };
                    break;
                case 'company':
                    result[entity.id] = { name: entity.name || 'Société', reference: entity.vat_number };
                    break;
                case 'intervention':
                    result[entity.id] = {
                        name: entity.title || `Intervention ${entity.reference || entity.id.slice(0, 8)}`,
                        reference: entity.reference
                    };
                    break;
            }
        }

        return result;
    }

    /**
     * Récupère les emails liés à une entité (avec pagination)
     *
     * @param entityType - Type of entity (building, lot, intervention, etc.)
     * @param entityId - UUID of the entity
     * @param options.limit - Max results
     * @param options.offset - Pagination offset
     * @param options.webhookOnly - If true, only return emails with email_connection_id IS NULL (webhook inbound)
     */
    async getEmailsByEntity(
        entityType: EmailLinkEntityType,
        entityId: string,
        options?: { limit?: number; offset?: number; webhookOnly?: boolean }
    ): Promise<{ data: LinkedEmail[]; count: number }> {
        let query = this.supabase
            .from('email_links')
            .select(`
                *,
                email:emails!inner(
                    id,
                    subject,
                    from_address,
                    received_at,
                    sent_at,
                    direction,
                    status,
                    body_text,
                    email_connection_id
                )
            `, { count: 'exact' })
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('linked_at', { ascending: false });

        // Filter for webhook inbound emails only (notification replies)
        if (options?.webhookOnly) {
            query = query.is('email.email_connection_id', null);
        }

        if (options?.limit) {
            query = query.range(
                options.offset || 0,
                (options.offset || 0) + options.limit - 1
            );
        }

        const { data, error, count } = await query;

        if (error) throw error;

        // Transformer les données pour l'interface LinkedEmail
        const linkedEmails: LinkedEmail[] = (data || []).map((row: any) => ({
            id: row.email.id,
            subject: row.email.subject,
            from_address: row.email.from_address,
            received_at: row.email.received_at,
            sent_at: row.email.sent_at,
            direction: row.email.direction,
            status: row.email.status,
            snippet: row.email.body_text?.substring(0, 150),
            link: {
                id: row.id,
                email_id: row.email_id,
                entity_type: row.entity_type,
                entity_id: row.entity_id,
                linked_by: row.linked_by,
                linked_at: row.linked_at,
                notes: row.notes,
                team_id: row.team_id
            }
        }));

        return { data: linkedEmails, count: count || 0 };
    }

    /**
     * Vérifie si un lien existe déjà
     */
    async linkExists(
        emailId: string,
        entityType: EmailLinkEntityType,
        entityId: string
    ): Promise<boolean> {
        const { data, error } = await this.supabase
            .from('email_links')
            .select('id')
            .eq('email_id', emailId)
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return !!data;
    }

    /**
     * Récupère le nombre d'emails liés à une entité
     */
    async countEmailsByEntity(
        entityType: EmailLinkEntityType,
        entityId: string
    ): Promise<number> {
        const { count, error } = await this.supabase
            .from('email_links')
            .select('*', { count: 'exact', head: true })
            .eq('entity_type', entityType)
            .eq('entity_id', entityId);

        if (error) throw error;
        return count || 0;
    }

    /**
     * Crée plusieurs liens en une seule opération (batch)
     */
    async createLinksInBatch(
        emailId: string,
        links: Array<{ entity_type: EmailLinkEntityType; entity_id: string }>,
        linkedBy?: string
    ): Promise<EmailLink[]> {
        if (links.length === 0) return [];

        const { data, error } = await this.supabase
            .from('email_links')
            .insert(
                links.map(link => ({
                    email_id: emailId,
                    entity_type: link.entity_type,
                    entity_id: link.entity_id,
                    linked_by: linkedBy || null,
                    // team_id auto-rempli par trigger
                } as any))
            )
            .select();

        if (error) throw error;
        return (data || []) as EmailLink[];
    }
}
