'use client'

import { TabsContent } from '@/components/ui/tabs'
import {
  ContentWrapper,
  InterventionDetailsCard,
} from '@/components/interventions/shared'
import type { Participant, SharedTimeSlot } from './intervention-detail-types'
import {
  ConfirmationRequiredBanner,
  ConfirmationSuccessBanner,
  ConfirmationRejectedBanner
} from '@/components/intervention/confirmation-required-banner'
import { LinkedInterventionsSection } from '@/components/intervention/linked-interventions-section'
import type { Database } from '@/lib/database.types'

type AddressRecord = Database['public']['Tables']['addresses']['Row'] | null

interface InterventionGeneralTabProps {
  intervention: {
    id: string
    title: string
    description: string | null
    instructions: string | null
    status: string
    scheduling_type: string | null
    requires_participant_confirmation: boolean | null
    lot?: {
      reference: string
      address_record?: AddressRecord
      building?: {
        name: string
        address_record?: AddressRecord
      }
    } | null
    building?: {
      name: string
      address_record?: AddressRecord
    } | null
  }
  participants: {
    managers: Participant[]
    providers: Participant[]
    tenants: Participant[]
  }
  serverUserId: string
  serverUserRole: string
  // Confirmation banners
  showConfirmationBanner: boolean
  showConfirmedBanner: boolean
  showRejectedBanner: boolean
  onConfirmationResponse: () => void
  // Planning summary
  scheduledDate: string | null
  scheduledStartTime: string | null
  scheduledEndTime: string | null
  isFixedScheduling: boolean
  planningStatus: 'pending' | 'proposed' | 'scheduled' | 'completed'
  proposedSlotsCount: number
  transformedQuotes: Array<{ id: string; status: string; amount: number }>
  quotesStatus: string
  selectedQuoteAmount: number | undefined
  responseStats?: {
    maxResponsesReceived: number
    totalExpectedResponses: number
    slotDetails: Array<{
      slotDate: string
      startTime: string
      endTime: string
      accepted: number
      rejected: number
      pending: number
    }>
  }
  onOpenChatFromParticipant: (participantId: string, threadType: 'group' | 'tenant_to_managers' | 'provider_to_managers') => void
  onNavigateToPlanning: () => void
  // Linked interventions
  isParentIntervention: boolean
  linkedInterventions: Array<{
    id: string
    parent_intervention_id: string
    child_intervention_id: string
    provider_id: string
    link_type: string
    created_at: string
    parent?: { id: string; reference: string; title: string; status: string }
    child?: { id: string; reference: string; title: string; status: string }
    provider?: { id: string; first_name: string; last_name: string; avatar_url?: string }
  }>
}

export function InterventionGeneralTab({
  intervention,
  participants,
  serverUserId,
  serverUserRole,
  showConfirmationBanner,
  showConfirmedBanner,
  showRejectedBanner,
  onConfirmationResponse,
  scheduledDate,
  scheduledStartTime,
  scheduledEndTime,
  isFixedScheduling,
  planningStatus,
  proposedSlotsCount,
  transformedQuotes,
  quotesStatus,
  selectedQuoteAmount,
  responseStats,
  onOpenChatFromParticipant,
  onNavigateToPlanning,
  isParentIntervention,
  linkedInterventions,
}: InterventionGeneralTabProps) {
  // Compute location details from intervention
  const locationDetails = (() => {
    const lotRecord = intervention.lot?.address_record
    const buildingRecord = intervention.lot?.building?.address_record || intervention.building?.address_record
    const record = lotRecord || buildingRecord

    return {
      buildingName: intervention.lot?.building?.name || intervention.building?.name || null,
      lotReference: intervention.lot?.reference || null,
      fullAddress: record?.formatted_address
        || (record?.street || record?.city
          ? [record.street, record.postal_code, record.city].filter(Boolean).join(', ')
          : null),
      latitude: record?.latitude || null,
      longitude: record?.longitude || null
    }
  })()

  return (
    <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
      <ContentWrapper>
        {/* Confirmation banners */}
        {showConfirmationBanner && (
          <ConfirmationRequiredBanner
            interventionId={intervention.id}
            scheduledDate={null}
            scheduledTime={null}
            onConfirm={onConfirmationResponse}
            onReject={onConfirmationResponse}
          />
        )}
        {showConfirmedBanner && <ConfirmationSuccessBanner />}
        {showRejectedBanner && <ConfirmationRejectedBanner />}

        {/* Intervention details with integrated participants */}
        <div className="flex-shrink-0">
          <InterventionDetailsCard
            title={intervention.title}
            description={intervention.description || undefined}
            instructions={intervention.instructions || undefined}
            interventionStatus={intervention.status}
            participants={participants}
            currentUserId={serverUserId}
            currentUserRole={serverUserRole}
            onOpenChat={onOpenChatFromParticipant}
            locationDetails={locationDetails}
            planning={{
              scheduledDate,
              scheduledStartTime,
              scheduledEndTime,
              isFixedScheduling,
              schedulingType: intervention.scheduling_type as 'fixed' | 'slots' | 'flexible' | null,
              status: planningStatus,
              proposedSlotsCount,
              quotesCount: transformedQuotes.length,
              requestedQuotesCount: transformedQuotes.filter(q => q.status === 'pending').length,
              receivedQuotesCount: transformedQuotes.filter(q => q.status === 'sent').length,
              quotesStatus,
              selectedQuoteAmount,
              responseStats
            }}
            onNavigateToPlanning={onNavigateToPlanning}
          />
        </div>

        {/* Linked interventions section (for parent interventions) */}
        {isParentIntervention && linkedInterventions.length > 0 && (
          <LinkedInterventionsSection
            links={linkedInterventions}
            currentInterventionId={intervention.id}
            className="mt-6"
          />
        )}
      </ContentWrapper>
    </TabsContent>
  )
}
