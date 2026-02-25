import { Suspense } from 'react'
import { getServerAuthContext } from '@/lib/server-context'
import { AsyncInterventionsContent } from './components/async-interventions-content'
import { ListSkeleton } from '@/components/ui/page-skeleton'

// ✅ Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

/**
 * 🔐 INTERVENTIONS PAGE - SERVER COMPONENT (Next.js 15 Pattern)
 *
 * ✅ US-401: Suspense boundary for streaming
 * - Page shell renders immediately
 * - Interventions list streams in as data loads
 * - Skeleton shown during loading
 */

export default async function InterventionsPage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { profile, team, activeTeamIds, isConsolidatedView } = await getServerAuthContext('gestionnaire')

  return (
    <Suspense fallback={<ListSkeleton />}>
      <AsyncInterventionsContent
        profile={{ id: profile.id }}
        team={{ id: team.id }}
        activeTeamIds={activeTeamIds}
        isConsolidatedView={isConsolidatedView}
      />
    </Suspense>
  )
}
