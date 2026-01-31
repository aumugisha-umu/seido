"use client"

/**
 * Intervention Progress Card Component
 * Displays the status timeline/progression for an intervention
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusTimeline } from '@/components/interventions/status-timeline'
import { Activity } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row']
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

interface InterventionProgressCardProps {
  intervention: Intervention
  activityLogs?: ActivityLog[]
}

export function InterventionProgressCard({ intervention, activityLogs = [] }: InterventionProgressCardProps) {
  // Extract actors from activity logs for each status
  const getActorForStatus = (targetStatus: string | null, actionType?: string): string | null => {
    if (!targetStatus && !actionType) return null
    if (activityLogs.length === 0) return null

    const log = activityLogs.find((log) => {
      const metadata = log.metadata as any
      if (actionType && log.action_type === actionType) return true
      if (targetStatus && metadata?.new_status === targetStatus) return true
      return false
    })

    return log?.user?.name || null
  }

  const actors = {
    createdBy: getActorForStatus(null, 'create'),
    approvedBy: getActorForStatus('approuvee', 'approve'),
    rejectedBy: getActorForStatus('rejetee', 'reject'),
    scheduledBy: getActorForStatus('planifiee'),
    completedBy: getActorForStatus('cloturee_par_gestionnaire') ||
                 getActorForStatus('cloturee_par_prestataire') ||
                 getActorForStatus('cloturee_par_locataire'),
    cancelledBy: getActorForStatus('annulee')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Progression
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StatusTimeline
          currentStatus={intervention.status}
          createdAt={intervention.created_at}
          scheduledDate={intervention.scheduled_date}
          completedDate={intervention.completed_date}
          rejectedAt={intervention.status === 'rejetee' ? intervention.updated_at : null}
          cancelledAt={intervention.status === 'annulee' ? intervention.updated_at : null}
          createdBy={actors.createdBy}
          approvedBy={actors.approvedBy}
          rejectedBy={actors.rejectedBy}
          scheduledBy={actors.scheduledBy}
          completedBy={actors.completedBy}
          cancelledBy={actors.cancelledBy}
        />
      </CardContent>
    </Card>
  )
}
