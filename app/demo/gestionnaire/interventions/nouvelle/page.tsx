/**
 * Page Nouvelle Intervention Gestionnaire - Mode Démo
 * Formulaire de création d'intervention
 */

'use client'

import { useDemoBuildings } from '@/hooks/demo/use-demo-buildings'
import { useDemoLots } from '@/hooks/demo/use-demo-lots'
import { useDemoContext } from '@/lib/demo/demo-context'
import NouvelleInterventionClient from '@/app/gestionnaire/interventions/nouvelle-intervention/nouvelle-intervention-client'

export default function NouvelleInterventionPageDemo() {
  const { getCurrentUser } = useDemoContext()
  const user = getCurrentUser()

  const { buildings } = useDemoBuildings({ team_id: user?.team_id })
  const { lots: allLots } = useDemoLots({ team_id: user?.team_id })

  // Enrich buildings with their lots
  const buildingsWithLots = buildings.map((building: any) => ({
    ...building,
    lots: allLots.filter((lot: any) => lot.building_id === building.id).map((lot: any) => {
      const isOccupied = lot.lot_contacts?.some((contact: any) => contact.user?.role === 'locataire') || false
      return {
        ...lot,
        is_occupied: isOccupied,
        status: isOccupied ? "occupied" : "vacant"
      }
    })
  }))

  // Transform lots to add status
  const transformedLots = allLots.map((lot: any) => {
    const isOccupied = lot.lot_contacts?.some((contact: any) => contact.user?.role === 'locataire') || false
    return {
      ...lot,
      is_occupied: isOccupied,
      status: isOccupied ? "occupied" : "vacant",
      building_name: buildings.find((b: any) => b.id === lot.building_id)?.name || null
    }
  })

  const buildingsData = {
    buildings: buildingsWithLots,
    lots: transformedLots,
    teamId: user?.team_id || null
  }

  return <NouvelleInterventionClient initialBuildingsData={buildingsData} />
}
