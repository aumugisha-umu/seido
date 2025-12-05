/**
 * Contract Repository - Phase 4
 * Handles all database operations for contracts using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NotFoundException, handleError, createErrorResponse } from '../core/error-handler'
import { logger } from '@/lib/logger'
import {
  validateRequired,
  validateLength,
  validateNumber,
  validateEnum
} from '../core/service-types'
import type {
  Contract,
  ContractInsert,
  ContractUpdate,
  ContractWithRelations,
  ContractContact,
  ContractContactInsert,
  ContractContactUpdate,
  ContractDocument,
  ContractDocumentInsert,
  ContractStatus,
  ContractType,
  GuaranteeType,
  PaymentFrequency
} from '@/lib/types/contract.types'

// ============================================================================
// CONTRACT REPOSITORY
// ============================================================================

/**
 * Contract Repository
 * Manages all database operations for contracts with relations
 */
export class ContractRepository extends BaseRepository<Contract, ContractInsert, ContractUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'contracts')
  }

  /**
   * Validation hook for contract data
   */
  protected async validate(data: ContractInsert | ContractUpdate): Promise<void> {
    if ('title' in data && data.title) {
      validateLength(data.title, 1, 255, 'title')
    }

    if ('contract_type' in data && data.contract_type) {
      validateEnum(
        data.contract_type,
        ['bail_habitation', 'bail_meuble'] as const,
        'contract_type'
      )
    }

    if ('status' in data && data.status) {
      validateEnum(
        data.status,
        ['brouillon', 'actif', 'expire', 'resilie', 'renouvele'] as const,
        'status'
      )
    }

    if ('duration_months' in data && data.duration_months !== undefined) {
      validateNumber(data.duration_months, 1, 120, 'duration_months')
    }

    if ('rent_amount' in data && data.rent_amount !== undefined) {
      validateNumber(data.rent_amount, 0, 1000000, 'rent_amount')
    }

    if ('charges_amount' in data && data.charges_amount !== undefined) {
      validateNumber(data.charges_amount, 0, 100000, 'charges_amount')
    }

    if ('guarantee_amount' in data && data.guarantee_amount !== undefined && data.guarantee_amount !== null) {
      validateNumber(data.guarantee_amount, 0, 100000, 'guarantee_amount')
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['team_id', 'lot_id', 'created_by', 'title', 'start_date', 'duration_months', 'rent_amount'])
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(data: ContractInsert | ContractUpdate): data is ContractInsert {
    return 'team_id' in data && 'lot_id' in data && 'start_date' in data
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get contract by ID with all relations
   */
  async findByIdWithRelations(id: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          lot:lot_id(
            id, reference, category, street, city, postal_code,
            building:building_id(id, name, address, city)
          ),
          team:team_id(id, name),
          created_by_user:created_by(id, name, email),
          contacts:contract_contacts(
            id, user_id, role, is_primary, notes,
            user:user_id(id, name, email, phone, first_name, last_name)
          ),
          documents:contract_documents(
            id, document_type, filename, original_filename, file_size, mime_type,
            storage_path, title, description, uploaded_at, uploaded_by
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('contracts', id)
        }
        return createErrorResponse(handleError(error, 'contract:findByIdWithRelations'))
      }

      return { success: true as const, data: data as ContractWithRelations }
    } catch (error) {
      logger.error({ error, id }, '❌ [CONTRACT-REPO] findByIdWithRelations error')
      return createErrorResponse(handleError(error as Error, 'contract:findByIdWithRelations'))
    }
  }

  /**
   * Get all contracts for a team
   */
  async findByTeam(teamId: string, options?: { includeExpired?: boolean; status?: ContractStatus }) {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(`
          *,
          lot:lot_id(
            id, reference, category, street, city,
            building:building_id(id, name, address)
          ),
          contacts:contract_contacts(
            id, user_id, role, is_primary,
            user:user_id(id, name, email, phone)
          )
        `)
        .eq('team_id', teamId)
        .is('deleted_at', null)

      // Filter by status if provided
      if (options?.status) {
        query = query.eq('status', options.status)
      }

      // Exclude expired by default unless includeExpired is true
      if (!options?.includeExpired) {
        query = query.neq('status', 'expire')
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'contract:findByTeam'))
      }

      return { success: true as const, data: (data || []) as ContractWithRelations[] }
    } catch (error) {
      logger.error({ error, teamId }, '❌ [CONTRACT-REPO] findByTeam error')
      return createErrorResponse(handleError(error as Error, 'contract:findByTeam'))
    }
  }

  /**
   * Get contracts for a specific lot
   */
  async findByLot(lotId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          contacts:contract_contacts(
            id, user_id, role, is_primary,
            user:user_id(id, name, email)
          )
        `)
        .eq('lot_id', lotId)
        .is('deleted_at', null)
        .order('start_date', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'contract:findByLot'))
      }

      return { success: true as const, data: (data || []) as ContractWithRelations[] }
    } catch (error) {
      logger.error({ error, lotId }, '❌ [CONTRACT-REPO] findByLot error')
      return createErrorResponse(handleError(error as Error, 'contract:findByLot'))
    }
  }

  /**
   * Get active contract for a lot (should be only one)
   */
  async findActiveByLot(lotId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          contacts:contract_contacts(
            id, user_id, role, is_primary,
            user:user_id(id, name, email, phone)
          )
        `)
        .eq('lot_id', lotId)
        .eq('status', 'actif')
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        return createErrorResponse(handleError(error, 'contract:findActiveByLot'))
      }

      return { success: true as const, data: data as ContractWithRelations | null }
    } catch (error) {
      logger.error({ error, lotId }, '❌ [CONTRACT-REPO] findActiveByLot error')
      return createErrorResponse(handleError(error as Error, 'contract:findActiveByLot'))
    }
  }

  /**
   * Get contracts expiring within X days
   */
  async findExpiringSoon(teamId: string, days: number = 30) {
    try {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      const futureDateStr = futureDate.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          lot:lot_id(
            id, reference, category,
            building:building_id(id, name, address)
          ),
          contacts:contract_contacts(
            id, user_id, role, is_primary,
            user:user_id(id, name, email)
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'actif')
        .is('deleted_at', null)
        .gte('end_date', todayStr)
        .lte('end_date', futureDateStr)
        .order('end_date', { ascending: true })

      if (error) {
        return createErrorResponse(handleError(error, 'contract:findExpiringSoon'))
      }

      return { success: true as const, data: (data || []) as ContractWithRelations[] }
    } catch (error) {
      logger.error({ error, teamId, days }, '❌ [CONTRACT-REPO] findExpiringSoon error')
      return createErrorResponse(handleError(error as Error, 'contract:findExpiringSoon'))
    }
  }

  /**
   * Get contracts by status
   */
  async findByStatus(teamId: string, status: ContractStatus) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          lot:lot_id(id, reference, category, building:building_id(id, name)),
          contacts:contract_contacts(id, user_id, role, is_primary, user:user_id(id, name))
        `)
        .eq('team_id', teamId)
        .eq('status', status)
        .is('deleted_at', null)
        .order('end_date', { ascending: true })

      if (error) {
        return createErrorResponse(handleError(error, 'contract:findByStatus'))
      }

      return { success: true as const, data: (data || []) as ContractWithRelations[] }
    } catch (error) {
      logger.error({ error, teamId, status }, '❌ [CONTRACT-REPO] findByStatus error')
      return createErrorResponse(handleError(error as Error, 'contract:findByStatus'))
    }
  }

  /**
   * Check if lot has an active contract
   */
  async hasActiveContract(lotId: string, excludeContractId?: string) {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('id', { count: 'exact', head: true })
        .eq('lot_id', lotId)
        .eq('status', 'actif')
        .is('deleted_at', null)

      if (excludeContractId) {
        query = query.neq('id', excludeContractId)
      }

      const { count, error } = await query

      if (error) {
        return createErrorResponse(handleError(error, 'contract:hasActiveContract'))
      }

      return { success: true as const, data: (count || 0) > 0 }
    } catch (error) {
      logger.error({ error, lotId }, '❌ [CONTRACT-REPO] hasActiveContract error')
      return createErrorResponse(handleError(error as Error, 'contract:hasActiveContract'))
    }
  }

  /**
   * Update contract status
   */
  async updateStatus(id: string, status: ContractStatus, reason?: string) {
    try {
      const updateData: ContractUpdate = {
        status,
        ...(reason && { comments: reason })
      }

      const result = await this.update(id, updateData)

      if (result.success) {
        logger.info({ id, status }, '✅ [CONTRACT-REPO] Status updated')
      }

      return result
    } catch (error) {
      logger.error({ error, id, status }, '❌ [CONTRACT-REPO] updateStatus error')
      return createErrorResponse(handleError(error as Error, 'contract:updateStatus'))
    }
  }

  /**
   * Get contract statistics for a team
   */
  async getStats(teamId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysLater = new Date()
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
      const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0]

      // Get all active contracts
      const { data: activeContracts, error: activeError } = await this.supabase
        .from(this.tableName)
        .select('id, rent_amount, charges_amount, end_date')
        .eq('team_id', teamId)
        .eq('status', 'actif')
        .is('deleted_at', null)

      if (activeError) {
        return createErrorResponse(handleError(activeError, 'contract:getStats'))
      }

      const contracts = activeContracts || []
      const totalActive = contracts.length

      // Calculate expiring counts
      const expiringNext30Days = contracts.filter(c => {
        const endDate = new Date(c.end_date)
        const thirtyDays = new Date()
        thirtyDays.setDate(thirtyDays.getDate() + 30)
        return endDate >= new Date() && endDate <= thirtyDays
      }).length

      // Get expired contracts count
      const { count: expiredCount } = await this.supabase
        .from(this.tableName)
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'expire')
        .is('deleted_at', null)

      // Calculate totals
      const totalRentMonthly = contracts.reduce((sum, c) => sum + (Number(c.rent_amount) || 0), 0)
      const averageRent = totalActive > 0 ? totalRentMonthly / totalActive : 0

      return {
        success: true as const,
        data: {
          totalActive,
          expiringThisMonth: expiringNext30Days,
          expiringNext30Days,
          expired: expiredCount || 0,
          totalRentMonthly,
          averageRent
        }
      }
    } catch (error) {
      logger.error({ error, teamId }, '❌ [CONTRACT-REPO] getStats error')
      return createErrorResponse(handleError(error as Error, 'contract:getStats'))
    }
  }
}

// ============================================================================
// CONTRACT CONTACT REPOSITORY
// ============================================================================

/**
 * Contract Contact Repository
 * Manages contract-contact relationships
 */
export class ContractContactRepository extends BaseRepository<ContractContact, ContractContactInsert, ContractContactUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'contract_contacts')
  }

  protected async validate(data: ContractContactInsert | ContractContactUpdate): Promise<void> {
    if ('role' in data && data.role) {
      validateEnum(
        data.role,
        ['locataire', 'colocataire', 'garant', 'representant_legal', 'autre'] as const,
        'role'
      )
    }
  }

  /**
   * Get all contacts for a contract
   */
  async findByContract(contractId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          user:user_id(id, name, email, phone, first_name, last_name)
        `)
        .eq('contract_id', contractId)
        .order('is_primary', { ascending: false })
        .order('role', { ascending: true })

      if (error) {
        return createErrorResponse(handleError(error, 'contract_contact:findByContract'))
      }

      return { success: true as const, data: data || [] }
    } catch (error) {
      logger.error({ error, contractId }, '❌ [CONTRACT-CONTACT-REPO] findByContract error')
      return createErrorResponse(handleError(error as Error, 'contract_contact:findByContract'))
    }
  }

  /**
   * Get contracts for a specific user (as tenant or guarantor)
   */
  async findContractsByUser(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          contract:contract_id(*)
        `)
        .eq('user_id', userId)

      if (error) {
        return createErrorResponse(handleError(error, 'contract_contact:findContractsByUser'))
      }

      return { success: true as const, data: data || [] }
    } catch (error) {
      logger.error({ error, userId }, '❌ [CONTRACT-CONTACT-REPO] findContractsByUser error')
      return createErrorResponse(handleError(error as Error, 'contract_contact:findContractsByUser'))
    }
  }

  /**
   * Set primary contact for a role in a contract
   */
  async setPrimary(contractId: string, userId: string, role: string) {
    try {
      // First, unset all primary for this role
      await this.supabase
        .from(this.tableName)
        .update({ is_primary: false })
        .eq('contract_id', contractId)
        .eq('role', role)

      // Then set the new primary
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({ is_primary: true })
        .eq('contract_id', contractId)
        .eq('user_id', userId)
        .eq('role', role)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'contract_contact:setPrimary'))
      }

      return { success: true as const, data }
    } catch (error) {
      logger.error({ error, contractId, userId, role }, '❌ [CONTRACT-CONTACT-REPO] setPrimary error')
      return createErrorResponse(handleError(error as Error, 'contract_contact:setPrimary'))
    }
  }
}

// ============================================================================
// CONTRACT DOCUMENT REPOSITORY
// ============================================================================

/**
 * Contract Document Repository
 * Manages contract documents
 */
export class ContractDocumentRepository extends BaseRepository<ContractDocument, ContractDocumentInsert, any> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'contract_documents')
  }

  protected async validate(data: ContractDocumentInsert): Promise<void> {
    if ('filename' in data && data.filename) {
      validateLength(data.filename, 1, 255, 'filename')
    }

    if ('document_type' in data && data.document_type) {
      validateEnum(
        data.document_type,
        [
          'bail', 'avenant', 'etat_des_lieux_entree', 'etat_des_lieux_sortie',
          'attestation_assurance', 'justificatif_identite', 'justificatif_revenus',
          'caution_bancaire', 'quittance', 'reglement_copropriete', 'diagnostic', 'autre'
        ] as const,
        'document_type'
      )
    }

    validateRequired(data, ['contract_id', 'team_id', 'filename', 'original_filename', 'file_size', 'mime_type', 'storage_path'])
  }

  /**
   * Get all documents for a contract
   */
  async findByContract(contractId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          uploaded_by_user:uploaded_by(id, name, email)
        `)
        .eq('contract_id', contractId)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'contract_document:findByContract'))
      }

      return { success: true as const, data: data || [] }
    } catch (error) {
      logger.error({ error, contractId }, '❌ [CONTRACT-DOC-REPO] findByContract error')
      return createErrorResponse(handleError(error as Error, 'contract_document:findByContract'))
    }
  }

  /**
   * Get documents by type
   */
  async findByType(contractId: string, documentType: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('contract_id', contractId)
        .eq('document_type', documentType)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'contract_document:findByType'))
      }

      return { success: true as const, data: data || [] }
    } catch (error) {
      logger.error({ error, contractId, documentType }, '❌ [CONTRACT-DOC-REPO] findByType error')
      return createErrorResponse(handleError(error as Error, 'contract_document:findByType'))
    }
  }

  /**
   * Soft delete a document
   */
  async softDelete(id: string, deletedBy: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'contract_document:softDelete'))
      }

      logger.info({ id, deletedBy }, '✅ [CONTRACT-DOC-REPO] Document soft deleted')
      return { success: true as const, data }
    } catch (error) {
      logger.error({ error, id }, '❌ [CONTRACT-DOC-REPO] softDelete error')
      return createErrorResponse(handleError(error as Error, 'contract_document:softDelete'))
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create browser contract repository (client components)
 */
export const createContractRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new ContractRepository(supabase)
}

/**
 * Create server contract repository (server components)
 */
export const createServerContractRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new ContractRepository(supabase)
}

/**
 * Create server action contract repository (mutations)
 */
export const createServerActionContractRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new ContractRepository(supabase)
}

/**
 * Create browser contract contact repository
 */
export const createContractContactRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new ContractContactRepository(supabase)
}

/**
 * Create server contract contact repository
 */
export const createServerContractContactRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new ContractContactRepository(supabase)
}

/**
 * Create server action contract contact repository
 */
export const createServerActionContractContactRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new ContractContactRepository(supabase)
}

/**
 * Create browser contract document repository
 */
export const createContractDocumentRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new ContractDocumentRepository(supabase)
}

/**
 * Create server contract document repository
 */
export const createServerContractDocumentRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new ContractDocumentRepository(supabase)
}

/**
 * Create server action contract document repository
 */
export const createServerActionContractDocumentRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new ContractDocumentRepository(supabase)
}
