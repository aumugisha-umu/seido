'use client'

/**
 * Intervention Overview Card Component
 * Displays complete intervention information in a card format
 */

import { Card, CardContent } from '@/components/ui/card'
import type { Database } from '@/lib/database.types'
import { InterventionSchedulingPreview } from './intervention-scheduling-preview'
import { InterventionProviderGuidelines } from './intervention-provider-guidelines'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
}

type User = Database['public']['Tables']['users']['Row']
type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: User
}

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: User
}

type FullTimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: User
  responses?: TimeSlotResponse[]
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string | null
  type?: "gestionnaire" | "prestataire" | "locataire"
}

interface SimpleTimeSlot {
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
  schedulingSlots?: SimpleTimeSlot[] | null
  // Full time slots for compact card display
  fullTimeSlots?: FullTimeSlot[] | null
  // Actions for slots
  onOpenProgrammingModal?: () => void
  onCancelSlot?: (slot: FullTimeSlot) => void
  onApproveSlot?: (slot: FullTimeSlot) => void
  onRejectSlot?: (slot: FullTimeSlot) => void
  onEditSlot?: (slot: FullTimeSlot) => void
  canManageSlots?: boolean
  currentUserId?: string
  // Actions for participants and quotes
  onEditParticipants?: () => void
  onEditQuotes?: () => void
  // Provider guidelines
  currentUserRole: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire'
  onUpdate?: () => void
  // Quote actions
  onCancelQuoteRequest?: (quoteId: string) => void
  onApproveQuote?: (quoteId: string) => void
  onRejectQuote?: (quoteId: string) => void
  // Modify choice action (when user has already responded)
  onModifyChoice?: (slot: FullTimeSlot, currentResponse: 'accepted' | 'rejected') => void
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
  fullTimeSlots = null,
  onOpenProgrammingModal,
  onCancelSlot,
  onApproveSlot,
  onRejectSlot,
  onEditSlot,
  canManageSlots = false,
  currentUserId,
  onEditParticipants,
  onEditQuotes,
  currentUserRole,
  onUpdate,
  onCancelQuoteRequest,
  onApproveQuote,
  onRejectQuote,
  onModifyChoice
}: InterventionOverviewCardProps) {
  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
          <p className="text-sm whitespace-pre-wrap">{intervention.description}</p>
        </div>

        {/* Editable Provider Guidelines */}
        <InterventionProviderGuidelines
          interventionId={intervention.id}
          guidelines={intervention.provider_guidelines || null}
          currentUserRole={currentUserRole}
          onUpdate={onUpdate}
        />

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
          fullTimeSlots={fullTimeSlots}
          onOpenProgrammingModal={onOpenProgrammingModal}
          onCancelSlot={onCancelSlot}
          onApproveSlot={onApproveSlot}
          onRejectSlot={onRejectSlot}
          onEditSlot={onEditSlot}
          canManageSlots={canManageSlots}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onEditParticipants={onEditParticipants}
          onEditQuotes={onEditQuotes}
          onCancelQuoteRequest={onCancelQuoteRequest}
          onApproveQuote={onApproveQuote}
          onRejectQuote={onRejectQuote}
          onModifyChoice={onModifyChoice}
        />
      </CardContent>
    </Card>
  )
}