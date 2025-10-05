import type { Database } from '../../database.types'

// Re-export Database type for use in other modules
export type { Database } from '../../database.types'

// Temporary types for Phase 1 - will be replaced with generated types from Supabase
export interface User {
  id: string
  auth_user_id: string | null
  email: string
  name: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  provider_category?: string | null
  speciality?: string | null
  status: 'active' | 'inactive' | 'pending'
  phone?: string | null
  avatar_url?: string | null
  notes?: string | null
  team_id?: string | null
  is_active: boolean
  password_set: boolean
  created_at: string
  updated_at: string
}

export interface UserInsert {
  auth_user_id?: string | null
  email: string
  name: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  provider_category?: string | null
  speciality?: string | null
  status?: 'active' | 'inactive' | 'pending'
  phone?: string | null
  avatar_url?: string | null
  notes?: string | null
  team_id?: string | null
  is_active?: boolean
  password_set?: boolean
  created_at?: string
  updated_at?: string
}

export interface UserUpdate {
  auth_user_id?: string | null
  email?: string
  name?: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  role?: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  provider_category?: string | null
  speciality?: string | null
  status?: 'active' | 'inactive' | 'pending'
  phone?: string | null
  avatar_url?: string | null
  notes?: string | null
  team_id?: string | null
  is_active?: boolean
  password_set?: boolean
  updated_at?: string
}

export interface Building {
  id: string
  name: string
  address: string
  city: string
  postal_code: string
  team_id?: string | null
  total_lots?: number
  description?: string | null
  created_at: string
  updated_at: string
}

export interface BuildingInsert {
  name: string
  address: string
  city: string
  postal_code: string
  team_id?: string | null
  total_lots?: number
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface BuildingUpdate {
  name?: string
  address?: string
  city?: string
  postal_code?: string
  team_id?: string | null
  total_lots?: number
  description?: string | null
  updated_at?: string
}

export interface Lot {
  id: string
  building_id: string
  reference: string
  type: 'apartment' | 'commercial' | 'parking' | 'storage'
  size?: number | null
  description?: string | null
  created_at: string
  updated_at: string
}

export interface LotInsert {
  building_id: string
  reference: string
  type: 'apartment' | 'commercial' | 'parking' | 'storage'
  size?: number | null
  description?: string | null
}

export interface LotUpdate {
  reference?: string
  type?: 'apartment' | 'commercial' | 'parking' | 'storage'
  size?: number | null
  description?: string | null
}

/**
 * Intervention Status (11 states - English for DB, French for display)
 * DB stores English, UI displays localized labels
 */
export type InterventionStatus =
  | 'pending'              // demande (initial request)
  | 'rejected'             // rejetee (manager rejection)
  | 'approved'             // approuvee (manager approval)
  | 'quote_requested'      // demande_de_devis (waiting for quote)
  | 'scheduling'           // planification (finding slot)
  | 'scheduled'            // planifiee (slot confirmed)
  | 'in_progress'          // en_cours (work started)
  | 'provider_completed'   // cloturee_par_prestataire (provider finished)
  | 'tenant_validated'     // cloturee_par_locataire (tenant approved)
  | 'completed'            // cloturee_par_gestionnaire (manager finalized)
  | 'cancelled'            // annulee (cancelled)

/**
 * Legacy French status → New English status mapping
 * Used for migration and backward compatibility
 */
export const STATUS_MAPPING = {
  'demande': 'pending',
  'rejetee': 'rejected',
  'approuvee': 'approved',
  'demande_de_devis': 'quote_requested',
  'planification': 'scheduling',
  'planifiee': 'scheduled',
  'en_cours': 'in_progress',
  'cloturee_par_prestataire': 'provider_completed',
  'cloturee_par_locataire': 'tenant_validated',
  'cloturee_par_gestionnaire': 'completed',
  'annulee': 'cancelled'
} as const

/**
 * French labels for intervention status display
 * Use with getStatusLabel() utility
 */
export const STATUS_LABELS_FR: Record<InterventionStatus, string> = {
  pending: "En attente",
  rejected: "Rejetée",
  approved: "Approuvée",
  quote_requested: "Devis demandé",
  scheduling: "Planification",
  scheduled: "Planifiée",
  in_progress: "En cours",
  provider_completed: "Clôturée par prestataire",
  tenant_validated: "Clôturée par locataire",
  completed: "Terminée",
  cancelled: "Annulée"
}

export interface Intervention {
  id: string
  lot_id?: string | null
  building_id?: string | null
  title: string
  description: string
  status: InterventionStatus
  urgency?: 'low' | 'normal' | 'urgent' | 'critical'
  type?: string
  reference: string
  tenant_id?: string | null  // Replaces requested_by
  team_id?: string | null
  scheduled_date?: string | null
  completed_date?: string | null
  requested_date?: string | null
  finalized_at?: string | null
  estimated_cost?: number | null
  final_cost?: number | null
  tenant_comment?: string | null
  manager_comment?: string | null
  provider_comment?: string | null
  specific_location?: string | null
  requires_quote?: boolean | null
  quote_deadline?: string | null
  quote_notes?: string | null
  selected_quote_id?: string | null
  has_attachments?: boolean | null
  scheduling_type?: string | null
  created_at?: string
  updated_at?: string
  // Legacy field names (for backward compatibility in business logic)
  priority?: 'low' | 'medium' | 'high' | 'urgent'  // Maps to urgency
  category?: string  // Maps to type
}

export interface InterventionInsert {
  lot_id?: string | null
  building_id?: string | null
  title: string
  description: string
  reference: string
  status?: InterventionStatus
  urgency?: 'low' | 'normal' | 'urgent' | 'critical'
  type?: string
  tenant_id?: string | null  // Replaces requested_by
  team_id?: string | null
  scheduled_date?: string | null
  requested_date?: string | null
  estimated_cost?: number | null
  tenant_comment?: string | null
  manager_comment?: string | null
  provider_comment?: string | null
  specific_location?: string | null
  requires_quote?: boolean | null
  quote_deadline?: string | null
  quote_notes?: string | null
  has_attachments?: boolean | null
  scheduling_type?: string | null
}

export interface InterventionUpdate {
  title?: string
  description?: string
  status?: InterventionStatus
  urgency?: 'low' | 'normal' | 'urgent' | 'critical'
  type?: string
  tenant_id?: string | null  // Replaces requested_by
  team_id?: string | null
  scheduled_date?: string | null
  completed_date?: string | null
  requested_date?: string | null
  finalized_at?: string | null
  estimated_cost?: number | null
  final_cost?: number | null
  tenant_comment?: string | null
  manager_comment?: string | null
  provider_comment?: string | null
  specific_location?: string | null
  requires_quote?: boolean | null
  quote_deadline?: string | null
  quote_notes?: string | null
  selected_quote_id?: string | null
  has_attachments?: boolean | null
  scheduling_type?: string | null
  updated_at?: string
}

export interface Contact {
  id: string
  user_id: string
  lot_id?: string | null
  building_id?: string | null
  type: 'tenant' | 'owner' | 'manager' | 'provider'
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  updated_at: string
}

export interface ContactInsert {
  user_id: string
  lot_id?: string | null
  building_id?: string | null
  type: 'tenant' | 'owner' | 'manager' | 'provider'
  status?: 'active' | 'inactive' | 'pending'
}

export interface ContactUpdate {
  lot_id?: string | null
  building_id?: string | null
  type?: 'tenant' | 'owner' | 'manager' | 'provider'
  status?: 'active' | 'inactive' | 'pending'
}

// Extended types for teams (will be added to database.types.ts later)
export interface Team {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

// Repository response types
export interface RepositoryResponse<T> {
  data: T | null
  error: RepositoryError | null
  success: boolean
}

export interface RepositoryListResponse<T> {
  data: T[]
  error: RepositoryError | null
  success: boolean
  count?: number
}

// Error types
export interface RepositoryError {
  code: string
  message: string
  details?: unknown
  hint?: string
}

// Query options
export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface FilterOptions {
  [key: string]: unknown
}

// Pagination
export interface PaginationOptions {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  error: RepositoryError | null
  success: boolean
}

// Cache options
export interface CacheOptions {
  ttl?: number // Time to live in seconds
  key?: string // Custom cache key
  enabled?: boolean
}

// Service options
export interface ServiceOptions {
  userId?: string
  userRole?: User['role']
  cache?: CacheOptions
  transaction?: boolean
}

// CRUD operation types
export type CrudOperation = 'create' | 'read' | 'update' | 'delete'

// Permission types
export interface Permission {
  resource: string
  action: CrudOperation
  roles: User['role'][]
}

// Validation result
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Common DTOs
export interface CreateUserDTO {
  email: string
  name: string
  role: User['role']
  phone?: string
  avatar_url?: string
}

export interface UpdateUserDTO {
  name?: string
  phone?: string
  avatar_url?: string
  status?: User['status']
}

export interface CreateBuildingDTO {
  name: string
  address: string
  description?: string
  manager_id: string
}

export interface UpdateBuildingDTO {
  name?: string
  address?: string
  description?: string
  manager_id?: string
}

export interface CreateLotDTO {
  building_id: string
  reference: string
  type: Lot['type']
  size?: number
  description?: string
}

export interface UpdateLotDTO {
  reference?: string
  type?: Lot['type']
  size?: number
  description?: string
}

export interface CreateInterventionDTO {
  lot_id?: string | null
  building_id?: string | null
  title: string
  description: string
  urgency?: 'low' | 'normal' | 'urgent' | 'critical'
  type?: string
  tenant_id?: string | null  // Replaces requested_by
  reference: string
}

export interface UpdateInterventionDTO {
  title?: string
  description?: string
  urgency?: 'low' | 'normal' | 'urgent' | 'critical'
  status?: InterventionStatus
  type?: string
  tenant_id?: string | null  // Replaces requested_by
  scheduled_date?: string | null
  completed_date?: string | null
  finalized_at?: string | null
}

export interface CreateContactDTO {
  user_id: string
  lot_id?: string
  building_id?: string
  type: Contact['type']
  status: Contact['status']
}

export interface UpdateContactDTO {
  type?: Contact['type']
  status?: Contact['status']
}

// ===================================
// VALIDATION UTILITIES
// ===================================

export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): void {
  for (const field of fields) {
    if (!data[field]) {
      throw new Error(`Field '${String(field)}' is required`)
    }
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format')
  }
}

export function validateUUID(uuid: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(uuid)) {
    throw new Error('Invalid UUID format')
  }
}

export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value.length < min || value.length > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max} characters`)
  }
}

export function validateNumber(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`)
  }
}

export function validateEnum<T extends string>(
  value: T,
  allowedValues: readonly T[],
  fieldName: string
): void {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`)
  }
}

export async function hashPassword(password: string): Promise<string> {
  // Simple hash function for demo - in production use bcrypt
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Relations
export interface UserWithRelations extends User {
  managed_buildings?: Building[]
  contacts?: Contact[]
  interventions_requested?: Intervention[]
  interventions_assigned?: Intervention[]
}

export interface BuildingWithRelations extends Building {
  lots?: Lot[]
  manager?: User
  contacts?: Contact[]
}

export interface LotWithRelations extends Lot {
  building?: Building
  contacts?: Contact[]
  interventions?: Intervention[]
}

export interface InterventionWithRelations extends Intervention {
  lot?: LotWithRelations
  tenant?: User  // The user who requested (tenant_id relationship)
  intervention_contacts?: Array<{
    role: 'gestionnaire' | 'prestataire' | 'superviseur'
    is_primary: boolean
    user: User
    individual_message?: string
  }>
}

export interface ContactWithRelations extends Contact {
  user?: User
  lot?: Lot
  building?: Building
}

// Stats types
export interface DashboardStats {
  totalUsers: number
  totalBuildings: number
  totalLots: number
  totalInterventions: number
  activeInterventions: number
  completedInterventions: number
  pendingInterventions: number
}

export interface UserStats {
  interventionsRequested: number
  interventionsAssigned: number
  interventionsCompleted: number
  buildingsManaged: number
  lotsManaged: number
}

// Real-time subscription types
export interface RealtimeSubscription {
  table: string
  filter?: string
  callback: (payload: unknown) => void
}

// Audit log types
export interface AuditLog {
  id: string
  table_name: string
  operation: CrudOperation
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  user_id?: string
  timestamp: string
}

// Export utility type for extracting table names
export type TableName = keyof Database['public']['Tables']

// Utility type for getting row type from table name
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row']

// Utility type for getting insert type from table name
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert']

// Utility type for getting update type from table name
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update']
