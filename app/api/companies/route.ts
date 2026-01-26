import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerCompanyRepository } from '@/lib/services/repositories/company.repository'
import { logger } from '@/lib/logger'

/**
 * GET /api/companies
 * Liste les sociétés de l'équipe de l'utilisateur
 */
export async function GET() {
    try {
        const authResult = await getApiAuthContext()
        if (!authResult.success) return authResult.error

        const { userProfile } = authResult.data
        if (!userProfile.team_id) {
            return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
        }

        logger.info({ teamId: userProfile.team_id }, '🏢 [COMPANIES-API] GET request')

        const companyRepo = await createServerCompanyRepository()
        const result = await companyRepo.findByTeam(userProfile.team_id)

        if (!result.success) {
            logger.error({ error: result.error }, '❌ [COMPANIES-API] Error fetching companies')
            return NextResponse.json({
                success: false,
                error: 'Erreur lors de la récupération des sociétés'
            }, { status: 500 })
        }

        logger.info({ count: result.data?.length || 0 }, '✅ [COMPANIES-API] Companies fetched')

        return NextResponse.json({
            success: true,
            companies: result.data || []
        }, {
            headers: {
                'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
            }
        })
    } catch (error) {
        logger.error({ error }, '❌ [COMPANIES-API] Unexpected error')
        return NextResponse.json({
            success: false,
            error: 'Erreur interne du serveur'
        }, { status: 500 })
    }
}
