import type { Database } from '../../database.types'

// Re-export Database type for use in other modules
export type { Database } from '../../database.types'

// Temporary types for Phase 1 - will be replaced with generated types from Supabase
export interface User {
  id: string
  auth_user_id: string
  email: string
  name: string
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  status: 'active' | 'inactive' | 'pending'
  phone?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface UserInsert {
  auth_user_id?: string
  email: string
  name: string
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  status?: 'active' | 'inactive' | 'pending'
  phone?: string | null
  avatar_url?: string | null
}

export interface UserUpdate {
  email?: string
  name?: string
  role?: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  status?: 'active' | 'inactive' | 'pending'
  phone?: string | null
  avatar_url?: string | null
}

export interface Building {
  id: string
  name: string
  address: string
  description?: string | null
  manager_id: string
  created_at: string
  updated_at: string
}

export interface BuildingInsert {
  name: string
  address: string
  description?: string | null
  manager_id: string
}

export interface BuildingUpdate {
  name?: string
  address?: string
  description?: string | null
  manager_id?: string
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

export interface Intervention {
  id: string
  lot_id: string
  title: string
  description: string
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  requested_by: string
  assigned_to?: string | null
  scheduled_date?: string | null
  completed_date?: string | null
  estimated_duration?: number | null
  actual_duration?: number | null
  notes?: string | null
  attachments?: string[] | null
  quote_amount?: number | null
  final_amount?: number | null
  created_at: string
  updated_at: string
}

export interface InterventionInsert {
  lot_id: string
  title: string
  description: string
  status?: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  requested_by: string
  assigned_to?: string | null
  scheduled_date?: string | null
  estimated_duration?: number | null
  notes?: string | null
  attachments?: string[] | null
  quote_amount?: number | null
}

export interface InterventionUpdate {
  title?: string
  description?: string
  status?: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  assigned_to?: string | null
  scheduled_date?: string | null
  completed_date?: string | null
  estimated_duration?: number | null
  actual_duration?: number | null
  notes?: string | null
  attachments?: string[] | null
  quote_amount?: number | null
  final_amount?: number | null
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
  lot_id: string
  title: string
  description: string
  priority: Intervention['priority']
  category: string
  requested_by: string
}

export interface UpdateInterventionDTO {
  title?: string
  description?: string
  priority?: Intervention['priority']
  status?: Intervention['status']
  category?: string
  assigned_to?: string
  scheduled_date?: string
  completed_date?: string
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
  requested_by_user?: User
  assigned_to_user?: User
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