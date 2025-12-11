'use server'

/**
 * Contract Server Actions - Phase 4
 *
 * Server-side operations for contract/lease management with proper auth context.
 * Architecture: Server Actions → ContractService → ContractRepository → Supabase
 */

import { createServerActionContractService } from '@/lib/services/domain/contract.service'
import { createServerActionSupabaseClient } from '@/lib/services'
import { revalidatePath, revalidateTag } from 'next/cache'
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
  ContractStatus
} from '@/lib/types/contract.types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Get authenticated user context for server actions
 */
async function getAuthContext() {
  const supabase = await createServerActionSupabaseClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (!session || sessionError) {
    logger.error('❌ [CONTRACT-ACTION] No auth session found')
    return { success: false, error: 'Authentication required' }
  }

  // Get database user
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, team_id')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!userData || userError) {
    logger.error('❌ [CONTRACT-ACTION] User profile not found')
    return { success: false, error: 'User profile not found' }
  }

  return {
    success: true,
    user: userData,
    authUserId: session.user.id,
    supabase
  }
}

/**
 * Verify user has access to a team
 */
async function verifyTeamAccess(userId: string, teamId: string) {
  const supabase = await createServerActionSupabaseClient()

  const { data: membership, error } = await supabase
    .from('team_members')
    .select('id, role')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .is('left_at', null)
    .maybeSingle()

  if (!membership || error) {
    return { success: false, error: 'User is not a member of this team' }
  }

  return { success: true, role: membership.role }
}

// ============================================================================
// CONTRACT CRUD ACTIONS
// ============================================================================

/**
 * Create a new contract
 */
export async function createContract(
  data: Omit<ContractInsert, 'created_by'>
): Promise<ActionResult<Contract>> {
  try {
    logger.info('📝 [CONTRACT-ACTION] Creating contract:', {
      lotId: data.lot_id,
      teamId: data.team_id,
      title: data.title
    })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, data.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Create contract
    const service = await createServerActionContractService()
    const result = await service.create({
      ...data,
      created_by: auth.user!.id
    })

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract created:', {
        contractId: result.data.id,
        title: result.data.title
      })

      // Invalidate caches
      revalidateTag('contracts')
      revalidateTag(`contracts-team-${data.team_id}`)
      revalidateTag(`contracts-lot-${data.lot_id}`)
      revalidatePath('/gestionnaire/contrats')

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error creating contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update a contract
 */
export async function updateContract(
  id: string,
  updates: ContractUpdate
): Promise<ActionResult<Contract>> {
  try {
    logger.info('📝 [CONTRACT-ACTION] Updating contract:', { id, updates })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const existing = await service.getById(id)

    if (!existing) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, existing.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Update contract
    const result = await service.update(id, updates)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract updated:', { id })

      // Invalidate caches
      revalidateTag('contracts')
      revalidateTag(`contracts-team-${existing.team_id}`)
      revalidateTag(`contract-${id}`)
      revalidatePath('/gestionnaire/contrats')
      revalidatePath(`/gestionnaire/contrats/${id}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error updating contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Delete a contract (soft delete)
 */
export async function deleteContract(id: string): Promise<ActionResult<null>> {
  try {
    logger.info('🗑️ [CONTRACT-ACTION] Deleting contract:', { id })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const existing = await service.getById(id)

    if (!existing) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, existing.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Delete contract
    const result = await service.delete(id, auth.user!.id)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract deleted:', { id })

      // Invalidate caches
      revalidateTag('contracts')
      revalidateTag(`contracts-team-${existing.team_id}`)
      revalidateTag(`contract-${id}`)
      revalidatePath('/gestionnaire/contrats')

      return { success: true, data: null }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error deleting contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get a contract with all relations
 */
export async function getContract(id: string): Promise<ActionResult<ContractWithRelations>> {
  try {
    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract
    const service = await createServerActionContractService()
    const contract = await service.getById(id)

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, contract.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    return { success: true, data: contract }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error getting contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
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
    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, teamId)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Get contracts
    const service = await createServerActionContractService()
    const result = await service.getByTeam(teamId, options)

    if (result.success) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error getting team contracts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// ============================================================================
// CONTRACT STATUS ACTIONS
// ============================================================================

/**
 * Activate a draft contract
 */
export async function activateContract(id: string): Promise<ActionResult<Contract>> {
  try {
    logger.info('▶️ [CONTRACT-ACTION] Activating contract:', { id })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const existing = await service.getById(id)

    if (!existing) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, existing.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Activate contract
    const result = await service.activate(id)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract activated:', { id })

      // Invalidate caches
      revalidateTag('contracts')
      revalidateTag(`contracts-team-${existing.team_id}`)
      revalidateTag(`contract-${id}`)
      revalidatePath('/gestionnaire/contrats')
      revalidatePath(`/gestionnaire/contrats/${id}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error activating contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Terminate a contract
 */
export async function terminateContract(
  id: string,
  reason?: string
): Promise<ActionResult<Contract>> {
  try {
    logger.info('⏹️ [CONTRACT-ACTION] Terminating contract:', { id, reason })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const existing = await service.getById(id)

    if (!existing) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, existing.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Terminate contract
    const result = await service.terminate(id, reason)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract terminated:', { id })

      // Invalidate caches
      revalidateTag('contracts')
      revalidateTag(`contracts-team-${existing.team_id}`)
      revalidateTag(`contract-${id}`)
      revalidatePath('/gestionnaire/contrats')
      revalidatePath(`/gestionnaire/contrats/${id}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error terminating contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Renew a contract
 */
export async function renewContract(
  id: string,
  newData?: Partial<ContractInsert>
): Promise<ActionResult<Contract>> {
  try {
    logger.info('🔄 [CONTRACT-ACTION] Renewing contract:', { id })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const existing = await service.getById(id)

    if (!existing) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, existing.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Renew contract
    const result = await service.renew(id, {
      ...newData,
      created_by: auth.user!.id
    })

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract renewed:', {
        oldId: id,
        newId: result.data.id
      })

      // Invalidate caches
      revalidateTag('contracts')
      revalidateTag(`contracts-team-${existing.team_id}`)
      revalidateTag(`contract-${id}`)
      revalidatePath('/gestionnaire/contrats')

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error renewing contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// ============================================================================
// CONTRACT CONTACT ACTIONS
// ============================================================================

/**
 * Add a contact (tenant/guarantor) to a contract
 */
export async function addContractContact(
  data: ContractContactInsert
): Promise<ActionResult<ContractContact>> {
  try {
    logger.info('👤 [CONTRACT-ACTION] Adding contact to contract:', {
      contractId: data.contract_id,
      userId: data.user_id,
      role: data.role
    })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const contract = await service.getById(data.contract_id)

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, contract.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Add contact
    const result = await service.addContact(data)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contact added to contract:', {
        contractId: data.contract_id,
        contactId: result.data.id
      })

      // Invalidate caches
      revalidateTag(`contract-${data.contract_id}`)
      revalidatePath(`/gestionnaire/contrats/${data.contract_id}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error adding contract contact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
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
    logger.info('👤 [CONTRACT-ACTION] Updating contract contact:', { id, updates })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const contract = await service.getById(contractId)

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, contract.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Update contact
    const result = await service.updateContact(id, updates)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract contact updated:', { id })

      // Invalidate caches
      revalidateTag(`contract-${contractId}`)
      revalidatePath(`/gestionnaire/contrats/${contractId}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error updating contract contact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Remove a contact from a contract
 */
export async function removeContractContact(
  id: string,
  contractId: string
): Promise<ActionResult<null>> {
  try {
    logger.info('👤 [CONTRACT-ACTION] Removing contract contact:', { id })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const contract = await service.getById(contractId)

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, contract.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Remove contact
    const result = await service.removeContact(id)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract contact removed:', { id })

      // Invalidate caches
      revalidateTag(`contract-${contractId}`)
      revalidatePath(`/gestionnaire/contrats/${contractId}`)

      return { success: true, data: null }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error removing contract contact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// ============================================================================
// CONTRACT DOCUMENT ACTIONS
// ============================================================================

/**
 * Add a document to a contract
 */
export async function addContractDocument(
  data: ContractDocumentInsert
): Promise<ActionResult<ContractDocument>> {
  try {
    logger.info('📄 [CONTRACT-ACTION] Adding document to contract:', {
      contractId: data.contract_id,
      type: data.document_type,
      filename: data.filename
    })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const contract = await service.getById(data.contract_id)

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, contract.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Add document
    const result = await service.addDocument({
      ...data,
      uploaded_by: auth.user!.id
    })

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Document added to contract:', {
        contractId: data.contract_id,
        documentId: result.data.id
      })

      // Invalidate caches
      revalidateTag(`contract-${data.contract_id}`)
      revalidatePath(`/gestionnaire/contrats/${data.contract_id}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error adding contract document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Delete a document from a contract
 */
export async function deleteContractDocument(
  id: string,
  contractId: string
): Promise<ActionResult<null>> {
  try {
    logger.info('🗑️ [CONTRACT-ACTION] Deleting contract document:', { id })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get contract to verify team access
    const service = await createServerActionContractService()
    const contract = await service.getById(contractId)

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, contract.team_id)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Delete document
    const result = await service.deleteDocument(id, auth.user!.id)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Contract document deleted:', { id })

      // Invalidate caches
      revalidateTag(`contract-${contractId}`)
      revalidatePath(`/gestionnaire/contrats/${contractId}`)

      return { success: true, data: null }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error deleting contract document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// ============================================================================
// STATISTICS & ALERTS
// ============================================================================

/**
 * Get contract statistics for a team
 */
export async function getContractStats(
  teamId: string
): Promise<ActionResult<ContractStats>> {
  try {
    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, teamId)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Get stats
    const service = await createServerActionContractService()
    const stats = await service.getStats(teamId)

    return { success: true, data: stats }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error getting contract stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
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
    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Verify team access
    const teamAccess = await verifyTeamAccess(auth.user!.id, teamId)
    if (!teamAccess.success) {
      return { success: false, error: teamAccess.error }
    }

    // Get expiring contracts
    const service = await createServerActionContractService()
    const result = await service.getExpiringSoon(teamId, days)

    if (result.success) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error getting expiring contracts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// ============================================================================
// OVERLAP VALIDATION
// ============================================================================

/**
 * Détails d'un contrat en chevauchement
 */
export interface OverlappingContractInfo {
  id: string
  title: string
  start_date: string
  end_date: string
  status: ContractStatus
}

/**
 * Résultat de la vérification de chevauchement
 */
export interface OverlapCheckResult {
  hasOverlap: boolean
  overlappingContracts: OverlappingContractInfo[]
  nextAvailableDate: string | null
}

/**
 * Vérifie les contrats qui chevauchent une période donnée pour un lot.
 * Utilisé pour l'affichage temps réel dans le formulaire de création/édition.
 *
 * @param lotId - ID du lot
 * @param startDate - Date de début (format YYYY-MM-DD)
 * @param durationMonths - Durée en mois
 * @param excludeContractId - ID du contrat à exclure (mode édition)
 */
export async function getOverlappingContracts(
  lotId: string,
  startDate: string,
  durationMonths: number,
  excludeContractId?: string
): Promise<ActionResult<OverlapCheckResult>> {
  try {
    // Calculer la date de fin
    const endDate = calculateEndDate(startDate, durationMonths)

    logger.debug(
      { lotId, startDate, endDate, durationMonths, excludeContractId },
      '🔍 [CONTRACT-ACTION] Checking for overlapping contracts'
    )

    // Accès direct au repository (pas besoin du service complet ici)
    const { createServerActionContractRepository } = await import('@/lib/services/repositories/contract.repository')
    const repository = await createServerActionContractRepository()

    const result = await repository.findOverlappingContracts(
      lotId,
      startDate,
      endDate,
      excludeContractId
    )

    if (!result.success) {
      return { success: false, error: result.error.message }
    }

    const overlappingContracts = result.data as OverlappingContractInfo[]
    const hasOverlap = overlappingContracts.length > 0

    // Calculer la prochaine date disponible si chevauchement
    let nextAvailableDate: string | null = null
    if (hasOverlap) {
      nextAvailableDate = calculateNextAvailableDate(overlappingContracts)
    }

    logger.debug(
      { hasOverlap, count: overlappingContracts.length, nextAvailableDate },
      '✅ [CONTRACT-ACTION] Overlap check complete'
    )

    return {
      success: true,
      data: {
        hasOverlap,
        overlappingContracts,
        nextAvailableDate
      }
    }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error checking overlapping contracts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Calcule la date de fin à partir de la date de début et la durée
 */
function calculateEndDate(startDate: string, durationMonths: number): string {
  const start = new Date(startDate)
  start.setMonth(start.getMonth() + durationMonths)
  return start.toISOString().split('T')[0]
}

/**
 * Calcule la prochaine date disponible après tous les contrats en chevauchement.
 * La date retournée est le lendemain de la fin du dernier contrat conflictuel.
 */
function calculateNextAvailableDate(
  overlappingContracts: OverlappingContractInfo[]
): string {
  // Trier par date de fin décroissante pour trouver la plus tardive
  const sortedByEndDate = [...overlappingContracts].sort(
    (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
  )

  // La prochaine date est le lendemain de la fin du dernier contrat
  const latestEndDate = sortedByEndDate[0].end_date
  const nextDate = new Date(latestEndDate)
  nextDate.setDate(nextDate.getDate() + 1) // Jour suivant

  return nextDate.toISOString().split('T')[0]
}

// ============================================================================
// STATUS TRANSITION (AUTOMATIC)
// ============================================================================

/**
 * Résultat de la transition automatique des statuts
 */
export interface StatusTransitionResult {
  activatedCount: number      // Contrats passés de "a_venir" à "actif"
  expiredCount: number        // Contrats passés à "expire"
  activatedIds: string[]
  expiredIds: string[]
}

/**
 * Transition automatique des statuts des contrats.
 * - Les contrats "a_venir" dont la date de début est <= aujourd'hui → "actif"
 * - Les contrats "actif" dont la date de fin est < aujourd'hui → "expire"
 *
 * Cette action peut être appelée :
 * - Par un cron job quotidien
 * - Au chargement de la page des contrats (pour sync immédiate)
 *
 * @param teamId - Optionnel, limiter la transition à une équipe
 */
export async function transitionContractStatuses(
  teamId?: string
): Promise<ActionResult<StatusTransitionResult>> {
  try {
    const today = new Date().toISOString().split('T')[0]

    logger.info(
      { teamId, today },
      '🔄 [CONTRACT-ACTION] Starting automatic status transition'
    )

    const supabase = await createServerActionSupabaseClient()

    // 1. Trouver les contrats "a_venir" dont la date de début est passée
    let queryAVenir = supabase
      .from('contracts')
      .select('id, title, start_date, end_date')
      .eq('status', 'a_venir')
      .lte('start_date', today)
      .is('deleted_at', null)

    if (teamId) {
      queryAVenir = queryAVenir.eq('team_id', teamId)
    }

    const { data: toActivate, error: errorAVenir } = await queryAVenir

    if (errorAVenir) {
      logger.error({ error: errorAVenir }, '❌ [CONTRACT-ACTION] Error fetching a_venir contracts')
      return { success: false, error: errorAVenir.message }
    }

    // 2. Trouver les contrats "actif" dont la date de fin est passée
    let queryActif = supabase
      .from('contracts')
      .select('id, title, start_date, end_date')
      .eq('status', 'actif')
      .lt('end_date', today)
      .is('deleted_at', null)

    if (teamId) {
      queryActif = queryActif.eq('team_id', teamId)
    }

    const { data: toExpire, error: errorActif } = await queryActif

    if (errorActif) {
      logger.error({ error: errorActif }, '❌ [CONTRACT-ACTION] Error fetching actif contracts to expire')
      return { success: false, error: errorActif.message }
    }

    const activatedIds: string[] = []
    const expiredIds: string[] = []

    // 3. Mettre à jour les contrats "a_venir" → "actif"
    if (toActivate && toActivate.length > 0) {
      const idsToActivate = toActivate.map(c => c.id)

      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'actif' })
        .in('id', idsToActivate)

      if (updateError) {
        logger.error({ error: updateError }, '❌ [CONTRACT-ACTION] Error activating contracts')
      } else {
        activatedIds.push(...idsToActivate)
        logger.info(
          { count: idsToActivate.length, ids: idsToActivate },
          '✅ [CONTRACT-ACTION] Contracts activated (a_venir → actif)'
        )
      }
    }

    // 4. Mettre à jour les contrats "actif" → "expire"
    if (toExpire && toExpire.length > 0) {
      const idsToExpire = toExpire.map(c => c.id)

      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'expire' })
        .in('id', idsToExpire)

      if (updateError) {
        logger.error({ error: updateError }, '❌ [CONTRACT-ACTION] Error expiring contracts')
      } else {
        expiredIds.push(...idsToExpire)
        logger.info(
          { count: idsToExpire.length, ids: idsToExpire },
          '✅ [CONTRACT-ACTION] Contracts expired (actif → expire)'
        )
      }
    }

    const result: StatusTransitionResult = {
      activatedCount: activatedIds.length,
      expiredCount: expiredIds.length,
      activatedIds,
      expiredIds
    }

    logger.info(result, '✅ [CONTRACT-ACTION] Status transition complete')

    return { success: true, data: result }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error in status transition:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// ============================================================================
// LOT TENANT QUERIES (for occupation status & intervention assignments)
// ============================================================================

import type { ContractContactRole } from '@/lib/types/contract.types'

/**
 * Tenant information from active contracts
 */
export interface ActiveTenant {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  role: ContractContactRole
  contract_id: string
  contract_title: string
  is_primary: boolean
}

/**
 * Result of getting active tenants for a lot
 */
export interface ActiveTenantsResult {
  tenants: ActiveTenant[]
  hasActiveTenants: boolean
}

/**
 * Récupère les locataires des contrats ACTIFS d'un lot.
 *
 * Utilisé pour :
 * - Déterminer si un lot est "Occupé" (hasActiveTenants = true)
 * - Auto-assigner les locataires lors de la création d'une intervention
 *
 * @param lotId - ID du lot
 * @returns Liste des locataires avec indicateur d'occupation
 *
 * Note: Seuls les contrats avec status='actif' sont considérés.
 * Les contrats 'a_venir' ne comptent pas (bail pas encore commencé).
 */
export async function getActiveTenantsByLotAction(
  lotId: string
): Promise<ActionResult<ActiveTenantsResult>> {
  try {
    logger.info('🏠 [CONTRACT-ACTION] Getting active tenants for lot:', { lotId })

    // Verify auth
    const auth = await getAuthContext()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Get active tenants via service
    const service = await createServerActionContractService()
    const result = await service.getActiveTenantsByLot(lotId)

    if (result.success) {
      logger.info('✅ [CONTRACT-ACTION] Active tenants retrieved:', {
        lotId,
        tenantsCount: result.data.tenants.length,
        hasActiveTenants: result.data.hasActiveTenants
      })

      return {
        success: true,
        data: {
          tenants: result.data.tenants,
          hasActiveTenants: result.data.hasActiveTenants
        }
      }
    }

    return { success: false, error: result.error.message }

  } catch (error) {
    logger.error('❌ [CONTRACT-ACTION] Error getting active tenants:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
