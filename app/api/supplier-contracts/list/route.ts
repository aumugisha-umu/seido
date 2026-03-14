import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerSupplierContractService } from '@/lib/services/domain/supplier-contract.service'
import { logger } from '@/lib/logger'

/**
 * GET /api/supplier-contracts/list
 * Lists supplier contracts for the contact entity-link selector.
 * Returns a lightweight DTO with essential display info.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile } = authResult.data
    if (!userProfile.team_id) {
      return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
    }

    logger.info({ teamId: userProfile.team_id }, '📄 [SUPPLIER-CONTRACTS-LIST-API] GET request')

    const service = await createServerSupplierContractService()
    const contracts = await service.getByTeam(userProfile.team_id)

    // Transform to lightweight DTO for selector
    const supplierContracts = contracts.map(contract => ({
      id: contract.id,
      reference: contract.reference,
      supplier: contract.supplier ? {
        name: contract.supplier.name,
        company: contract.supplier.company_record?.name || contract.supplier.company || null,
      } : null,
      building: contract.building ? {
        id: contract.building.id,
        name: contract.building.name,
      } : null,
      lot: contract.lot ? {
        id: contract.lot.id,
        reference: contract.lot.reference,
      } : null,
      status: contract.status,
      end_date: contract.end_date,
    }))

    logger.info({ count: supplierContracts.length }, '✅ [SUPPLIER-CONTRACTS-LIST-API] Supplier contracts fetched for selector')

    return NextResponse.json({
      success: true,
      supplierContracts
    })
  } catch (error) {
    logger.error({ error }, '❌ [SUPPLIER-CONTRACTS-LIST-API] Unexpected error')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
