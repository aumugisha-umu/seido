/**
 * Page Interventions Prestataire - Mode Démo
 * Liste des interventions assignées au prestataire
 */

'use client'

import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { useDemoInterventions } from '@/hooks/demo/use-demo-interventions'
import { useDemoContext } from '@/lib/demo/demo-context'

export default function InterventionsPageDemo() {
  const { getCurrentUser } = useDemoContext()
  const user = getCurrentUser()

  // Les interventions sont automatiquement filtrées par le hook selon le rôle
  const { interventions, isLoading, error } = useDemoInterventions()

  return (
    <div className="layout-container">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
              Mes interventions
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              Interventions qui vous sont assignées
            </p>
          </div>
        </div>
      </div>

      {/* Interventions Navigator */}
      <InterventionsNavigator
        interventions={interventions}
        loading={isLoading}
        error={error || undefined}
        onRefresh={() => {}}
        roleContext="prestataire"
        baseUrl="/demo/prestataire/interventions"
      />
    </div>
  )
}
