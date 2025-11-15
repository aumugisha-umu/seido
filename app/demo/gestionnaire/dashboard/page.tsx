/**
 * Dashboard Gestionnaire - Mode Démo
 *
 * ✅ Utilise les composants production pour un rendu identique
 * - DashboardHeaderWithBadge: Header avec badge actions pendantes
 * - DashboardClient: Boutons d'actions rapides
 * - StatsCompactV2: Grille de statistiques compacte
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { DashboardHeaderWithBadge } from '@/app/gestionnaire/dashboard/dashboard-header-with-badge'
import { DemoDashboardClient } from './demo-dashboard-client'
import { StatsCompactV2 } from '@/app/gestionnaire/dashboard/stats-compact-v2'
import { DemoInterventionsSectionWithModals } from './demo-interventions-section-with-modals'
import { useMemo } from 'react'

export default function GestionnaireDashboardDemo() {
  const { store, getCurrentUser } = useDemoContext()
  const user = getCurrentUser()

  // Charger toutes les données depuis le store démo
  const buildings = store.query('buildings', {
    filters: { team_id: user?.team_id }
  })

  const lots = store.query('lots', {
    filters: { team_id: user?.team_id }
  })

  const interventions = store.query('interventions', {
    filters: { team_id: user?.team_id }
  })

  const users = store.query('users', {
    filters: { team_id: user?.team_id }
  })

  // Calculer les statistiques dans le format attendu par StatsCompactV2
  const stats = useMemo(() => {
    const occupiedLots = lots.filter((lot: any) => lot.tenant_id)

    return {
      buildingsCount: buildings.length,
      lotsCount: lots.length,
      occupiedLotsCount: occupiedLots.length,
      occupancyRate: lots.length > 0
        ? Math.round((occupiedLots.length / lots.length) * 100)
        : 0,
      interventionsCount: interventions.length
    }
  }, [buildings, lots, interventions])

  // Calculer les statistiques de contacts dans le format attendu
  const contactStats = useMemo(() => {
    const totalContacts = users.length
    const totalActiveAccounts = users.filter((u: any) => u.auth_user_id).length
    const invitationsPending = users.filter((u: any) => !u.auth_user_id).length

    // Grouper les contacts par rôle
    const contactsByType = users.reduce((acc: any, user: any) => {
      const role = user.role || 'unknown'
      if (!acc[role]) {
        acc[role] = { total: 0, active: 0 }
      }
      acc[role].total++
      if (user.auth_user_id) {
        acc[role].active++
      }
      return acc
    }, {} as Record<string, { total: number; active: number }>)

    return {
      totalContacts,
      totalActiveAccounts,
      invitationsPending,
      contactsByType
    }
  }, [users])

  // Calculer le nombre d'actions pendantes (pour le badge)
  // Dans le mode démo, on peut filtrer les interventions qui nécessitent une action
  const pendingActionsCount = useMemo(() => {
    return interventions.filter((i: any) =>
      ['demande', 'demande_de_devis', 'planification'].includes(i.status)
    ).length
  }, [interventions])

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header avec badge et boutons d'actions - Production Component */}
        <div className="flex-shrink-0 content-max-width mb-6">
          <DashboardHeaderWithBadge pendingActionsCount={pendingActionsCount}>
            <DemoDashboardClient teamId={user?.team_id || 'demo-team-001'} />
          </DashboardHeaderWithBadge>
        </div>

        {/* Statistiques compactes - Production Component */}
        <div className="flex-shrink-0 content-max-width mb-6">
          <StatsCompactV2 stats={stats} contactStats={contactStats} />
        </div>

        {/* Section Interventions - Demo Component with Demo Hooks */}
        <div className="flex-1 content-max-width min-h-0 overflow-hidden">
          <DemoInterventionsSectionWithModals
            interventions={interventions as any}
            totalCount={interventions.length}
            teamId={user?.team_id || 'demo-team-001'}
          />
        </div>
      </div>
    </div>
  )
}
