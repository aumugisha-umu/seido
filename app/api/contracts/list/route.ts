import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerContractService } from '@/lib/services/domain/contract.service'
import { logger } from '@/lib/logger'

/**
 * GET /api/contracts/list
 * Liste les contrats pour le sélecteur de liaison contact
 * Retourne une version simplifiée avec les infos essentielles
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await getApiAuthContext()
        if (!authResult.success) return authResult.error

        const { userProfile } = authResult.data
        if (!userProfile.team_id) {
            return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
        }

        // Le teamId dans la query est ignoré - on utilise celui de l'auth pour la sécurité
        logger.info({ teamId: userProfile.team_id }, '📄 [CONTRACTS-LIST-API] GET request')

        const contractService = await createServerContractService()
        const result = await contractService.getByTeam(userProfile.team_id)

        if (!result.success) {
            logger.error({ error: result.error }, '❌ [CONTRACTS-LIST-API] Error fetching contracts')
            return NextResponse.json({
                success: false,
                error: 'Erreur lors de la récupération des contrats'
            }, { status: 500 })
        }

        // Transformer les données pour le sélecteur (version légère)
        const contracts = (result.data || []).map(contract => ({
            id: contract.id,
            reference: contract.reference,
            lot: contract.lot ? {
                id: contract.lot.id,
                reference: contract.lot.reference,
                building: contract.lot.building ? {
                    name: contract.lot.building.name
                } : null
            } : null,
            start_date: contract.start_date,
            status: contract.status
        }))

        logger.info({ count: contracts.length }, '✅ [CONTRACTS-LIST-API] Contracts fetched for selector')

        return NextResponse.json({
            success: true,
            contracts
        })
    } catch (error) {
        logger.error({ error }, '❌ [CONTRACTS-LIST-API] Unexpected error')
        return NextResponse.json({
            success: false,
            error: 'Erreur interne du serveur'
        }, { status: 500 })
    }
}
