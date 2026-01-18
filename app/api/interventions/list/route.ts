import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerInterventionService } from '@/lib/services/domain/intervention-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/interventions/list
 * Liste les interventions pour le sélecteur de liaison contact
 * Supporte le filtrage par statuts exclus
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await getApiAuthContext()
        if (!authResult.success) return authResult.error

        const { userProfile } = authResult.data
        if (!userProfile.team_id) {
            return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
        }

        // Récupérer les statuts à exclure depuis les query params
        const { searchParams } = new URL(request.url)
        const excludeStatusesParam = searchParams.get('excludeStatuses')
        const excludeStatuses = excludeStatusesParam ? excludeStatusesParam.split(',') : []

        logger.info({
            teamId: userProfile.team_id,
            excludeStatuses
        }, '🔧 [INTERVENTIONS-LIST-API] GET request')

        const interventionService = await createServerInterventionService()
        const result = await interventionService.getByTeam(userProfile.team_id, {})

        if (!result.success) {
            logger.error({ error: result.error }, '❌ [INTERVENTIONS-LIST-API] Error fetching interventions')
            return NextResponse.json({
                success: false,
                error: 'Erreur lors de la récupération des interventions'
            }, { status: 500 })
        }

        // Filtrer et transformer les données pour le sélecteur
        let interventions = result.data || []

        // Appliquer le filtre de statuts exclus
        if (excludeStatuses.length > 0) {
            interventions = interventions.filter(i => !excludeStatuses.includes(i.status))
        }

        // Transformer pour le sélecteur (version légère)
        const transformedInterventions = interventions.map(intervention => ({
            id: intervention.id,
            title: intervention.title,
            status: intervention.status,
            building: intervention.building ? {
                name: intervention.building.name
            } : null,
            lot: intervention.lot ? {
                reference: intervention.lot.reference
            } : null
        }))

        logger.info({
            totalCount: result.data?.length || 0,
            filteredCount: transformedInterventions.length
        }, '✅ [INTERVENTIONS-LIST-API] Interventions fetched for selector')

        return NextResponse.json({
            success: true,
            interventions: transformedInterventions
        })
    } catch (error) {
        logger.error({ error }, '❌ [INTERVENTIONS-LIST-API] Unexpected error')
        return NextResponse.json({
            success: false,
            error: 'Erreur interne du serveur'
        }, { status: 500 })
    }
}
