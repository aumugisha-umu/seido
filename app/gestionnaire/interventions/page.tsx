import { InterventionsPageClient } from './interventions-page-client'
import { createServerInterventionService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { getServerAuthContext } from '@/lib/server-context'

// ✅ Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function InterventionsPage() {
  try {
    // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
    logger.info("🔵 [INTERVENTIONS-PAGE] Server-side fetch starting")
    const { profile, team } = await getServerAuthContext('gestionnaire')

    // ✅ Create service
    const interventionService = await createServerInterventionService()

    // ✅ Fetch interventions using team_id
    const result = await interventionService.getByTeam(team.id, {})

    let interventions: any[] = []

    if (result.success && result.data) {
      interventions = result.data
      logger.info(`✅ [INTERVENTIONS-PAGE] Loaded ${interventions.length} interventions`)
    } else {
      logger.error(`❌ [INTERVENTIONS-PAGE] Failed to load interventions: ${result.error || 'Unknown error'}`)
    }

    logger.info(`📊 [INTERVENTIONS-PAGE] Server data ready - Interventions: ${interventions.length}`)

    // ✅ Pass data AND user context to Client Component
    return <InterventionsPageClient
      initialInterventions={interventions}
      teamId={team.id}
      userId={profile.id}
    />
  } catch (error) {
    // 🔍 DETAILED ERROR LOGGING FOR DIAGNOSTICS
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      // Supabase-specific error properties
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      // Full error object serialization
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    }

    logger.error("❌ [INTERVENTIONS-PAGE] Server error:", errorDetails)
    console.error("🚨 [INTERVENTIONS-PAGE] Full error object:", error)

    // Re-throw NEXT_REDIRECT errors
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    // For other errors, render empty state (teamId/userId will be undefined, hooks will handle gracefully)
    return <InterventionsPageClient
      initialInterventions={[]}
      teamId={undefined}
      userId={undefined}
    />
  }
}
