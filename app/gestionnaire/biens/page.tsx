"use client"

import { Plus, Building2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import NavigationDebugPanel from "@/components/debug/navigation-debug"
import PropertySelector from "@/components/property-selector"
import { useRouter } from "next/navigation"

export default function BiensPage() {
  const router = useRouter()
  
  // PropertySelector gère tout : données, onglets, loading, etc.

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header - Harmonized */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                Mon Patrimoine
              </h1>
              <p className="text-slate-600">
                Gérez vos biens immobiliers et leurs locataires
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => window.location.href = '/gestionnaire/biens/lots/nouveau'}
              >
                <Plus className="h-4 w-4" />
                <span>Lot</span>
              </Button>
              <Button 
                className="flex items-center space-x-2"
                onClick={() => window.location.href = '/gestionnaire/biens/immeubles/nouveau'}
              >
                <Plus className="h-4 w-4" />
                <span>Immeuble</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Property Selector avec onglets intégrés */}
        <PropertySelector
          mode="view"
          showActions={true}
        />
      </main>

      {/* ✅ DEBUG PANEL - Avec toggle pour afficher/cacher */}
      <NavigationDebugPanel />
    </div>
  )
}
