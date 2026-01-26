import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerInterventionService } from '@/lib/services/domain/intervention-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/interventions
 * Liste les interventions de l'équipe de l'utilisateur
 */
export async function GET() {
    try {
        const authResult = await getApiAuthContext()
        if (!authResult.success) return authResult.error

        const { userProfile } = authResult.data
        if (!userProfile.team_id) {
            return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
        }

        logger.info({ teamId: userProfile.team_id }, '🔧 [INTERVENTIONS-API] GET request')

        const interventionService = await createServerInterventionService()
        const result = await interventionService.getByTeam(userProfile.team_id, {})

        if (!result.success) {
            logger.error({ error: result.error }, '❌ [INTERVENTIONS-API] Error fetching interventions')
            return NextResponse.json({
                success: false,
                error: 'Erreur lors de la récupération des interventions'
            }, { status: 500 })
        }

        logger.info({ count: result.data?.length || 0 }, '✅ [INTERVENTIONS-API] Interventions fetched')

        return NextResponse.json({
            success: true,
            interventions: result.data || []
        }, {
            headers: {
                'Cache-Control': 'private, max-age=60, stale-while-revalidate=120'
            }
        })
    } catch (error) {
        logger.error({ error }, '❌ [INTERVENTIONS-API] Unexpected error')
        return NextResponse.json({
            success: false,
            error: 'Erreur interne du serveur'
        }, { status: 500 })
    }
}
