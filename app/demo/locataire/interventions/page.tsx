/**
 * Page Interventions Locataire - Mode Démo
 * Liste des interventions du locataire
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
              Suivez l'état de vos demandes d'intervention
            </p>
          </div>

          <Link href="/demo/locataire/interventions/nouvelle">
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
        roleContext="locataire"
        baseUrl="/demo/locataire/interventions"
      />
    </div>
  )
}
