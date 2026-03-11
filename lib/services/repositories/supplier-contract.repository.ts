/**
 * Supplier Contract Repository
 * Handles all database operations for supplier contracts using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import type {
  SupplierContract,
  SupplierContractInsert,
  SupplierContractUpdate,
  SupplierContractDocument,
  SupplierContractDocumentInsert,
  SupplierContractWithRelations,
} from '@/lib/types/supplier-contract.types'

// ============================================================================
// SUPPLIER CONTRACT REPOSITORY
// ============================================================================

export class SupplierContractRepository extends BaseRepository<
  SupplierContract,
  SupplierContractInsert,
  SupplierContractUpdate
> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'supplier_contracts')
  }

  /**
   * Bulk create supplier contracts
   */
  async createBulk(contracts: SupplierContractInsert[]): Promise<SupplierContract[]> {
    const { data, error } = await this.supabase
      .from('supplier_contracts')
      .insert(contracts)
      .select()

    if (error) {
      logger.error({ error, count: contracts.length }, 'Failed to bulk create supplier contracts')
      throw error
    }

    return data || []
  }

  /**
   * Find supplier contracts by team
   */
  async findByTeam(teamId: string): Promise<SupplierContractWithRelations[]> {
    const { data, error } = await this.supabase
      .from('supplier_contracts')
      .select(`
        *,
        supplier:users!supplier_contracts_supplier_id_fkey(id, name, first_name, last_name, company, email, phone, company_record:companies!fk_users_company(id, name)),
        building:buildings!supplier_contracts_building_id_fkey(id, name),
        lot:lots!supplier_contracts_lot_id_fkey(id, reference)
      `)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error({ error, teamId }, 'Failed to find supplier contracts by team')
      throw error
    }

    return (data || []) as unknown as SupplierContractWithRelations[]
  }

  /**
   * Find supplier contracts by building
   */
  async findByBuilding(buildingId: string): Promise<SupplierContractWithRelations[]> {
    const { data, error } = await this.supabase
      .from('supplier_contracts')
      .select(`
        *,
        supplier:users!supplier_contracts_supplier_id_fkey(id, name, first_name, last_name, company, email, phone, company_record:companies!fk_users_company(id, name)),
        documents:supplier_contract_documents(*)
      `)
      .eq('building_id', buildingId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error({ error, buildingId }, 'Failed to find supplier contracts by building')
      throw error
    }

    return (data || []) as unknown as SupplierContractWithRelations[]
  }

  /**
   * Find supplier contracts for multiple lots (batch N+1 prevention)
   */
  async findByLotIds(lotIds: string[]): Promise<SupplierContractWithRelations[]> {
    if (lotIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('supplier_contracts')
      .select(`
        *,
        supplier:users!supplier_contracts_supplier_id_fkey(id, name, first_name, last_name, company, email, phone, company_record:companies!fk_users_company(id, name)),
        documents:supplier_contract_documents(*)
      `)
      .in('lot_id', lotIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error({ error, lotIds }, 'Failed to find supplier contracts by lot IDs')
      throw error
    }

    return (data || []) as unknown as SupplierContractWithRelations[]
  }

  /**
   * Find supplier contracts by lot
   */
  async findByLot(lotId: string): Promise<SupplierContractWithRelations[]> {
    const { data, error } = await this.supabase
      .from('supplier_contracts')
      .select(`
        *,
        supplier:users!supplier_contracts_supplier_id_fkey(id, name, first_name, last_name, company, email, phone, company_record:companies!fk_users_company(id, name)),
        documents:supplier_contract_documents(*)
      `)
      .eq('lot_id', lotId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error({ error, lotId }, 'Failed to find supplier contracts by lot')
      throw error
    }

    return (data || []) as unknown as SupplierContractWithRelations[]
  }
}

// ============================================================================
// SUPPLIER CONTRACT DOCUMENT REPOSITORY
// ============================================================================

export class SupplierContractDocumentRepository extends BaseRepository<
  SupplierContractDocument,
  SupplierContractDocumentInsert,
  Partial<SupplierContractDocument>
> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'supplier_contract_documents')
  }

  /**
   * Bulk create documents
   */
  async createBulk(docs: SupplierContractDocumentInsert[]): Promise<SupplierContractDocument[]> {
    const { data, error } = await this.supabase
      .from('supplier_contract_documents')
      .insert(docs)
      .select()

    if (error) {
      logger.error({ error, count: docs.length }, 'Failed to bulk create supplier contract documents')
      throw error
    }

    return data || []
  }

  /**
   * Find documents by supplier contract
   */
  async findByContract(supplierContractId: string): Promise<SupplierContractDocument[]> {
    const { data, error } = await this.supabase
      .from('supplier_contract_documents')
      .select('*')
      .eq('supplier_contract_id', supplierContractId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error({ error, supplierContractId }, 'Failed to find supplier contract documents')
      throw error
    }

    return data || []
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const createSupplierContractRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new SupplierContractRepository(supabase)
}

export const createServerSupplierContractRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new SupplierContractRepository(supabase)
}

export const createServerActionSupplierContractRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new SupplierContractRepository(supabase)
}

export const createSupplierContractDocumentRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new SupplierContractDocumentRepository(supabase)
}

export const createServerSupplierContractDocumentRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new SupplierContractDocumentRepository(supabase)
}

export const createServerActionSupplierContractDocumentRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new SupplierContractDocumentRepository(supabase)
}
