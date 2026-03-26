'use server'

/**
 * Contract CRUD Actions
 *
 * Create, read, update, delete contracts + contact/document management.
 */

import { createServerActionContractService } from '@/lib/services/domain/contract.service'
import { createServerActionSupabaseClient } from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { logger } from '@/lib/logger'
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
  ContractStats,
  ContractStatus,
  ExpiryDecision
} from '@/lib/types/contract.types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Building tenant info (for intervention creation)
 */
export interface BuildingTenant {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  is_primary: boolean
  has_account: boolean
  lot_id: string
  lot_reference: string
}

/**
 * Result structure for building tenants grouped by lot
 */
export interface BuildingTenantsResult {
  tenants: BuildingTenant[]
  byLot: Array<{
    lotId: string
    lotReference: string
    tenants: Array<Omit<BuildingTenant, 'lot_id' | 'lot_reference'>>
  }>
  totalCount: number
  occupiedLotsCount: number
  hasActiveTenants: boolean
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

async function getAuthContext() {
  const authContext = await getServerActionAuthContextOrNull()

  if (!authContext) {
    logger.error('[CONTRACT-ACTION] No auth session found')
    return { success: false as const, error: 'Authentication required' }
  }

  return {
    success: true as const,
    user: authContext.profile,
    authUserId: authContext.user.id,
    supabase: authContext.supabase
  }
}

// ============================================================================
// CONTRACT CRUD
// ============================================================================

/**
 * Create a new contract
 */
export async function createContract(
  data: Omit<ContractInsert, 'created_by'>
): Promise<ActionResult<Contract>> {
  try {
    logger.info({ lotId: data.lot_id, teamId: data.team_id, title: data.title }, '[CONTRACT-ACTION] Creating contract')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const result = await service.create({ ...data, created_by: auth.user!.id })

    if (result.success) {
      logger.info({ contractId: result.data.id, title: result.data.title }, '[CONTRACT-ACTION] Contract created')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error creating contract')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Update a contract
 */
export async function updateContract(id: string, updates: ContractUpdate): Promise<ActionResult<Contract>> {
  try {
    logger.info({ id, updates }, '[CONTRACT-ACTION] Updating contract')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const existing = await service.getById(id)
    if (!existing) return { success: false, error: 'Contract not found' }

    const result = await service.update(id, updates)
    if (result.success) {
      logger.info({ id }, '[CONTRACT-ACTION] Contract updated')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error updating contract')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Delete a contract (soft delete)
 */
export async function deleteContract(id: string): Promise<ActionResult<null>> {
  try {
    logger.info({ id }, '[CONTRACT-ACTION] Deleting contract')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const existing = await service.getById(id)
    if (!existing) return { success: false, error: 'Contract not found' }

    const result = await service.delete(id, auth.user!.id)
    if (result.success) {
      logger.info({ id }, '[CONTRACT-ACTION] Contract deleted')
      return { success: true, data: null }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error deleting contract')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get a contract with all relations
 */
export async function getContract(id: string): Promise<ActionResult<ContractWithRelations>> {
  try {
    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const contract = await service.getById(id)
    if (!contract) return { success: false, error: 'Contract not found' }

    return { success: true, data: contract }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error getting contract')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get all contracts for a team
 */
export async function getTeamContracts(
  teamId: string,
  options?: { status?: ContractStatus; includeExpired?: boolean }
): Promise<ActionResult<ContractWithRelations[]>> {
  try {
    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const result = await service.getByTeam(teamId, options)
    if (result.success) return { success: true, data: result.data }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error getting team contracts')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// CONTRACT CONTACT ACTIONS
// ============================================================================

/**
 * Add a contact (tenant/guarantor) to a contract
 */
export async function addContractContact(data: ContractContactInsert): Promise<ActionResult<ContractContact>> {
  try {
    logger.info({ contractId: data.contract_id, userId: data.user_id, role: data.role }, '[CONTRACT-ACTION] Adding contact to contract')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const contract = await service.getById(data.contract_id)
    if (!contract) return { success: false, error: 'Contract not found' }

    const result = await service.addContact(data)
    if (result.success) {
      logger.info({ contractId: data.contract_id, contactId: result.data.id }, '[CONTRACT-ACTION] Contact added')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error adding contract contact')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Batch add contacts to a contract
 */
export async function addContractContactsBatch(
  contacts: Array<{ contract_id: string; user_id: string; role: string; is_primary: boolean }>
): Promise<ActionResult<{ successCount: number }>> {
  try {
    if (contacts.length === 0) return { success: true, data: { successCount: 0 } }

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const supabase = await createServerActionSupabaseClient()

    const contractId = contacts[0].contract_id
    const { data, error } = await supabase
      .from('contract_contacts')
      .insert(contacts.map(c => ({
        contract_id: c.contract_id,
        user_id: c.user_id,
        role: c.role,
        is_primary: c.is_primary
      })))
      .select('id')

    if (error) {
      logger.error({ error, contractId }, 'Failed to batch insert contract contacts')
      return { success: false, error: 'Echec de l\'ajout des contacts' }
    }

    logger.info({ count: data?.length || 0, contractId }, 'Batch contract contacts added')
    return { success: true, data: { successCount: data?.length || 0 } }
  } catch (error) {
    logger.error({ error }, 'Unexpected error in addContractContactsBatch')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update a contract contact
 */
export async function updateContractContact(
  id: string,
  contractId: string,
  updates: ContractContactUpdate
): Promise<ActionResult<ContractContact>> {
  try {
    logger.info({ id, updates }, '[CONTRACT-ACTION] Updating contract contact')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const contract = await service.getById(contractId)
    if (!contract) return { success: false, error: 'Contract not found' }

    const result = await service.updateContact(id, updates)
    if (result.success) {
      logger.info({ id }, '[CONTRACT-ACTION] Contract contact updated')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error updating contract contact')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Remove a contact from a contract
 */
export async function removeContractContact(id: string, contractId: string): Promise<ActionResult<null>> {
  try {
    logger.info({ id }, '[CONTRACT-ACTION] Removing contract contact')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const contract = await service.getById(contractId)
    if (!contract) return { success: false, error: 'Contract not found' }

    const result = await service.removeContact(id)
    if (result.success) {
      logger.info({ id }, '[CONTRACT-ACTION] Contract contact removed')
      return { success: true, data: null }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error removing contract contact')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// CONTRACT DOCUMENT ACTIONS
// ============================================================================

/**
 * Add a document to a contract
 */
export async function addContractDocument(data: ContractDocumentInsert): Promise<ActionResult<ContractDocument>> {
  try {
    logger.info({ contractId: data.contract_id, type: data.document_type, filename: data.filename }, '[CONTRACT-ACTION] Adding document')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const contract = await service.getById(data.contract_id)
    if (!contract) return { success: false, error: 'Contract not found' }

    const result = await service.addDocument({ ...data, uploaded_by: auth.user!.id })
    if (result.success) {
      logger.info({ contractId: data.contract_id, documentId: result.data.id }, '[CONTRACT-ACTION] Document added')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error adding contract document')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Delete a document from a contract
 */
export async function deleteContractDocument(id: string, contractId: string): Promise<ActionResult<null>> {
  try {
    logger.info({ id }, '[CONTRACT-ACTION] Deleting contract document')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const contract = await service.getById(contractId)
    if (!contract) return { success: false, error: 'Contract not found' }

    const result = await service.deleteDocument(id, auth.user!.id)
    if (result.success) {
      logger.info({ id }, '[CONTRACT-ACTION] Contract document deleted')
      return { success: true, data: null }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error deleting contract document')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get contract statistics for a team
 */
export async function getContractStats(teamId: string): Promise<ActionResult<ContractStats>> {
  try {
    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const stats = await service.getStats(teamId)
    return { success: true, data: stats }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error getting contract stats')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get contracts expiring soon
 */
export async function getExpiringContracts(
  teamId: string,
  days: number = 30
): Promise<ActionResult<ContractWithRelations[]>> {
  try {
    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const result = await service.getExpiringSoon(teamId, days)
    if (result.success) return { success: true, data: result.data }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error getting expiring contracts')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// EXPIRY DECISION
// ============================================================================

const VALID_EXPIRY_DECISIONS: ExpiryDecision[] = ['tacite_accepted', 'will_renew', 'will_terminate']

/**
 * Set expiry decision for a contract
 */
export async function setExpiryDecision(
  contractId: string,
  decision: ExpiryDecision
): Promise<ActionResult<Contract>> {
  try {
    logger.info({ contractId, decision }, '[CONTRACT-ACTION] Setting expiry decision')

    if (!VALID_EXPIRY_DECISIONS.includes(decision)) {
      return { success: false, error: `Decision invalide: ${decision}` }
    }

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const existing = await service.getById(contractId)
    if (!existing) return { success: false, error: 'Contrat introuvable' }

    const updatedMetadata = {
      ...(existing.metadata || {}),
      expiry_decision: {
        decision,
        decided_at: new Date().toISOString(),
        decided_by: auth.user!.id
      }
    }

    const result = await service.update(contractId, { metadata: updatedMetadata })
    if (result.success) {
      logger.info({ contractId, decision, decidedBy: auth.user!.id }, '[CONTRACT-ACTION] Expiry decision set')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error setting expiry decision')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
