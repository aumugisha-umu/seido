/**
 * Async Interventions Content - Server Component for Suspense streaming
 *
 * Fetches interventions data asynchronously and passes to client.
 * Wrap in <Suspense> for streaming partial content as it loads.
 */

import { InterventionsPageClient } from '../interventions-page-client'
import { createServerInterventionService } from '@/lib/services'
import { logger } from '@/lib/logger'

// Pagination constant
const INITIAL_PAGE_SIZE = 50

interface AsyncInterventionsContentProps {
  profile: { id: string }
  team: { id: string }
  activeTeamIds: string[]
  isConsolidatedView: boolean
}

export async function AsyncInterventionsContent({
  profile,
  team,
  activeTeamIds,
  isConsolidatedView,
}: AsyncInterventionsContentProps) {
  const interventionService = await createServerInterventionService()

  let interventions: any[] = []
  let total = 0
  let hasMore = false

  try {
    if (isConsolidatedView && activeTeamIds.length > 1) {
      logger.info(`🔄 [INTERVENTIONS] Consolidated view - fetching from ${activeTeamIds.length} teams`)

      const results = await Promise.all(
        activeTeamIds.map(teamId => interventionService.getByTeam(teamId, {}))
      )

      interventions = results
        .filter(r => r.success && r.data)
        .flatMap(r => r.data || [])

      total = interventions.length
      hasMore = false

      logger.info(`✅ [INTERVENTIONS] Consolidated: ${interventions.length} interventions`)
    } else {
      const result = await interventionService.getByTeamPaginated(team.id, {
        limit: INITIAL_PAGE_SIZE,
        offset: 0
      })

      if (result.success && result.data) {
        interventions = result.data
        total = result.total
        hasMore = result.hasMore
        logger.info(`✅ [INTERVENTIONS] Loaded ${interventions.length}/${total}`)
      }
    }
  } catch (error) {
    logger.error('❌ [ASYNC-INTERVENTIONS] Error', { error })
  }

  return (
    <InterventionsPageClient
      initialInterventions={interventions}
      teamId={team.id}
      userId={profile.id}
      initialTotal={total}
      initialHasMore={hasMore}
      pageSize={INITIAL_PAGE_SIZE}
    />
  )
}
