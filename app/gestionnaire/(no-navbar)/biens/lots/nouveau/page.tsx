import { getServerAuthContext } from '@/lib/server-context'
import { createServerTeamService, createServerLotService } from '@/lib/services'
import { createSubscriptionService } from '@/lib/services/domain/subscription-helpers'
import LotCreationForm from './lot-creation-form'
import { SubscriptionLimitPage } from '@/components/billing/subscription-limit-page'

/**
 * SERVER COMPONENT - Lot Creation Page
 *
 * Uses Next.js 15 + React 19 best practices:
 * - Server-side authentication and team verification
 * - No client-side auth hooks (useAuth, useTeamStatus)
 * - Validates access before page renders
 * - Loads ALL initial data server-side (team managers, category counts)
 * - Passes validated data to Client Component
 *
 * Pattern aligned with immeubles/nouveau/page.tsx (building wizard).
 */
export default async function NewLotPage({
  searchParams,
}: {
  searchParams: Promise<{ buildingId?: string }>
}) {
  // Server-side auth + team verification (single call, cached with React 19 cache())
  const { profile, team, teams, supabase } = await getServerAuthContext('gestionnaire')
  const params = await searchParams

  // ── Subscription limit gate (fail-open: if check fails, allow creation — server action has defense-in-depth)
  try {
    const subscriptionService = createSubscriptionService(supabase)
    const canAddResult = await subscriptionService.canAddProperty(team.id)

    if (!canAddResult.allowed && canAddResult.upgrade_needed) {
      const info = await subscriptionService.getSubscriptionInfo(team.id)
      return (
        <SubscriptionLimitPage
          currentLots={info?.actual_lots ?? 0}
          subscribedLots={info?.subscribed_lots ?? 0}
        />
      )
    }
  } catch {
    // Fail-open: let user proceed — createLotAction has its own subscription check
  }

  // ── Phase 0: Service instantiation + all queries in parallel ──────────
  const [teamService, lotService] = await Promise.all([
    createServerTeamService(),
    createServerLotService(),
  ])

  const [membersResult, categoryCountsResult, buildingCountResult] = await Promise.all([
    teamService.getTeamMembers(team.id),
    lotService.getLotStatsByCategory(team.id).catch(() => ({ data: {} as Record<string, number> })),
    supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('team_id', team.id).is('deleted_at', null),
  ])

  const teamMembers = membersResult?.data || []
  const categoryCountsByTeam: Record<string, number> = categoryCountsResult?.data || {}
  const initialHasBuildings = (buildingCountResult.count ?? 0) > 0

  // Filter for managers only - Use member.role (team role) not member.user.role (global user role)
  const teamManagers = teamMembers.filter(
    (member) => member.user && member.role === 'gestionnaire'
  )

  // Ensure current user is included if they're a manager
  const currentUserExists = teamManagers.find(
    (member) => member.user.id === profile.id
  )

  if (!currentUserExists && profile.role === 'gestionnaire') {
    teamManagers.push({
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role
      },
      role: 'admin'
    })
  }

  // Pass ALL data to Client Component (no client-side loading needed!)
  return (
    <LotCreationForm
      userProfile={profile}
      userTeam={team}
      allTeams={teams}
      initialTeamManagers={teamManagers}
      initialCategoryCounts={categoryCountsByTeam}
      prefillBuildingId={params.buildingId || null}
      initialHasBuildings={initialHasBuildings}
    />
  )
}
