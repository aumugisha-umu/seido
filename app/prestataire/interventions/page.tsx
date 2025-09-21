"use client"

import { Loader2, AlertTriangle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePrestataireData } from "@/hooks/use-prestataire-data"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { InterventionCancellationProvider } from "@/contexts/intervention-cancellation-context"
import { InterventionCancellationManager } from "@/components/intervention/intervention-cancellation-manager"


export default function PrestatairInterventionsPage() {
  const { user } = useAuth()
  const { interventions, loading, error } = usePrestataireData(user?.id || '')

  // Configuration pour l'état vide
  const emptyStateConfig = {
    title: "Aucune intervention",
    description: "Les interventions qui vous sont assignées apparaîtront ici",
    showCreateButton: false
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-slate-600">Chargement des interventions...</span>
          </div>
        </main>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Erreur de chargement</h3>
            <p className="text-slate-500 mb-4">{error}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <InterventionCancellationProvider>
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Page Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                  Mes Interventions
                </h1>
                <p className="text-slate-600">
                  Gérez les interventions qui vous sont assignées
                </p>
              </div>
            </div>
          </div>

          {/* Interventions Navigator */}
          <InterventionsNavigator
            interventions={interventions}
            loading={loading}
            emptyStateConfig={emptyStateConfig}
            showStatusActions={false}
            searchPlaceholder="Rechercher par titre, description, ou lot..."
            showFilters={true}
            userContext="prestataire"
          />
        </main>
      </div>

      {/* Gestionnaire des modales d'annulation */}
      <InterventionCancellationManager />
    </InterventionCancellationProvider>
  )
}
