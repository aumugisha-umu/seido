/**
 * Contract Types - SEIDO Phase 4
 *
 * Types TypeScript pour la gestion des contrats/baux.
 * Ces types seront alignes avec database.types.ts apres regeneration.
 */

// ============================================================================
// ENUMS (miroir des enums PostgreSQL)
// ============================================================================

export type ContractType = 'bail_habitation' | 'bail_meuble'

// Enum for contract life cycle status
// 'brouillon' is replaced by 'a_venir' as the initial state
export type ContractStatus = 'a_venir' | 'actif' | 'expire' | 'resilie' | 'renouvele'

// Enum for guarantee types
export type GuaranteeType = 'pas_de_garantie' | 'compte_proprietaire' | 'compte_bloque' | 'e_depot' | 'autre'

export const DEFAULT_CONTRACT_STATUS: ContractStatus = 'a_venir'

export type PaymentFrequency = 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'

export type ContractDocumentType =
  | 'bail'
  | 'avenant'
  | 'etat_des_lieux_entree'
  | 'etat_des_lieux_sortie'
  | 'attestation_assurance'
  | 'justificatif_identite'
  | 'justificatif_revenus'
  | 'caution_bancaire'
  | 'quittance'
  | 'reglement_copropriete'
  | 'diagnostic'
  | 'autre'

export type ContractContactRole =
  | 'locataire'
  | 'colocataire'
  | 'garant'
  | 'representant_legal'
  | 'autre'

// ============================================================================
// DATABASE ROW TYPES (alignes avec le schema)
// ============================================================================

/**
 * Contrat de bail - Row type de la table contracts
 */
export interface Contract {
  id: string
  team_id: string
  lot_id: string
  created_by: string
  title: string
  contract_type: ContractType
  status: ContractStatus
  start_date: string  // DATE -> string ISO
  duration_months: number
  end_date: string    // GENERATED column
  signed_date: string | null
  payment_frequency: PaymentFrequency
  payment_frequency_value: number
  rent_amount: number
  charges_amount: number
  guarantee_type: GuaranteeType
  guarantee_amount: number | null
  guarantee_notes: string | null
  comments: string | null
  metadata: Record<string, unknown>
  renewed_from_id: string | null
  renewed_to_id: string | null
  deleted_at: string | null
  deleted_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Contact lie a un contrat - Row type de la table contract_contacts
 */
export interface ContractContact {
  id: string
  contract_id: string
  user_id: string
  role: ContractContactRole
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Document lie a un contrat - Row type de la table contract_documents
 */
export interface ContractDocument {
  id: string
  contract_id: string
  team_id: string
  document_type: ContractDocumentType
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  storage_bucket: string
  title: string | null
  description: string | null
  uploaded_by: string | null
  uploaded_at: string
  deleted_at: string | null
  deleted_by: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// INSERT/UPDATE TYPES
// ============================================================================

/**
 * Type pour creation d'un contrat
 */
export interface ContractInsert {
  id?: string
  team_id: string
  lot_id: string
  created_by: string
  title: string
  contract_type?: ContractType
  status?: ContractStatus
  start_date: string
  duration_months: number
  signed_date?: string | null
  payment_frequency?: PaymentFrequency
  payment_frequency_value?: number
  rent_amount: number
  charges_amount?: number
  guarantee_type?: GuaranteeType
  guarantee_amount?: number | null
  guarantee_notes?: string | null
  comments?: string | null
  metadata?: Record<string, unknown>
  renewed_from_id?: string | null
}

/**
 * Type pour mise a jour d'un contrat
 */
export interface ContractUpdate {
  lot_id?: string  // Permet de changer le lot (rare mais possible)
  title?: string
  contract_type?: ContractType
  status?: ContractStatus
  start_date?: string
  duration_months?: number
  signed_date?: string | null
  payment_frequency?: PaymentFrequency
  payment_frequency_value?: number
  rent_amount?: number
  charges_amount?: number
  guarantee_type?: GuaranteeType
  guarantee_amount?: number | null
  guarantee_notes?: string | null
  comments?: string | null
  metadata?: Record<string, unknown>
  renewed_to_id?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
}

/**
 * Type pour creation d'un contact de contrat
 */
export interface ContractContactInsert {
  id?: string
  contract_id: string
  user_id: string
  role?: ContractContactRole
  is_primary?: boolean
  notes?: string | null
}

/**
 * Type pour mise a jour d'un contact de contrat
 */
export interface ContractContactUpdate {
  role?: ContractContactRole
  is_primary?: boolean
  notes?: string | null
}

/**
 * Type pour creation d'un document de contrat
 */
export interface ContractDocumentInsert {
  id?: string
  contract_id: string
  team_id: string
  document_type?: ContractDocumentType
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  storage_bucket?: string
  title?: string | null
  description?: string | null
  uploaded_by?: string | null
}

/**
 * Type pour mise a jour d'un document de contrat
 */
export interface ContractDocumentUpdate {
  document_type?: ContractDocumentType
  title?: string | null
  description?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
}

// ============================================================================
// EXTENDED TYPES (avec relations)
// ============================================================================

/**
 * Contrat avec toutes les relations chargees
 */
export interface ContractWithRelations extends Contract {
  lot?: {
    id: string
    reference: string
    category: string
    street?: string
    city?: string
    postal_code?: string
    building?: {
      id: string
      name: string
      address: string
      city?: string
    } | null
  }
  team?: {
    id: string
    name: string
  }
  contacts?: ContractContactWithUser[]
  documents?: ContractDocument[]
  created_by_user?: {
    id: string
    name: string
    email: string
  }
}

/**
 * Contact de contrat avec informations utilisateur
 */
export interface ContractContactWithUser extends ContractContact {
  user: {
    id: string
    name: string
    email: string | null
    phone: string | null
    first_name: string | null
    last_name: string | null
  }
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Donnees du formulaire de creation de contrat (5 etapes)
 */
export interface ContractFormData {
  // Step 1: Selection du lot
  lotId: string

  // Step 2: Informations generales
  title: string
  contractType: ContractType
  startDate: string
  durationMonths: number
  comments?: string

  // Step 3: Paiements
  paymentFrequency: PaymentFrequency
  paymentFrequencyValue: number
  rentAmount: number
  chargesAmount: number

  // Step 4: Contacts & Garantie
  contacts: {
    userId: string
    role: ContractContactRole
    isPrimary: boolean
  }[]
  guaranteeType: GuaranteeType
  guaranteeAmount?: number
  guaranteeNotes?: string

  // Documents a uploader
  documents?: File[]

  // Step 5: Options finales
  inviteTenants?: boolean
}

/**
 * Donnees validees pour creation de contrat (apres validation Zod)
 */
export interface ValidatedContractData {
  team_id: string
  lot_id: string
  created_by: string
  title: string
  contract_type: ContractType
  status: ContractStatus
  start_date: string
  duration_months: number
  payment_frequency: PaymentFrequency
  payment_frequency_value: number
  rent_amount: number
  charges_amount: number
  guarantee_type: GuaranteeType
  guarantee_amount?: number
  guarantee_notes?: string
  comments?: string
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

/**
 * Props pour ContractCard
 */
export interface ContractCardProps {
  contract: ContractWithRelations
  mode?: 'view' | 'select'
  isSelected?: boolean
  onSelect?: (id: string) => void
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

/**
 * Props pour ContractStatusBadge
 */
export interface ContractStatusBadgeProps {
  status: ContractStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

/**
 * Props pour ContractTypeBadge
 */
export interface ContractTypeBadgeProps {
  type: ContractType
}

/**
 * Props pour ContractDatesDisplay
 */
export interface ContractDatesDisplayProps {
  startDate: string
  endDate: string
  showRemaining?: boolean
  compact?: boolean
  /** Affiche une barre de progression visuelle du temps écoulé */
  showProgress?: boolean
}

/**
 * Props pour ContractsNavigator
 */
export interface ContractsNavigatorProps {
  contracts: ContractWithRelations[]
  loading?: boolean
  onRefresh?: () => void
  onDeleteContract?: (id: string) => void
  className?: string
}

/**
 * Props pour ContractDetailsClient
 */
export interface ContractDetailsClientProps {
  contract: ContractWithRelations
  teamId: string
}

/**
 * Props pour ContractCreationClient
 */
export interface ContractCreationClientProps {
  teamId: string
  initialBuildingsData: {
    buildings: any[]
    lots: any[]
    teamId: string | null
  }
  initialContacts: Array<{
    id: string
    name: string
    email: string | null
    phone: string | null
    role: string
  }>
  prefilledLotId?: string | null
  renewFromId?: string | null
  // Props pour retour après création de contact
  sessionKey?: string | null
  newContactId?: string | null
  contactType?: string | null
}

/**
 * Props pour ContractEditClient
 */
export interface ContractEditClientProps {
  teamId: string
  contract: ContractWithRelations
  initialLots: Array<{
    id: string
    reference: string
    category: string
    street?: string
    city?: string
    building?: { id: string; name: string; address?: string; city?: string } | null
  }>
  initialContacts: Array<{
    id: string
    name: string
    email: string | null
    phone: string | null
    role: string
  }>
}

// ============================================================================
// STATS & METRICS
// ============================================================================

/**
 * Statistiques des contrats pour le dashboard
 */
export interface ContractStats {
  totalActive: number
  expiringThisMonth: number
  expiringNext30Days: number
  expired: number
  totalRentMonthly: number
  averageRent: number
  /** Nombre de lots concernés par les contrats actifs */
  totalLots: number
  /** Nombre total de locataires sur les contrats actifs */
  totalTenants: number
}

/**
 * Contrat avec calculs pour affichage
 */
export interface ContractWithCalculations extends ContractWithRelations {
  totalMonthly: number        // rent + charges
  daysRemaining: number       // jours avant expiration
  isExpiringSoon: boolean     // < 30 jours
  isExpired: boolean          // date passee
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Labels francais pour les statuts
 */
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  a_venir: 'À venir',
  actif: 'Actif',
  expire: 'Expiré',
  resilie: 'Résilié',
  renouvele: 'Renouvelé'
}

/**
 * Labels francais pour les types de contrat
 */
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  bail_habitation: 'Bail d\'habitation',
  bail_meuble: 'Bail meublé'
}

/**
 * Labels francais pour les types de garantie
 */
export const GUARANTEE_TYPE_LABELS: Record<GuaranteeType, string> = {
  pas_de_garantie: 'Pas de garantie',
  compte_proprietaire: 'Compte du propriétaire',
  compte_bloque: 'Compte bloqué',
  e_depot: 'E-dépôt',
  autre: 'Autre'
}

/**
 * Labels francais pour les frequences de paiement
 */
export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  semestriel: 'Semestriel',
  annuel: 'Annuel'
}

/**
 * Labels francais pour les types de documents
 */
export const CONTRACT_DOCUMENT_TYPE_LABELS: Record<ContractDocumentType, string> = {
  bail: 'Contrat de bail',
  avenant: 'Avenant',
  etat_des_lieux_entree: 'État des lieux d\'entrée',
  etat_des_lieux_sortie: 'État des lieux de sortie',
  attestation_assurance: 'Attestation d\'assurance',
  justificatif_identite: 'Justificatif d\'identité',
  justificatif_revenus: 'Justificatif de revenus',
  caution_bancaire: 'Caution bancaire',
  quittance: 'Quittance de loyer',
  reglement_copropriete: 'Règlement de copropriété',
  diagnostic: 'Diagnostic (DPE, etc.)',
  autre: 'Autre'
}

/**
 * Labels francais pour les roles de contact
 */
export const CONTRACT_CONTACT_ROLE_LABELS: Record<ContractContactRole, string> = {
  locataire: 'Locataire',
  colocataire: 'Colocataire',
  garant: 'Garant',
  representant_legal: 'Représentant légal',
  autre: 'Autre'
}

/**
 * Couleurs pour les badges de statut
 */
export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  a_venir: 'bg-amber-100 text-amber-800 border-amber-200',
  actif: 'bg-green-100 text-green-800 border-green-200',
  expire: 'bg-red-100 text-red-800 border-red-200',
  resilie: 'bg-slate-100 text-slate-800 border-slate-200',
  renouvele: 'bg-blue-100 text-blue-800 border-blue-200'
}

/**
 * Couleurs pour les badges de type de contrat
 */
export const CONTRACT_TYPE_COLORS: Record<ContractType, string> = {
  bail_habitation: 'bg-sky-100 text-sky-800',
  bail_meuble: 'bg-teal-100 text-teal-800'
}

/**
 * Durees de bail predefinies (en mois)
 */
export const CONTRACT_DURATION_OPTIONS = [
  { value: 12, label: '1 an' },
  { value: 24, label: '2 ans' },
  { value: 36, label: '3 ans' },
  { value: 6, label: '6 mois (mobilité)' },
  { value: 9, label: '9 mois (étudiant)' }
] as const
