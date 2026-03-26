import { Suspense } from 'react'
import { getServerAuthContext } from '@/lib/server-context'
import { AsyncOperationsContent } from './components/async-operations-content'
import { ListSkeleton } from '@/components/ui/page-skeleton'

export const dynamic = 'force-dynamic'

/**
 * Operations Page - Server Component (US-006)
 *
 * Unified view for Interventions + Rappels (Reminders).
 * Uses Suspense for streaming data loading.
 */
export default async function OperationsPage() {
  const { profile, team, activeTeamIds, isConsolidatedView } = await getServerAuthContext('gestionnaire')

  return (
    <Suspense fallback={<ListSkeleton />}>
      <AsyncOperationsContent
        profile={{ id: profile.id }}
        team={{ id: team.id }}
        activeTeamIds={activeTeamIds}
        isConsolidatedView={isConsolidatedView}
      />
    </Suspense>
  )
}
