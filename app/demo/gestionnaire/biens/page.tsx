/**
 * Page Biens (Patrimoine) Gestionnaire - Mode Démo
 * Liste des immeubles et lots avec le PropertySelector
 */

'use client'

import { Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import PropertySelector from "@/components/property-selector"
import { useDemoBuildings } from '@/hooks/demo/use-demo-buildings'
import { useDemoLots } from '@/hooks/demo/use-demo-lots'
import { useDemoContext } from '@/lib/demo/demo-context'
import Link from 'next/link'

export default function BiensPageDemo() {
  const { getCurrentUser } = useDemoContext()
  const user = getCurrentUser()

  // Récupérer buildings et lots via les hooks démo
  const { buildings } = useDemoBuildings({ team_id: user?.team_id })
  const { lots: allLots } = useDemoLots({ team_id: user?.team_id })

  // Enrichir les buildings avec leurs lots
  const buildingsWithLots = buildings.map((building: any) => ({
    ...building,
    lots: allLots.filter((lot: any) => lot.building_id === building.id)
  }))

  // Récupérer les lots indépendants (sans building)
  const independentLots = allLots.filter((lot: any) => !lot.building_id)

  // Tous les lots pour l'onglet "Lots"
  const allLotsForDisplay = allLots.map((lot: any) => {
    const building = buildings.find((b: any) => b.id === lot.building_id)
    return {
      ...lot,
      building_name: building?.name || null,
      status: lot.is_occupied ? "occupied" : "vacant"
    }
  })

  // Préparer les données pour PropertySelector
  const buildingsData = {
    buildings: buildingsWithLots,
    lots: allLotsForDisplay,
    teamId: user?.team_id
  }

  const handleRefresh = () => {
    // En mode démo, pas de refresh réel
    console.log('Refresh clicked (demo mode)')
  }

  return (
    <div className="layout-container flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
              Patrimoine
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              Gérez vos immeubles et lots
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>

            <Link href="/demo/gestionnaire/biens/immeubles/nouveau">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouvel immeuble</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Property Selector Component */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PropertySelector
          mode="view"
          initialData={buildingsData}
        />
      </div>
    </div>
  )
}
