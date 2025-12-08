/**
 * Contract Domain Service - Phase 4
 *
 * Business logic for contract/lease management.
 * Handles validation, calculations, and workflows.
 *
 * Architecture:
 * - Server Actions → ContractService (this) → ContractRepository → Supabase
 */

import type {
  ContractRepository,
  ContractContactRepository,
  ContractDocumentRepository
} from '../repositories/contract.repository'
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
  ContractDocumentUpdate,
  ContractStatus,
  ContractStats,
  ContractWithCalculations,
  ValidatedContractData
} from '@/lib/types/contract.types'
import { logger } from '@/lib/logger'
import {
  ValidationException,
  ConflictException,
  NotFoundException
} from '../core/error-handler'
import { isSuccessResponse, isErrorResponse } from '../core/type-guards'

// ============================================================================
// TYPES
// ============================================================================

interface ContractServiceDependencies {
  contractRepository: ContractRepository
  contactRepository: ContractContactRepository
  documentRepository: ContractDocumentRepository
}

// ============================================================================
// CONTRACT SERVICE
// ============================================================================

/**
 * Contract Domain Service
 * Handles business logic for contract management
 */
export class ContractService {
  constructor(
    private contractRepository: ContractRepository,
    private contactRepository: ContractContactRepository,
    private documentRepository: ContractDocumentRepository
  ) {}

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Détermine le statut du contrat basé sur les dates
   * - Si end_date < aujourd'hui → 'expire'
   * - Si start_date <= aujourd'hui → 'actif'
   * - Sinon → 'brouillon' (contrat futur)
   */
  private determineStatusFromDates(startDate: string, durationMonths: number): ContractStatus {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normaliser à minuit

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    // Calculer end_date (start + duration_months)
    const end = new Date(start)
    end.setMonth(end.getMonth() + durationMonths)
    end.setHours(0, 0, 0, 0)

    if (end < today) {
      return 'expire'
    }
    if (start <= today) {
      return 'actif'
    }
    return 'brouillon' // Contrat futur
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Get contract by ID with all relations
   */
  async getById(id: string): Promise<ContractWithRelations | null> {
    const result = await this.contractRepository.findByIdWithRelations(id)
    if (isErrorResponse(result)) {
      logger.error({ id, error: result.error }, 'Failed to get contract')
      return null
    }
    return result.data
  }

  /**
   * Get contract by ID with all relations (ServiceResult format)
   */
  async getContractWithRelations(id: string): Promise<{ success: true; data: ContractWithRelations } | { success: false; error: { code: string; message: string } }> {
    const result = await this.contractRepository.findByIdWithRelations(id)
    if (isErrorResponse(result)) {
      logger.error({ id, error: result.error }, 'Failed to get contract with relations')
      return { success: false, error: result.error }
    }
    return { success: true, data: result.data }
  }

  /**
   * Get all contracts for a team
   */
  async getByTeam(teamId: string, options?: { status?: ContractStatus; includeExpired?: boolean }) {
    const result = await this.contractRepository.findByTeam(teamId, options)
    if (isErrorResponse(result)) {
      logger.error({ teamId, error: result.error }, 'Failed to get team contracts')
      return { success: false as const, error: result.error }
    }
    return { success: true as const, data: result.data }
  }

  /**
   * Get contracts for a specific lot
   */
  async getByLot(lotId: string, options?: { includeExpired?: boolean }) {
    const result = await this.contractRepository.findByLot(lotId, options)
    if (isErrorResponse(result)) {
      logger.error({ lotId, error: result.error }, 'Failed to get lot contracts')
      return { success: false as const, error: result.error }
    }
    return { success: true as const, data: result.data }
  }

  /**
   * Get active contract for a lot (should be max 1)
   */
  async getActiveByLot(lotId: string) {
    const result = await this.contractRepository.findActiveByLot(lotId)
    if (isErrorResponse(result)) {
      return { success: false as const, error: result.error }
    }
    return { success: true as const, data: result.data }
  }

  /**
   * Create a new contract with validation
   */
  async create(data: ContractInsert): Promise<{ success: true; data: Contract } | { success: false; error: { code: string; message: string } }> {
    // Validate no active contract exists for this lot
    const hasActiveResult = await this.contractRepository.hasActiveContract(data.lot_id)
    if (isSuccessResponse(hasActiveResult) && hasActiveResult.data) {
      throw new ConflictException(
        'Un contrat actif existe déjà pour ce lot. Veuillez d\'abord clôturer ou résilier le contrat existant.',
        'contracts',
        'lot_id',
        data.lot_id
      )
    }

    // Validate dates
    this.validateDates(data.start_date, data.duration_months)

    // Déterminer le statut automatiquement basé sur les dates si non spécifié
    const autoStatus = this.determineStatusFromDates(
      data.start_date,
      data.duration_months || 12
    )

    // Set defaults
    const processedData: ContractInsert = {
      ...data,
      status: data.status || autoStatus, // Auto-calcul basé sur les dates
      contract_type: data.contract_type || 'bail_habitation',
      payment_frequency: data.payment_frequency || 'mensuel',
      payment_frequency_value: data.payment_frequency_value || 1,
      charges_amount: data.charges_amount || 0,
      guarantee_type: data.guarantee_type || 'pas_de_garantie',
      metadata: data.metadata || {}
    }

    const result = await this.contractRepository.create(processedData)

    if (isSuccessResponse(result)) {
      logger.info({
        contractId: result.data.id,
        lotId: data.lot_id,
        teamId: data.team_id
      }, 'Contract created successfully')
    }

    return result
  }

  /**
   * Update a contract
   */
  async update(id: string, updates: ContractUpdate): Promise<{ success: true; data: Contract } | { success: false; error: { code: string; message: string } }> {
    // Check contract exists
    const existing = await this.contractRepository.findById(id)
    if (isErrorResponse(existing)) {
      throw new NotFoundException('Contrat', 'contracts', id)
    }

    // Validate date changes if provided
    if (updates.start_date || updates.duration_months) {
      const startDate = updates.start_date || existing.data.start_date
      const duration = updates.duration_months || existing.data.duration_months
      this.validateDates(startDate, duration)
    }

    // Prevent modifying terminated contracts
    if (existing.data.status === 'resilie' || existing.data.status === 'expire') {
      if (updates.status !== 'renouvele') {
        throw new ValidationException(
          'Impossible de modifier un contrat résilié ou expiré',
          'status',
          existing.data.status
        )
      }
    }

    const result = await this.contractRepository.update(id, updates)

    if (isSuccessResponse(result)) {
      logger.info({ contractId: id, updates }, 'Contract updated successfully')
    }

    return result
  }

  /**
   * Soft delete a contract
   */
  async delete(id: string, deletedBy: string): Promise<{ success: true; data: null } | { success: false; error: { code: string; message: string } }> {
    // Check contract exists
    const existing = await this.contractRepository.findById(id)
    if (isErrorResponse(existing)) {
      throw new NotFoundException('Contrat', 'contracts', id)
    }

    // Prevent deleting active contracts
    if (existing.data.status === 'actif') {
      throw new ValidationException(
        'Impossible de supprimer un contrat actif. Veuillez d\'abord le résilier.',
        'status',
        existing.data.status
      )
    }

    const result = await this.contractRepository.softDelete(id, deletedBy)

    if (result.success) {
      logger.info({ contractId: id, deletedBy }, 'Contract deleted successfully')
    }

    return result
  }

  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================

  /**
   * Activate a draft contract
   */
  async activate(id: string): Promise<{ success: true; data: Contract } | { success: false; error: { code: string; message: string } }> {
    const existing = await this.contractRepository.findByIdWithRelations(id)
    if (isErrorResponse(existing)) {
      throw new NotFoundException('Contrat', 'contracts', id)
    }

    if (existing.data.status !== 'brouillon') {
      throw new ValidationException(
        'Seul un contrat en brouillon peut être activé',
        'status',
        existing.data.status
      )
    }

    // Validate contract has required data
    this.validateContractForActivation(existing.data)

    // Check no other active contract on this lot
    const hasActiveResult = await this.contractRepository.hasActiveContract(existing.data.lot_id)
    if (isSuccessResponse(hasActiveResult) && hasActiveResult.data) {
      throw new ConflictException(
        'Un autre contrat actif existe déjà pour ce lot',
        'contracts',
        'lot_id',
        existing.data.lot_id
      )
    }

    return this.contractRepository.update(id, {
      status: 'actif',
      signed_date: new Date().toISOString().split('T')[0]
    })
  }

  /**
   * Terminate (résilier) a contract
   */
  async terminate(id: string, reason?: string): Promise<{ success: true; data: Contract } | { success: false; error: { code: string; message: string } }> {
    const existing = await this.contractRepository.findById(id)
    if (isErrorResponse(existing)) {
      throw new NotFoundException('Contrat', 'contracts', id)
    }

    if (existing.data.status !== 'actif') {
      throw new ValidationException(
        'Seul un contrat actif peut être résilié',
        'status',
        existing.data.status
      )
    }

    return this.contractRepository.update(id, {
      status: 'resilie',
      comments: reason
        ? `${existing.data.comments || ''}\n---\nMotif de résiliation: ${reason}`
        : existing.data.comments
    })
  }

  /**
   * Renew a contract (creates new contract linked to old one)
   */
  async renew(id: string, newData: Partial<ContractInsert>): Promise<{ success: true; data: Contract } | { success: false; error: { code: string; message: string } }> {
    const existing = await this.contractRepository.findByIdWithRelations(id)
    if (isErrorResponse(existing)) {
      throw new NotFoundException('Contrat', 'contracts', id)
    }

    const oldContract = existing.data

    // Calculate new start date (day after old end date)
    const oldEndDate = new Date(oldContract.end_date)
    const newStartDate = new Date(oldEndDate)
    newStartDate.setDate(newStartDate.getDate() + 1)

    // Create new contract
    const newContractData: ContractInsert = {
      team_id: oldContract.team_id,
      lot_id: oldContract.lot_id,
      created_by: newData.created_by || oldContract.created_by,
      title: newData.title || `${oldContract.title} (Renouvelé)`,
      contract_type: newData.contract_type || oldContract.contract_type,
      start_date: newData.start_date || newStartDate.toISOString().split('T')[0],
      duration_months: newData.duration_months || oldContract.duration_months,
      payment_frequency: newData.payment_frequency || oldContract.payment_frequency,
      payment_frequency_value: newData.payment_frequency_value || oldContract.payment_frequency_value,
      rent_amount: newData.rent_amount || oldContract.rent_amount,
      charges_amount: newData.charges_amount ?? oldContract.charges_amount,
      guarantee_type: newData.guarantee_type || oldContract.guarantee_type,
      guarantee_amount: newData.guarantee_amount ?? oldContract.guarantee_amount,
      guarantee_notes: newData.guarantee_notes || oldContract.guarantee_notes,
      renewed_from_id: id
    }

    // Mark old contract as renewed
    await this.contractRepository.update(id, { status: 'renouvele' })

    // Create new contract
    const newContractResult = await this.contractRepository.create(newContractData)

    if (isSuccessResponse(newContractResult)) {
      // Link old contract to new one
      await this.contractRepository.update(id, { renewed_to_id: newContractResult.data.id })

      // Copy contacts to new contract
      if (oldContract.contacts && oldContract.contacts.length > 0) {
        for (const contact of oldContract.contacts) {
          await this.contactRepository.create({
            contract_id: newContractResult.data.id,
            user_id: contact.user.id,
            role: contact.role,
            is_primary: contact.is_primary,
            notes: contact.notes
          })
        }
      }

      logger.info({
        oldContractId: id,
        newContractId: newContractResult.data.id
      }, 'Contract renewed successfully')
    }

    return newContractResult
  }

  // ==========================================================================
  // CONTACT MANAGEMENT
  // ==========================================================================

  /**
   * Add a contact (tenant/guarantor) to a contract
   */
  async addContact(data: ContractContactInsert): Promise<{ success: true; data: ContractContact } | { success: false; error: { code: string; message: string } }> {
    // Verify contract exists
    const contract = await this.contractRepository.findById(data.contract_id)
    if (isErrorResponse(contract)) {
      throw new NotFoundException('Contrat', 'contracts', data.contract_id)
    }

    // If setting as primary, ensure only one primary per role
    if (data.is_primary) {
      const existingContacts = await this.contactRepository.findByContract(data.contract_id)
      if (isSuccessResponse(existingContacts)) {
        const primaryExists = existingContacts.data.some(
          c => c.role === data.role && c.is_primary
        )
        if (primaryExists) {
          // Update existing primary to non-primary
          const existingPrimary = existingContacts.data.find(
            c => c.role === data.role && c.is_primary
          )
          if (existingPrimary) {
            await this.contactRepository.update(existingPrimary.id, { is_primary: false })
          }
        }
      }
    }

    return this.contactRepository.create(data)
  }

  /**
   * Update a contract contact
   */
  async updateContact(id: string, updates: ContractContactUpdate) {
    return this.contactRepository.update(id, updates)
  }

  /**
   * Remove a contact from a contract
   */
  async removeContact(id: string) {
    return this.contactRepository.delete(id)
  }

  /**
   * Get all contacts for a contract
   */
  async getContacts(contractId: string) {
    return this.contactRepository.findByContract(contractId)
  }

  // ==========================================================================
  // DOCUMENT MANAGEMENT
  // ==========================================================================

  /**
   * Add a document to a contract
   */
  async addDocument(data: ContractDocumentInsert): Promise<{ success: true; data: ContractDocument } | { success: false; error: { code: string; message: string } }> {
    // Verify contract exists
    const contract = await this.contractRepository.findById(data.contract_id)
    if (isErrorResponse(contract)) {
      throw new NotFoundException('Contrat', 'contracts', data.contract_id)
    }

    return this.documentRepository.create(data)
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, updates: ContractDocumentUpdate) {
    return this.documentRepository.update(id, updates)
  }

  /**
   * Soft delete a document
   */
  async deleteDocument(id: string, deletedBy: string) {
    return this.documentRepository.softDelete(id, deletedBy)
  }

  /**
   * Get all documents for a contract
   */
  async getDocuments(contractId: string) {
    return this.documentRepository.findByContract(contractId)
  }

  // ==========================================================================
  // EXPIRY MANAGEMENT
  // ==========================================================================

  /**
   * Get contracts expiring within X days
   */
  async getExpiringSoon(teamId: string, days: number = 30) {
    const result = await this.contractRepository.findExpiringSoon(teamId, days)
    if (isErrorResponse(result)) {
      return { success: false as const, error: result.error }
    }

    // Enrich with calculations
    const enriched = result.data.map(contract => this.enrichWithCalculations(contract))
    return { success: true as const, data: enriched }
  }

  /**
   * Get contracts expiring this month
   */
  async getExpiringThisMonth(teamId: string) {
    const today = new Date()
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const daysUntilEndOfMonth = Math.ceil(
      (lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    return this.getExpiringSoon(teamId, daysUntilEndOfMonth)
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get contract statistics for a team
   */
  async getStats(teamId: string): Promise<ContractStats> {
    const result = await this.contractRepository.getStats(teamId)

    if (isErrorResponse(result)) {
      logger.error({ teamId, error: result.error }, 'Failed to get contract stats')
      return {
        totalActive: 0,
        expiringThisMonth: 0,
        expiringNext30Days: 0,
        expired: 0,
        totalRentMonthly: 0,
        averageRent: 0,
        totalLots: 0,
        totalTenants: 0
      }
    }

    return result.data
  }

  // ==========================================================================
  // CALCULATIONS & HELPERS
  // ==========================================================================

  /**
   * Calculate total monthly cost (rent + charges)
   */
  calculateMonthlyTotal(rentAmount: number, chargesAmount: number): number {
    return rentAmount + (chargesAmount || 0)
  }

  /**
   * Calculate days remaining until contract expiry
   */
  calculateDaysRemaining(endDate: string): number {
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    const diff = end.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  /**
   * Enrich contract with calculated fields
   */
  enrichWithCalculations(contract: ContractWithRelations): ContractWithCalculations {
    const daysRemaining = this.calculateDaysRemaining(contract.end_date)
    return {
      ...contract,
      totalMonthly: this.calculateMonthlyTotal(contract.rent_amount, contract.charges_amount),
      daysRemaining,
      isExpiringSoon: daysRemaining <= 30 && daysRemaining > 0,
      isExpired: daysRemaining <= 0
    }
  }

  // ==========================================================================
  // PRIVATE VALIDATION METHODS
  // ==========================================================================

  /**
   * Validate contract dates
   */
  private validateDates(startDate: string, durationMonths: number): void {
    const start = new Date(startDate)
    if (isNaN(start.getTime())) {
      throw new ValidationException(
        'La date de début est invalide',
        'start_date',
        startDate
      )
    }

    if (durationMonths <= 0 || durationMonths > 120) {
      throw new ValidationException(
        'La durée doit être entre 1 et 120 mois',
        'duration_months',
        durationMonths
      )
    }
  }

  /**
   * Validate contract has required data for activation
   */
  private validateContractForActivation(contract: ContractWithRelations): void {
    const errors: string[] = []

    if (!contract.lot_id) {
      errors.push('Un lot doit être associé au contrat')
    }

    if (contract.rent_amount <= 0) {
      errors.push('Le montant du loyer doit être supérieur à 0')
    }

    // Check at least one locataire
    const hasLocataire = contract.contacts?.some(c => c.role === 'locataire')
    if (!hasLocataire) {
      errors.push('Au moins un locataire doit être associé au contrat')
    }

    if (errors.length > 0) {
      throw new ValidationException(
        `Le contrat ne peut pas être activé:\n- ${errors.join('\n- ')}`,
        'activation',
        errors
      )
    }
  }

  /**
   * Determine recipients for intervention of a locataire
   * Used internally to avoid duplicate private method references
   */
  private determineInterventionRecipients(
    intervention: any,
    excludeUserId: string
  ): { userId: string; isPersonal: boolean }[] {
    // This would be implemented if we need to notify about contract-related interventions
    return []
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

import {
  createContractRepository,
  createContractContactRepository,
  createContractDocumentRepository,
  createServerContractRepository,
  createServerContractContactRepository,
  createServerContractDocumentRepository,
  createServerActionContractRepository,
  createServerActionContractContactRepository,
  createServerActionContractDocumentRepository
} from '../repositories/contract.repository'

/**
 * Create Contract Service for Browser (READ-ONLY)
 */
export const createContractService = () => {
  const contractRepo = createContractRepository()
  const contactRepo = createContractContactRepository()
  const documentRepo = createContractDocumentRepository()
  return new ContractService(contractRepo, contactRepo, documentRepo)
}

/**
 * Create Contract Service for Server Components (READ-ONLY)
 */
export const createServerContractService = async () => {
  const [contractRepo, contactRepo, documentRepo] = await Promise.all([
    createServerContractRepository(),
    createServerContractContactRepository(),
    createServerContractDocumentRepository()
  ])
  return new ContractService(contractRepo, contactRepo, documentRepo)
}

/**
 * Create Contract Service for Server Actions (READ-WRITE)
 * ✅ Uses createServerAction* factories which can modify cookies
 * ✅ Maintains auth session for RLS policies
 */
export const createServerActionContractService = async () => {
  const [contractRepo, contactRepo, documentRepo] = await Promise.all([
    createServerActionContractRepository(),
    createServerActionContractContactRepository(),
    createServerActionContractDocumentRepository()
  ])
  return new ContractService(contractRepo, contactRepo, documentRepo)
}
