/**
 * Async Operations Content - Server Component for Suspense streaming
 *
 * Fetches both interventions and reminders data in parallel,
 * then passes to the client component for interactive rendering.
 */

import { createServerInterventionService, createServerReminderService } from '@/lib/services'
import { OperationsPageClient } from './operations-page-client'
import { logger } from '@/lib/logger'
import type { ReminderWithRelations } from '@/lib/types/reminder.types'

const INITIAL_PAGE_SIZE = 50

interface AsyncOperationsContentProps {
  profile: { id: string }
  team: { id: string }
  activeTeamIds: string[]
  isConsolidatedView: boolean
}

export async function AsyncOperationsContent({
  profile,
  team,
  activeTeamIds,
  isConsolidatedView,
}: AsyncOperationsContentProps) {
  // Phase 0: Service init in parallel
  const [interventionService, reminderService] = await Promise.all([
    createServerInterventionService(),
    createServerReminderService(),
  ])

  // Phase 1: Data fetch in parallel
  let interventions: Record<string, unknown>[] = []
  let total = 0
  let hasMore = false
  let reminders: ReminderWithRelations[] = []

  try {
    if (isConsolidatedView && activeTeamIds.length > 1) {
      logger.info(`[OPERATIONS] Consolidated view - fetching from ${activeTeamIds.length} teams`)

      const [interventionResults, remindersResult] = await Promise.all([
        Promise.all(
          activeTeamIds.map(teamId => interventionService.getByTeam(teamId, {}))
        ),
        reminderService.getByTeam(team.id),
      ])

      interventions = interventionResults
        .filter(r => r.success && r.data)
        .flatMap(r => r.data || [])
      total = interventions.length
      hasMore = false
      reminders = remindersResult

      logger.info(`[OPERATIONS] Consolidated: ${interventions.length} interventions, ${reminders.length} reminders`)
    } else {
      const [interventionResult, remindersResult] = await Promise.all([
        interventionService.getByTeamPaginated(team.id, {
          limit: INITIAL_PAGE_SIZE,
          offset: 0,
        }),
        reminderService.getByTeam(team.id),
      ])

      if (interventionResult.success && interventionResult.data) {
        interventions = interventionResult.data
        total = interventionResult.total
        hasMore = interventionResult.hasMore
      }
      reminders = remindersResult

      logger.info(`[OPERATIONS] Loaded ${interventions.length}/${total} interventions, ${reminders.length} reminders`)
    }
  } catch (error) {
    logger.error('[ASYNC-OPERATIONS] Error fetching data', { error })
  }

  return (
    <OperationsPageClient
      initialInterventions={interventions}
      initialInterventionTotal={total}
      initialInterventionHasMore={hasMore}
      reminders={reminders}
      teamId={team.id}
      userId={profile.id}
      pageSize={INITIAL_PAGE_SIZE}
    />
  )
}
