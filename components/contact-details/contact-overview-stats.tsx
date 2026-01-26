'use client'

import { StatsCard } from '@/components/dashboards/shared/stats-card'
import { Wrench, Clock, CheckCircle2, Home } from 'lucide-react'

interface InterventionStats {
  total: number
  pending: number
  inProgress: number
  completed: number
}

interface ContactOverviewStatsProps {
  interventionStats: InterventionStats
  totalProperties: number
  totalLots: number
  onTabChange: (tab: string) => void
}

/**
 * Overview stats cards for contact details
 * Displays intervention counts and property count with click-to-navigate
 */
export function ContactOverviewStats({
  interventionStats,
  totalProperties,
  totalLots,
  onTabChange
}: ContactOverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Interventions */}
      <StatsCard
        id="total-interventions"
        label="Total"
        value={interventionStats.total}
        sublabel="interventions"
        icon={Wrench}
        iconColor="text-blue-600"
        variant="default"
        onClick={() => onTabChange('interventions')}
      />

      {/* Pending */}
      <StatsCard
        id="pending-interventions"
        label="En attente"
        value={interventionStats.pending}
        sublabel={interventionStats.pending > 0 ? 'à traiter' : ''}
        icon={Clock}
        iconColor="text-amber-500"
        variant={interventionStats.pending > 0 ? 'warning' : 'default'}
        onClick={() => onTabChange('interventions')}
      />

      {/* In Progress */}
      <StatsCard
        id="active-interventions"
        label="En cours"
        value={interventionStats.inProgress}
        sublabel="actives"
        icon={Wrench}
        iconColor="text-indigo-600"
        variant="default"
        onClick={() => onTabChange('interventions')}
      />

      {/* Completed */}
      <StatsCard
        id="completed-interventions"
        label="Terminées"
        value={interventionStats.completed}
        sublabel="clôturées"
        icon={CheckCircle2}
        iconColor="text-emerald-600"
        variant={interventionStats.completed > 0 ? 'success' : 'default'}
        onClick={() => onTabChange('interventions')}
      />

      {/* Linked Properties */}
      <StatsCard
        id="linked-properties"
        label="Biens liés"
        value={totalProperties}
        sublabel={totalLots > 0 ? `${totalLots} lots` : ''}
        icon={Home}
        iconColor="text-violet-600"
        variant="default"
        onClick={() => onTabChange('properties')}
      />
    </div>
  )
}
