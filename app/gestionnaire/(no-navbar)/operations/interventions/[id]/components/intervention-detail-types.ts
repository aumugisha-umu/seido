/**
 * Shared types for intervention detail sub-components (gestionnaire view)
 */
import type { Database } from '@/lib/database.types'

export type AddressRecord = Database['public']['Tables']['addresses']['Row'] | null

export type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row'] & {
    address_record?: AddressRecord
  }
  lot?: Database['public']['Tables']['lots']['Row'] & {
    address_record?: AddressRecord
    building?: Database['public']['Tables']['buildings']['Row'] & {
      address_record?: AddressRecord
    }
  }
  tenant?: Database['public']['Tables']['users']['Row']
  creator?: {
    id: string
    name: string
    email: string | null
    role: string
  }
}

export type Assignment = Database['public']['Tables']['intervention_assignments']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

export type Document = Database['public']['Tables']['intervention_documents']['Row']

export type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

export type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
}

export type Thread = Database['public']['Tables']['conversation_threads']['Row']

export type User = Database['public']['Tables']['users']['Row']

export interface Comment {
  id: string
  content: string
  created_at: string
  is_internal?: boolean
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url' | 'role'>
}

export type AssignmentMode = Database['public']['Enums']['assignment_mode']

export interface InterventionLink {
  id: string
  parent_intervention_id: string
  child_intervention_id: string
  provider_id: string
  link_type: string
  created_at: string
  parent?: { id: string; reference: string; title: string; status: string }
  child?: { id: string; reference: string; title: string; status: string }
  provider?: { id: string; first_name: string; last_name: string; avatar_url?: string }
}

export interface InterventionAddress {
  latitude: number
  longitude: number
  formatted_address: string | null
}

export interface Participant {
  id: string
  name: string
  email?: string
  phone?: string
  company_name?: string
  role: 'manager' | 'provider' | 'tenant'
  hasAccount: boolean
}

// Type Badge Constants
export const TYPE_TO_CATEGORY: Record<string, 'bien' | 'bail' | 'locataire'> = {
  // Bien (Property)
  'plomberie': 'bien', 'electricite': 'bien', 'chauffage': 'bien', 'serrurerie': 'bien',
  'menuiserie': 'bien', 'peinture': 'bien', 'espaces_verts': 'bien', 'nettoyage': 'bien',
  'renovation': 'bien', 'travaux_structurels': 'bien', 'toiture_facade': 'bien',
  'ascenseur': 'bien', 'securite_incendie': 'bien', 'autre_technique': 'bien',
  // Bail (Lease)
  'etat_des_lieux_entree': 'bail', 'etat_des_lieux_sortie': 'bail', 'regularisation_charges': 'bail',
  'revision_loyer': 'bail', 'renouvellement_bail': 'bail', 'resiliation_bail': 'bail',
  'quittancement': 'bail', 'contentieux_loyer': 'bail', 'autre_administratif': 'bail',
  // Locataire (Tenant)
  'nuisances': 'locataire', 'sinistre': 'locataire', 'demande_autorisation': 'locataire',
  'reclamation': 'locataire', 'probleme_voisinage': 'locataire', 'assurance': 'locataire',
  'autre_locataire': 'locataire',
}

export const CATEGORY_BADGE_STYLES: Record<string, string> = {
  bien: 'bg-blue-100 text-blue-700 border-blue-200',
  bail: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  locataire: 'bg-orange-100 text-orange-700 border-orange-200',
}

// Re-export shared types from interventions/shared for convenience
export type {
  Quote as SharedQuote,
  TimeSlot as SharedTimeSlot,
  Comment as SharedComment,
  InterventionDocument,
  TimelineEventData,
} from '@/components/interventions/shared'
