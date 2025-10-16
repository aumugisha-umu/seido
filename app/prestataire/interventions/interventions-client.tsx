"use client"

import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { InterventionCancellationProvider } from "@/contexts/intervention-cancellation-context"
import { InterventionCancellationManager } from "@/components/intervention/intervention-cancellation-manager"

// Intervention type matching the server data
interface Intervention {
  id: string
  title: string
  description: string
  type: string
  priority?: string
  urgency?: string
  status: string
  created_at: string
  estimated_duration?: string
  location?: string
  reference: string
  lot?: {
    reference: string
    building?: {
      address: string
    }
  }
  tenant?: {
    name: string
  }
  manager?: {
    name: string
  }
  assigned_contact?: unknown
}

interface InterventionsClientProps {
  interventions: Intervention[]
}

export default function InterventionsClient({ interventions }: InterventionsClientProps) {
  // Configuration pour l'état vide
  const emptyStateConfig = {
    title: "Aucune intervention",
    description: "Les interventions qui vous sont assignées apparaîtront ici",
    showCreateButton: false
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
            loading={false}
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
