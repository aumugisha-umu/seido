import { getServerAuthContext } from '@/lib/server-context'
import { createServerTeamService, createServerLotService } from '@/lib/services'
import NewImmeubleePage from './building-creation-form'

/**
 * 🎯 SERVER COMPONENT - Building Creation Page
 *
 * Uses Next.js 15 + React 19 best practices:
 * - Server-side authentication and team verification
 * - No client-side auth hooks (useAuth, useTeamStatus)
 * - Validates access before page renders
 * - Loads ALL initial data server-side (team managers, category counts)
 * - Passes validated data to Client Component
 */
export default async function NewBuildingPage() {
  // ✅ Server-side auth + team verification (single call, cached with React 19 cache())
  const { profile, team, teams } = await getServerAuthContext('gestionnaire')

  // ── Phase 0: Service instantiation + all queries in parallel ──────────
  const [teamService, lotService] = await Promise.all([
    createServerTeamService(),
    createServerLotService(),
  ])

  const [membersResult, categoryCountsResult] = await Promise.all([
    teamService.getTeamMembers(team.id),
    lotService.getLotStatsByCategory(team.id).catch(() => ({ data: {} as Record<string, number> })),
  ])

  const teamMembers = membersResult?.data || []
  const categoryCountsByTeam: Record<string, number> = categoryCountsResult?.data || {}

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

  // ✅ Pass ALL data to Client Component (no client-side loading needed!)
  return (
    <NewImmeubleePage
      userProfile={profile}
      userTeam={team}
      allTeams={teams}
      initialTeamManagers={teamManagers}
      initialCategoryCounts={categoryCountsByTeam}
    />
  )
}
