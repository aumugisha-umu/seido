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
  ContractContactRole,
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
   * - Si start_date > aujourd'hui → 'a_venir' (contrat futur programmé)
   * - Sinon → 'actif' (contrat en cours)
   *
   * Note: "brouillon" n'est plus attribué automatiquement.
   * Le statut "brouillon" est réservé aux contrats explicitement incomplets.
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
    if (start > today) {
      return 'a_venir' // Contrat futur programmé
    }
    return 'actif' // Contrat en cours
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
    // Validate dates first
    this.validateDates(data.start_date, data.duration_months)

    // Calculate end_date for overlap validation
    const startDate = data.start_date
    const endDate = this.calculateEndDate(startDate, data.duration_months)

    // Check for overlapping contracts on this lot (allows multiple contracts if dates don't overlap)
    const overlapResult = await this.contractRepository.hasOverlappingContract(
      data.lot_id,
      startDate,
      endDate
    )

    if (isSuccessResponse(overlapResult) && overlapResult.data) {
      throw new ConflictException(
        'Un contrat existe déjà pour ce lot sur cette période. Les dates de début et fin ne peuvent pas chevaucher un contrat existant.',
        'contracts',
        'date_overlap',
        data.lot_id
      )
    }

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

    // Check for overlapping contracts on this lot (excludes current contract)
    const overlapResult = await this.contractRepository.hasOverlappingContract(
      existing.data.lot_id,
      existing.data.start_date,
      existing.data.end_date,
      id // Exclude the contract being activated
    )

    if (isSuccessResponse(overlapResult) && overlapResult.data) {
      throw new ConflictException(
        'Un autre contrat existe sur ce lot pour la même période. Veuillez modifier les dates ou résilier le contrat existant.',
        'contracts',
        'date_overlap',
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
  // ACTIVE TENANTS BY LOT
  // ==========================================================================

  /**
   * Récupère les locataires des contrats ACTIFS d'un lot
   *
   * @param lotId - ID du lot
   * @returns Liste des locataires + indicateur si le lot est occupé
   *
   * Note: Seuls les contrats avec status='actif' sont considérés.
   * Les contrats 'a_venir' ne comptent pas (bail pas encore commencé).
   */
  async getActiveTenantsByLot(lotId: string): Promise<{
    success: true
    data: {
      tenants: Array<{
        id: string
        user_id: string
        name: string
        email: string | null
        phone: string | null
        role: ContractContactRole
        contract_id: string
        contract_title: string
        is_primary: boolean
      }>
      hasActiveTenants: boolean
    }
  } | { success: false; error: { code: string; message: string } }> {
    try {
      // Get contracts for this lot - only active status
      const contractsResult = await this.contractRepository.findByLot(lotId, {
        includeExpired: false
      })

      if (isErrorResponse(contractsResult)) {
        logger.error({ lotId, error: contractsResult.error }, 'Failed to get contracts for lot')
        return { success: false, error: contractsResult.error }
      }

      // Filter to only 'actif' status (not 'a_venir', not 'brouillon', etc.)
      const activeContracts = (contractsResult.data || []).filter(
        contract => contract.status === 'actif'
      )

      // Extract tenants from active contracts
      const tenants: Array<{
        id: string
        user_id: string
        name: string
        email: string | null
        phone: string | null
        role: ContractContactRole
        contract_id: string
        contract_title: string
        is_primary: boolean
      }> = []

      // Track user_ids to avoid duplicates (same tenant on multiple contracts)
      const seenUserIds = new Set<string>()

      for (const contract of activeContracts) {
        if (contract.contacts && Array.isArray(contract.contacts)) {
          for (const contact of contract.contacts) {
            // Only include tenants (locataire, colocataire)
            if (contact.role === 'locataire' || contact.role === 'colocataire') {
              // Avoid duplicates - prefer primary tenant
              if (seenUserIds.has(contact.user_id)) {
                // If this one is primary and existing one isn't, replace
                const existingIndex = tenants.findIndex(t => t.user_id === contact.user_id)
                if (existingIndex >= 0 && contact.is_primary && !tenants[existingIndex].is_primary) {
                  tenants[existingIndex] = {
                    id: contact.id,
                    user_id: contact.user_id,
                    name: contact.user?.name || 'Unknown',
                    email: contact.user?.email || null,
                    phone: (contact.user as any)?.phone || null,
                    role: contact.role,
                    contract_id: contract.id,
                    contract_title: contract.title,
                    is_primary: contact.is_primary
                  }
                }
                continue
              }

              seenUserIds.add(contact.user_id)
              tenants.push({
                id: contact.id,
                user_id: contact.user_id,
                name: contact.user?.name || 'Unknown',
                email: contact.user?.email || null,
                phone: (contact.user as any)?.phone || null,
                role: contact.role,
                contract_id: contract.id,
                contract_title: contract.title,
                is_primary: contact.is_primary
              })
            }
          }
        }
      }

      // Sort: primary tenants first, then by name
      tenants.sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      logger.info({
        lotId,
        activeContractsCount: activeContracts.length,
        tenantsCount: tenants.length
      }, 'Active tenants retrieved for lot')

      return {
        success: true,
        data: {
          tenants,
          hasActiveTenants: tenants.length > 0
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ lotId, error: errorMessage }, 'Error getting active tenants for lot')
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: errorMessage }
      }
    }
  }

  /**
   * Get all active tenants from all lots in a building
   * Groups tenants by lot for UI display
   *
   * @param buildingId - Building ID
   * @returns Tenants grouped by lot with totals
   */
  async getActiveTenantsByBuilding(buildingId: string): Promise<{
    success: true
    data: {
      tenants: Array<{
        id: string
        user_id: string
        name: string
        email: string | null
        phone: string | null
        role: ContractContactRole
        is_primary: boolean
        lot_id: string
        lot_reference: string
      }>
      byLot: Array<{
        lotId: string
        lotReference: string
        tenants: Array<{
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          role: ContractContactRole
          is_primary: boolean
        }>
      }>
      totalCount: number
      occupiedLotsCount: number
      hasActiveTenants: boolean
    }
  } | { success: false; error: { code: string; message: string } }> {
    try {
      // Get all active contracts for lots in this building
      const contractsResult = await this.contractRepository.findActiveByBuilding(buildingId)

      if (isErrorResponse(contractsResult)) {
        logger.error({ buildingId, error: contractsResult.error }, 'Failed to get contracts for building')
        return { success: false, error: contractsResult.error }
      }

      const activeContracts = contractsResult.data || []

      // Extract tenants grouped by lot
      const tenantsByLot = new Map<string, {
        lotId: string
        lotReference: string
        tenants: Array<{
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          role: ContractContactRole
          is_primary: boolean
        }>
      }>()

      // All tenants flat list (with lot info)
      const allTenants: Array<{
        id: string
        user_id: string
        name: string
        email: string | null
        phone: string | null
        role: ContractContactRole
        is_primary: boolean
        lot_id: string
        lot_reference: string
      }> = []

      // Track user_ids per lot to avoid duplicates within same lot
      const seenUserIdsByLot = new Map<string, Set<string>>()

      for (const contract of activeContracts) {
        const lot = contract.lot as { id: string; reference: string } | null
        if (!lot) continue

        const lotId = lot.id
        const lotReference = lot.reference || `Lot ${lotId.slice(0, 8)}`

        // Initialize lot group if not exists
        if (!tenantsByLot.has(lotId)) {
          tenantsByLot.set(lotId, {
            lotId,
            lotReference,
            tenants: []
          })
          seenUserIdsByLot.set(lotId, new Set())
        }

        const lotGroup = tenantsByLot.get(lotId)!
        const seenInLot = seenUserIdsByLot.get(lotId)!

        if (contract.contacts && Array.isArray(contract.contacts)) {
          for (const contact of contract.contacts) {
            // Only include tenants (locataire, colocataire)
            if (contact.role === 'locataire' || contact.role === 'colocataire') {
              // Avoid duplicates within same lot
              if (seenInLot.has(contact.user_id)) continue
              seenInLot.add(contact.user_id)

              const tenantData = {
                id: contact.id,
                user_id: contact.user_id,
                name: contact.user?.name || 'Unknown',
                email: contact.user?.email || null,
                phone: (contact.user as any)?.phone || null,
                role: contact.role,
                is_primary: contact.is_primary
              }

              lotGroup.tenants.push(tenantData)
              allTenants.push({
                ...tenantData,
                lot_id: lotId,
                lot_reference: lotReference
              })
            }
          }
        }
      }

      // Sort tenants within each lot: primary first, then by name
      for (const lotGroup of tenantsByLot.values()) {
        lotGroup.tenants.sort((a, b) => {
          if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      }

      // Convert to array and sort by lot reference
      const byLot = Array.from(tenantsByLot.values()).sort((a, b) =>
        a.lotReference.localeCompare(b.lotReference)
      )

      // Sort all tenants: by lot reference, then primary, then name
      allTenants.sort((a, b) => {
        const lotCompare = a.lot_reference.localeCompare(b.lot_reference)
        if (lotCompare !== 0) return lotCompare
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      logger.info({
        buildingId,
        activeContractsCount: activeContracts.length,
        occupiedLotsCount: byLot.length,
        totalTenantsCount: allTenants.length
      }, 'Active tenants retrieved for building')

      return {
        success: true,
        data: {
          tenants: allTenants,
          byLot,
          totalCount: allTenants.length,
          occupiedLotsCount: byLot.length,
          hasActiveTenants: allTenants.length > 0
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ buildingId, error: errorMessage }, 'Error getting active tenants for building')
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: errorMessage }
      }
    }
  }

  /**
   * Récupère la liste des lot_id qui sont occupés (ont un contrat actif avec locataire)
   * Optimisé pour éviter N+1 queries dans la liste des biens
   *
   * @param teamId - ID de l'équipe
   * @returns Set des lot_id occupés
   */
  async getOccupiedLotIdsByTeam(teamId: string): Promise<{
    success: true
    data: Set<string>
  } | { success: false; error: { code: string; message: string } }> {
    try {
      // Get all contracts for this team with status 'actif' only
      const contractsResult = await this.contractRepository.findByTeam(teamId, {
        includeExpired: false
      })

      if (isErrorResponse(contractsResult)) {
        logger.error({ teamId, error: contractsResult.error }, 'Failed to get contracts for team')
        return { success: false, error: contractsResult.error }
      }

      // Filter to only 'actif' contracts and extract lot_ids with tenants
      const occupiedLotIds = new Set<string>()

      for (const contract of contractsResult.data || []) {
        // Only 'actif' contracts count (not 'a_venir', not 'brouillon', etc.)
        if (contract.status !== 'actif') continue

        // Check if contract has at least one tenant
        const hasTenant = contract.contacts?.some(
          (c: { role: ContractContactRole }) => c.role === 'locataire' || c.role === 'colocataire'
        )

        if (hasTenant && contract.lot_id) {
          occupiedLotIds.add(contract.lot_id)
        }
      }

      logger.info({
        teamId,
        occupiedLotsCount: occupiedLotIds.size
      }, 'Occupied lot IDs retrieved for team')

      return { success: true, data: occupiedLotIds }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ teamId, error: errorMessage }, 'Error getting occupied lot IDs for team')
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: errorMessage }
      }
    }
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
   * Calcule la date de fin à partir de la date de début et durée en mois.
   * Reproduit le calcul PostgreSQL: start_date + make_interval(months => duration_months)
   *
   * @param startDate - Date de début (format YYYY-MM-DD)
   * @param durationMonths - Durée en mois
   * @returns Date de fin au format YYYY-MM-DD
   */
  private calculateEndDate(startDate: string, durationMonths: number): string {
    const start = new Date(startDate)
    start.setMonth(start.getMonth() + durationMonths)
    return start.toISOString().split('T')[0]
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
