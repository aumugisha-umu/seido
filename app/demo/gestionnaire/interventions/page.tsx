/**
 * Page Interventions Gestionnaire - Mode Démo
 * Liste des interventions avec filtres et actions
 */

'use client'

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { useDemoInterventions } from '@/hooks/demo/use-demo-interventions'
import { useDemoContext } from '@/lib/demo/demo-context'
import Link from 'next/link'

export default function InterventionsPageDemo() {
  const { getCurrentUser } = useDemoContext()
  const user = getCurrentUser()

  // Récupérer les interventions via le hook démo
  const { interventions, isLoading, error } = useDemoInterventions({
    team_id: user?.team_id
  })

  return (
    <div className="layout-container">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
              Interventions
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              Gérez toutes les interventions de votre équipe
            </p>
          </div>

          <Link href="/demo/gestionnaire/interventions/nouvelle">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle intervention</span>
              <span className="sm:hidden">Nouvelle</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Interventions Navigator */}
      <InterventionsNavigator
        interventions={interventions}
        loading={isLoading}
        error={error || undefined}
        onRefresh={() => {}}
        roleContext="gestionnaire"
        baseUrl="/demo/gestionnaire/interventions"
      />
    </div>
  )
}
