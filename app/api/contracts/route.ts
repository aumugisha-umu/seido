import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerContractService } from '@/lib/services/domain/contract.service'
import { logger } from '@/lib/logger'

/**
 * GET /api/contracts
 * Liste les contrats de l'équipe de l'utilisateur
 */
export async function GET() {
    try {
        const authResult = await getApiAuthContext()
        if (!authResult.success) return authResult.error

        const { userProfile } = authResult.data
        if (!userProfile.team_id) {
            return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
        }

        logger.info({ teamId: userProfile.team_id }, '📄 [CONTRACTS-API] GET request')

        const contractService = await createServerContractService()
        const result = await contractService.getByTeam(userProfile.team_id)

        if (!result.success) {
            logger.error({ error: result.error }, '❌ [CONTRACTS-API] Error fetching contracts')
            return NextResponse.json({
                success: false,
                error: 'Erreur lors de la récupération des contrats'
            }, { status: 500 })
        }

        logger.info({ count: result.data?.length || 0 }, '✅ [CONTRACTS-API] Contracts fetched')

        return NextResponse.json({
            success: true,
            contracts: result.data || []
        }, {
            headers: {
                'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
            }
        })
    } catch (error) {
        logger.error({ error }, '❌ [CONTRACTS-API] Unexpected error')
        return NextResponse.json({
            success: false,
            error: 'Erreur interne du serveur'
        }, { status: 500 })
    }
}
