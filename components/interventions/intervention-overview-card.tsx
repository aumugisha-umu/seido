'use client'

/**
 * Intervention Overview Card Component
 * Displays complete intervention information in a card format
 */

import { Card, CardContent } from '@/components/ui/card'
import type { Database } from '@/lib/database.types'
import { InterventionSchedulingPreview } from './intervention-scheduling-preview'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
}

type User = Database['public']['Tables']['users']['Row']
type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: User
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string | null
  type?: "gestionnaire" | "prestataire" | "locataire"
}

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface InterventionOverviewCardProps {
  intervention: Intervention
  // Scheduling preview data
  managers?: Contact[]
  providers?: Contact[]
  tenants?: Contact[]
  requireQuote?: boolean
  quotes?: Quote[]
  schedulingType?: "fixed" | "slots" | "flexible" | null
  schedulingSlots?: TimeSlot[] | null
  instructions?: string | null
}

export function InterventionOverviewCard({
  intervention,
  managers = [],
  providers = [],
  tenants = [],
  requireQuote = false,
  quotes = [],
  schedulingType = null,
  schedulingSlots = null,
  instructions = null
}: InterventionOverviewCardProps) {

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
          <p className="text-sm whitespace-pre-wrap">{intervention.description}</p>
        </div>

        {/* Scheduling Preview */}
        <InterventionSchedulingPreview
          managers={managers}
          providers={providers}
          tenants={tenants}
          requireQuote={requireQuote}
          quotes={quotes}
          schedulingType={schedulingType}
          scheduledDate={intervention.scheduled_date}
          schedulingSlots={schedulingSlots}
          instructions={instructions}
        />
      </CardContent>
    </Card>
  )
}