"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import PropertySelector from "@/components/property-selector"
import { useState, useEffect } from "react"

interface BiensPageClientProps {
  initialBuildings: any[]
  initialLots: any[]
  teamId: string | null
}

export function BiensPageClient({ initialBuildings, initialLots, teamId }: BiensPageClientProps) {
  const router = useRouter()

  // ✅ Créer un data object compatible avec le format attendu par PropertySelector
  const [buildingsData, setBuildingsData] = useState({
    buildings: initialBuildings,
    lots: initialLots,
    teamId: teamId
  })

  // Update when props change (from server re-fetch via router.refresh())
  useEffect(() => {
    setBuildingsData({
      buildings: initialBuildings,
      lots: initialLots,
      teamId: teamId
    })
  }, [initialBuildings, initialLots, teamId])

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                Mon Patrimoine
              </h1>
              <p className="text-base text-slate-600">
                Gérez vos immeubles et lots individuels
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/biens/lots/nouveau')}
              >
                <Plus className="h-4 w-4" />
                <span>Lot</span>
              </Button>
              <Button
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
              >
                <Plus className="h-4 w-4" />
                <span>Immeuble</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ✅ PropertySelector with server data injected */}
        <PropertySelector
          mode="view"
          showActions={true}
          // Pass server data via a custom prop (we'll modify PropertySelector to support this)
          initialData={buildingsData}
        />
      </main>
    </div>
  )
}
