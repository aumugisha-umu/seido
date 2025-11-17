"use client"

import { Users, Wrench, Activity, CheckCircle } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"

interface LotStatsBadgesProps {
  stats: {
    totalInterventions: number
    activeInterventions: number
    completedInterventions: number
  }
  totalContacts: number
}

/**
 * LotStatsBadges - Stats compactes pour la vue d'ensemble d'un lot
 *
 * Design aligné avec BuildingStatsBadges:
 * - Utilise le composant StatCard réutilisable
 * - Hauteur réduite (~60px)
 * - Design neutre sans couleurs vives
 * - Grid responsive 2 cols mobile → 4 cols desktop
 */
export function LotStatsBadges({ stats, totalContacts }: LotStatsBadgesProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-10">
      <StatCard
        icon={Users}
        value={totalContacts}
        label="Contacts"
        iconColor="orange"
      />

      <StatCard
        icon={Wrench}
        value={stats.totalInterventions}
        label="Interventions"
        iconColor="blue"
      />

      <StatCard
        icon={Activity}
        value={stats.activeInterventions}
        label="En cours"
        iconColor="orange"
      />

      <StatCard
        icon={CheckCircle}
        value={stats.completedInterventions}
        label="Terminées"
        iconColor="green"
      />
    </div>
  )
}
