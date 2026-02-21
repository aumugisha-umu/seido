import { getServerAuthContext } from '@/lib/server-context'
import { createServerTeamService, createServerLotService } from '@/lib/services'
import LotCreationForm from './lot-creation-form'
import { logger } from '@/lib/logger'

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
  const { profile, team, teams } = await getServerAuthContext('gestionnaire')
  const params = await searchParams

  // Load team managers server-side
  const teamService = await createServerTeamService()
  const membersResult = await teamService.getTeamMembers(team.id)
  const teamMembers = membersResult?.data || []

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

  // Load category counts server-side
  const lotService = await createServerLotService()
  let categoryCountsByTeam: Record<string, number> = {}

  try {
    const categoryCountsResult = await lotService.getLotStatsByCategory(team.id)
    categoryCountsByTeam = categoryCountsResult?.data || {}
  } catch (error) {
    logger.info('No lots found for team, initializing with zero counts:', error instanceof Error ? error.message : String(error))
    categoryCountsByTeam = {}
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
    />
  )
}
