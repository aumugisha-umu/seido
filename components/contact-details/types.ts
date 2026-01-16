import type {
  User,
  Intervention as InterventionType,
  Lot as LotType,
  Building as BuildingType
} from '@/lib/services'

/**
 * Type for company data from Supabase join
 */
export interface CompanyData {
  id: string
  name: string
  vat_number?: string | null
  street?: string | null
  street_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  email?: string | null
  phone?: string | null
  is_active?: boolean
}

/**
 * Type for contracts passed from server
 */
export interface LinkedContract {
  id: string
  title: string | null
  status: string
  start_date: string
  end_date: string | null
  rent_amount: number | null
  charges_amount: number | null
  contactRole: string // 'locataire' | 'colocataire' | 'garant' | 'owner' etc.
  lot?: {
    id: string
    reference: string
    category: string
    street: string | null
    city: string | null
    building?: {
      id: string
      name: string
      address: string | null
      city: string | null
    } | null
  } | null
  contacts?: Array<{
    id: string
    user_id: string
    role: string
    is_primary: boolean
  }>
}

/**
 * Extended contact type with company data
 * Note: "Contact" in this context refers to a user from the 'users' table,
 * not the 'contacts' junction table. This is the data loaded in contact details.
 */
export type ContactWithCompany = User & {
  company?: CompanyData | null
}

/**
 * Props for the main ContactDetailsClient component
 */
export interface ContactDetailsClientProps {
  contactId: string
  initialContact: ContactWithCompany
  initialInterventions: InterventionType[]
  initialProperties: Array<(LotType & { type: 'lot' }) | (BuildingType & { type: 'building' })>
  initialContracts?: LinkedContract[]
  initialInvitationStatus?: string | null
  currentUser: {
    id: string
    email: string
    role: string
    team_id: string
  }
}

/**
 * User role configuration for display
 */
export interface RoleConfig {
  value: string
  label: string
  color: string
}

/**
 * Category/speciality option
 */
export interface CategoryOption {
  value: string
  label: string
}

/**
 * Statistics for contact overview
 */
export interface ContactStats {
  interventions: number
  activeInterventions: number
  properties: number
  contracts: number
  emails: number
}

/**
 * Invitation status from API
 */
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled' | null
