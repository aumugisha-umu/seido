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

interface InterventionProgressCardProps {
  intervention: Intervention
}

export function InterventionProgressCard({ intervention }: InterventionProgressCardProps) {
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
        />
      </CardContent>
    </Card>
  )
}
