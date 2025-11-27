import type { Database } from '../../database.types'

// Re-export Database type for use in other modules
export type { Database } from '../../database.types'

// Temporary types for Phase 1 - will be replaced with generated types from Supabase
export interface User {
  id: string
  auth_user_id: string | null
  email: string | null
  name: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'proprietaire' | 'locataire'
  provider_category?: string | null
  speciality?: string | null
  phone?: string | null
  avatar_url?: string | null
  company?: string | null
  address?: string | null
  notes?: string | null
  team_id?: string | null
  is_active: boolean
  password_set: boolean
  created_at: string
  updated_at: string
}

export interface UserInsert {
  auth_user_id?: string | null
  email?: string | null
  name: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'proprietaire' | 'locataire'
  provider_category?: string | null
  speciality?: string | null
  phone?: string | null
  avatar_url?: string | null
  company?: string | null
  address?: string | null
  notes?: string | null
  team_id?: string | null
  is_active?: boolean
  password_set?: boolean
  created_at?: string
  updated_at?: string
}

export interface UserUpdate {
  auth_user_id?: string | null
  email?: string | null
  name?: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  role?: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  provider_category?: string | null
  speciality?: string | null
  phone?: string | null
  avatar_url?: string | null
  company?: string | null
  address?: string | null
  notes?: string | null
  team_id?: string | null
  is_active?: boolean
  password_set?: boolean
  updated_at?: string
}

// ===================================
// PHASE 2 TYPES: Use generated types from database.types.ts
// ===================================

export type Building = Database['public']['Tables']['buildings']['Row']
export type BuildingInsert = Database['public']['Tables']['buildings']['Insert']
export type BuildingUpdate = Database['public']['Tables']['buildings']['Update']

export type Lot = Database['public']['Tables']['lots']['Row']
export type LotInsert = Database['public']['Tables']['lots']['Insert']
export type LotUpdate = Database['public']['Tables']['lots']['Update']

export type PropertyDocument = Database['public']['Tables']['property_documents']['Row']
export type PropertyDocumentInsert = Database['public']['Tables']['property_documents']['Insert']
export type PropertyDocumentUpdate = Database['public']['Tables']['property_documents']['Update']

export type BuildingContact = Database['public']['Tables']['building_contacts']['Row']
export type BuildingContactInsert = Database['public']['Tables']['building_contacts']['Insert']
export type BuildingContactUpdate = Database['public']['Tables']['building_contacts']['Update']

export type LotContact = Database['public']['Tables']['lot_contacts']['Row']
export type LotContactInsert = Database['public']['Tables']['lot_contacts']['Insert']
export type LotContactUpdate = Database['public']['Tables']['lot_contacts']['Update']

// Enums from Phase 2
export type Country = Database['public']['Enums']['country']
export type LotCategory = Database['public']['Enums']['lot_category']
export type PropertyDocumentType = Database['public']['Enums']['property_document_type']
export type DocumentVisibilityLevel = Database['public']['Enums']['document_visibility_level']
export type TeamMemberRole = Database['public']['Enums']['team_member_role']

/**
 * Intervention Status (10 active states - French)
 * i18n will be added later when multiple languages are supported
 *
 * Note: 'en_cours' is DEPRECATED - kept in DB enum for backward compatibility
 * but no longer used in the application workflow.
 * Interventions now go directly from 'planifiee' to 'cloturee_par_*'
 */
export type InterventionStatus =
  | 'demande'                        // Initial request from tenant
  | 'rejetee'                        // Rejected by manager
  | 'approuvee'                      // Approved by manager
  | 'demande_de_devis'               // Quote requested from provider
  | 'planification'                  // Finding available time slot
  | 'planifiee'                      // Time slot confirmed
  | 'en_cours'                       // DEPRECATED: kept for DB compatibility only
  | 'cloturee_par_prestataire'       // Provider finished work
  | 'cloturee_par_locataire'         // Tenant validated work
  | 'cloturee_par_gestionnaire'      // Manager finalized intervention
  | 'annulee'                        // Cancelled

/**
 * Display labels for intervention status (active statuses only)
 * Note: 'en_cours' is excluded as it's deprecated
 */
export const STATUS_LABELS_FR: Partial<Record<InterventionStatus, string>> = {
  demande: "Demande",
  rejetee: "Rejetée",
  approuvee: "Approuvée",
  demande_de_devis: "Devis demandé",
  planification: "Planification",
  planifiee: "Planifiée",
  // en_cours: DEPRECATED - not displayed
  cloturee_par_prestataire: "Clôturée par prestataire",
  cloturee_par_locataire: "Clôturée par locataire",
  cloturee_par_gestionnaire: "Terminée",
  annulee: "Annulée"
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
  // ✅ FIX 2025-10-15: tenant_id REMOVED - all participants via intervention_assignments
  team_id?: string | null
  scheduled_date?: string | null
  completed_date?: string | null
  requested_date?: string | null
  finalized_at?: string | null
  estimated_cost?: number | null
  final_cost?: number | null
  tenant_comment?: string | null
  provider_guidelines?: string | null
  specific_location?: string | null
  requires_quote?: boolean | null
  quote_deadline?: string | null
  quote_notes?: string | null
  selected_quote_id?: string | null
  has_attachments?: boolean | null
  scheduling_type?: 'fixed' | 'slots' | 'flexible' | null
  created_at?: string
  updated_at?: string
  // Legacy field names (for backward compatibility in business logic)
  priority?: 'low' | 'medium' | 'high' | 'urgent'  // Maps to urgency
  category?: string  // Maps to type
  // ✅ Enriched data for interactive badge (loaded separately)
  quotes?: Array<{
    id: string
    status: string
    provider_id?: string
    created_by?: string
    amount?: number
  }>
  timeSlots?: Array<{
    id: string
    slot_date: string
    start_time: string
    status?: string
    proposed_by?: string
  }>
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
  // ✅ FIX 2025-10-15: tenant_id REMOVED - use intervention_assignments after creation
  team_id?: string | null
  scheduled_date?: string | null
  requested_date?: string | null
  estimated_cost?: number | null
  tenant_comment?: string | null
  provider_guidelines?: string | null
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
  // ✅ FIX 2025-10-15: tenant_id REMOVED
  team_id?: string | null
  scheduled_date?: string | null
  completed_date?: string | null
  requested_date?: string | null
  finalized_at?: string | null
  estimated_cost?: number | null
  final_cost?: number | null
  tenant_comment?: string | null
  provider_guidelines?: string | null
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
  email?: string | null
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
  city: string
  postal_code: string
  country?: Country
  description?: string | null
  team_id: string
  gestionnaire_id: string  // ✅ Primary manager for the building
}

export interface UpdateBuildingDTO {
  name?: string
  address?: string
  city?: string
  postal_code?: string
  country?: Country
  description?: string | null
  gestionnaire_id?: string
}

export interface CreateLotDTO {
  building_id: string
  reference: string
  team_id: string
  category?: LotCategory
  floor?: number | null
  description?: string | null
}

export interface UpdateLotDTO {
  reference?: string
  category?: LotCategory
  floor?: number | null
  description?: string | null
}

export interface CreatePropertyDocumentDTO {
  building_id?: string | null
  lot_id?: string | null
  team_id: string
  document_type: PropertyDocumentType
  visibility_level?: DocumentVisibilityLevel
  title?: string | null
  description?: string | null
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  storage_bucket?: string
}

export interface UpdatePropertyDocumentDTO {
  title?: string | null
  description?: string | null
  visibility_level?: DocumentVisibilityLevel
  document_date?: string | null
  expiry_date?: string | null
  is_archived?: boolean
  tags?: string[] | null
}

export interface CreateInterventionDTO {
  lot_id?: string | null
  building_id?: string | null
  title: string
  description: string
  urgency?: 'low' | 'normal' | 'urgent' | 'critical'
  type?: string
  // ✅ FIX 2025-10-15: tenant_id REMOVED
  reference: string
}

export interface UpdateInterventionDTO {
  title?: string
  description?: string
  urgency?: 'low' | 'normal' | 'urgent' | 'critical'
  status?: InterventionStatus
  type?: string
  // ✅ FIX 2025-10-15: tenant_id REMOVED
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

/**
 * Hash a password using bcrypt with 12 rounds (industry standard for security)
 *
 * ⚠️ **IMPORTANT: Currently UNUSED in production!**
 * - Supabase Auth manages all password hashing internally
 * - Auth passwords are passed plain to `supabase.auth.admin.createUser({ password })`
 * - Supabase hashes them securely (bcrypt/argon2)
 * - This function is imported by user.service.ts but public.users has no password_hash column
 * - Kept for potential future use cases (custom auth, password encryption, etc.)
 *
 * @param password - Plain text password to hash
 * @returns Bcrypt hashed password (includes salt automatically)
 *
 * Security notes:
 * - Uses bcrypt with 12 rounds (2^12 = 4096 iterations)
 * - Automatically generates unique salt per password
 * - Resistant to rainbow table attacks
 * - Computationally expensive to brute force
 * - Max password length: 72 bytes (bcrypt limitation)
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')

  // Validate password length (bcrypt max is 72 bytes)
  if (password.length > 72) {
    throw new Error('Password too long (max 72 characters for bcrypt)')
  }

  // Hash with 12 rounds (industry standard balance between security and performance)
  // Each additional round doubles the computational cost
  // 12 rounds ≈ 250ms on modern hardware
  return await bcrypt.hash(password, 12)
}

/**
 * Compare a plain text password with a bcrypt hash
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns true if password matches hash, false otherwise
 *
 * Note: This function is constant-time to prevent timing attacks
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return await bcrypt.compare(password, hash)
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
  // ✅ FIX 2025-10-15: tenant removed - use assignments array instead
  assignments?: Array<{
    role: 'gestionnaire' | 'prestataire' | 'locataire'
    is_primary: boolean
    user: User
    notes?: string
  }>
 intervention_assignments?: Array<{
    role: 'gestionnaire' | 'prestataire' | 'superviseur'
    is_primary: boolean
    user: User
    individual_message?: string
  }>
  quotes?: Array<{
    id: string
    status: 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
    amount?: number
    provider_id: string
    provider?: {
      name: string
    }
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
