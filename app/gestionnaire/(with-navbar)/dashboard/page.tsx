import { Suspense } from 'react'
import { getServerAuthContext } from "@/lib/server-context"
import { AsyncDashboardContent } from "./components/async-dashboard-content"
import { DashboardSkeleton } from "@/components/ui/page-skeleton"

/**
 * 🔐 DASHBOARD GESTIONNAIRE - SERVER COMPONENT (Next.js 15 Pattern)
 *
 * ✅ US-401: Suspense boundary for streaming
 * - Page shell renders immediately
 * - Dashboard content streams in as data loads
 * - Skeleton shown during loading
 *
 * Pattern officiel Next.js 15 + React 19:
 * 1. getServerAuthContext() centralisé (1 ligne vs 10+)
 * 2. React.cache() déduplique automatiquement avec layout
 * 3. Suspense around async content for streaming
 * 4. Skeleton fallback for better perceived performance
 */

export default async function DashboardGestionnaire() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  // ✅ MULTI-ÉQUIPE: activeTeamIds contient soit [teamId] soit tous les teamIds
  const { profile, team, activeTeamIds, isConsolidatedView, sameRoleTeams } = await getServerAuthContext('gestionnaire')

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AsyncDashboardContent
        profile={{ id: profile.id }}
        team={{ id: team.id }}
        activeTeamIds={activeTeamIds}
        isConsolidatedView={isConsolidatedView}
        sameRoleTeams={sameRoleTeams}
      />
    </Suspense>
  )
}
