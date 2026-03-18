/**
 * Supplier Contract Domain Service
 *
 * Business logic for supplier contract management.
 * Architecture: Server Actions → SupplierContractService → Repository → Supabase
 */

import type {
  SupplierContractRepository,
  SupplierContractDocumentRepository
} from '../repositories/supplier-contract.repository'
import {
  createSupplierContractRepository,
  createSupplierContractDocumentRepository,
  createServerSupplierContractRepository,
  createServerSupplierContractDocumentRepository,
  createServerActionSupplierContractRepository,
  createServerActionSupplierContractDocumentRepository,
} from '../repositories/supplier-contract.repository'
import type {
  SupplierContractInsert,
  SupplierContract,
  SupplierContractWithRelations,
  SupplierContractDocumentInsert,
  SupplierContractDocument,
} from '@/lib/types/supplier-contract.types'

// ============================================================================
// SERVICE
// ============================================================================

export class SupplierContractService {
  constructor(
    private contractRepo: SupplierContractRepository,
    private documentRepo: SupplierContractDocumentRepository
  ) {}

  /**
   * Bulk create supplier contracts
   */
  async createBulk(contracts: SupplierContractInsert[]): Promise<SupplierContract[]> {
    return this.contractRepo.createBulk(contracts)
  }

  /**
   * Get supplier contracts by team
   */
  async getByTeam(teamId: string): Promise<SupplierContractWithRelations[]> {
    return this.contractRepo.findByTeam(teamId)
  }

  /**
   * Get supplier contracts by building
   */
  async getByBuilding(buildingId: string): Promise<SupplierContractWithRelations[]> {
    return this.contractRepo.findByBuilding(buildingId)
  }

  /**
   * Get supplier contracts by lot
   */
  async getByLot(lotId: string): Promise<SupplierContractWithRelations[]> {
    return this.contractRepo.findByLot(lotId)
  }

  /**
   * Get supplier contracts for multiple lots (batch query for building page)
   */
  async getByLotIds(lotIds: string[]): Promise<SupplierContractWithRelations[]> {
    return this.contractRepo.findByLotIds(lotIds)
  }

  /**
   * Bulk create documents for a supplier contract
   */
  async createDocuments(docs: SupplierContractDocumentInsert[]): Promise<SupplierContractDocument[]> {
    return this.documentRepo.createBulk(docs)
  }

  /**
   * Get documents by supplier contract
   */
  async getDocumentsByContract(supplierContractId: string): Promise<SupplierContractDocument[]> {
    return this.documentRepo.findByContract(supplierContractId)
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const createSupplierContractService = () => {
  const contractRepo = createSupplierContractRepository()
  const documentRepo = createSupplierContractDocumentRepository()
  return new SupplierContractService(contractRepo, documentRepo)
}

export const createServerSupplierContractService = async () => {
  const [contractRepo, documentRepo] = await Promise.all([
    createServerSupplierContractRepository(),
    createServerSupplierContractDocumentRepository()
  ])
  return new SupplierContractService(contractRepo, documentRepo)
}

export const createServerActionSupplierContractService = async () => {
  const [contractRepo, documentRepo] = await Promise.all([
    createServerActionSupplierContractRepository(),
    createServerActionSupplierContractDocumentRepository()
  ])
  return new SupplierContractService(contractRepo, documentRepo)
}
