import { getServerAuthContext } from '@/lib/server-context'
import {
  createServerBuildingService,
  createServerLotService,
} from '@/lib/services'
import NouveauRappelClient from './nouveau-rappel-client'

export default async function NouveauRappelPage() {
  const { team, profile } = await getServerAuthContext('gestionnaire')

  // Phase 0: Service instantiation in parallel
  const [buildingService, lotService] = await Promise.all([
    createServerBuildingService(),
    createServerLotService(),
  ])

  // Wave 1: Independent queries in parallel
  const [buildingsResult, lotsResult] = await Promise.all([
    buildingService.getBuildingsByTeam(team.id),
    lotService.getLotsByTeam(team.id),
  ])

  return (
    <NouveauRappelClient
      buildings={buildingsResult.success ? buildingsResult.data || [] : []}
      lots={lotsResult.success ? lotsResult.data || [] : []}
      teamId={team.id}
      userId={profile.id}
    />
  )
}
