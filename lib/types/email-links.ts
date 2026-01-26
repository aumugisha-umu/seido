/**
 * Types pour le système de liaison d'emails multi-entités
 *
 * Architecture: Table polymorphique `email_links` avec entity_type + entity_id
 * Permet de lier un email à plusieurs entités de types différents
 */

// Types d'entités supportés pour la liaison
export type EmailLinkEntityType =
    | 'building'
    | 'lot'
    | 'contract'
    | 'contact'
    | 'company'
    | 'intervention';

// Lien email-entité (row from email_links table)
export interface EmailLink {
    id: string;
    email_id: string;
    entity_type: EmailLinkEntityType;
    entity_id: string;
    linked_by: string | null;
    linked_at: string;
    notes: string | null;
    team_id: string;
}

// Lien avec détails de l'entité liée (enrichi via JOIN)
export interface EmailLinkWithDetails extends EmailLink {
    entity_name: string;
    entity_address?: string; // Pour buildings/lots
    entity_reference?: string; // Pour contracts (numéro de contrat)
}

// DTO pour créer un nouveau lien
export interface CreateEmailLinkDTO {
    email_id: string;
    entity_type: EmailLinkEntityType;
    entity_id: string;
    notes?: string;
}

// Configuration d'affichage par type d'entité
export interface EmailLinkDisplayConfig {
    type: EmailLinkEntityType;
    label: string;
    labelPlural: string;
    icon: string; // Nom d'icône Lucide React
    color: string; // Classe Tailwind pour le badge
    route: string; // Route de base pour la navigation
}

// Mapping des configurations d'affichage
export const EMAIL_LINK_DISPLAY_CONFIG: Record<EmailLinkEntityType, EmailLinkDisplayConfig> = {
    building: {
        type: 'building',
        label: 'Immeuble',
        labelPlural: 'Immeubles',
        icon: 'Building2',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        route: '/gestionnaire/biens/immeubles'
    },
    lot: {
        type: 'lot',
        label: 'Lot',
        labelPlural: 'Lots',
        icon: 'Home',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        route: '/gestionnaire/biens/lots'
    },
    contract: {
        type: 'contract',
        label: 'Contrat',
        labelPlural: 'Contrats',
        icon: 'FileText',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        route: '/gestionnaire/contrats'
    },
    contact: {
        type: 'contact',
        label: 'Contact',
        labelPlural: 'Contacts',
        icon: 'User',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        route: '/gestionnaire/contacts'
    },
    company: {
        type: 'company',
        label: 'Société',
        labelPlural: 'Sociétés',
        icon: 'Briefcase',
        color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
        route: '/gestionnaire/contacts/societes'
    },
    intervention: {
        type: 'intervention',
        label: 'Intervention',
        labelPlural: 'Interventions',
        icon: 'Wrench',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        route: '/gestionnaire/interventions'
    }
};

// Pour l'affichage des badges de liaison
export interface EmailLinkBadge {
    id: string;
    linkId: string; // ID du lien (pour suppression)
    type: EmailLinkEntityType;
    name: string;
    entityId: string;
}

// Résultat de recherche d'entité pour le dialog de liaison
export interface EntitySearchResult {
    id: string;
    name: string;
    subtitle?: string; // Ex: adresse pour building, numéro pour lot
    type: EmailLinkEntityType;
    isLinked: boolean; // Déjà lié à l'email courant
}

// Props pour le composant EntityEmailsTab
export interface EntityEmailsTabProps {
    entityType: EmailLinkEntityType;
    entityId: string;
    entityName: string;
}

// Email avec ses liaisons (pour affichage dans la liste d'entité)
export interface LinkedEmail {
    id: string;
    subject: string;
    from_address: string;
    received_at: string | null;
    sent_at: string | null;
    direction: 'received' | 'sent';
    status: string;
    snippet?: string;
    link: EmailLink;
}
