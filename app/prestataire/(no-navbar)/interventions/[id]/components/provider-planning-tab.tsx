import { TabsContent } from '@/components/ui/tabs'
import {
  PlanningCard,
  QuotesCard,
  type Quote as SharedQuote,
  type TimeSlot as SharedTimeSlot,
} from '@/components/interventions/shared'

interface ProviderPlanningTabProps {
  schedulingType: string | null
  scheduledDate: string | null
  scheduledStartTime: string | null
  currentUserId: string
  transformedTimeSlots: SharedTimeSlot[]
  transformedQuotes: SharedQuote[]
  onAcceptSlot: (slotId: string) => void
  onRejectSlot: (slotId: string) => void
  onOpenResponseModal: (slotId: string) => void
  onRespondToQuote: () => void
}

export function ProviderPlanningTab({
  schedulingType,
  scheduledDate,
  scheduledStartTime,
  currentUserId,
  transformedTimeSlots,
  transformedQuotes,
  onAcceptSlot,
  onRejectSlot,
  onOpenResponseModal,
  onRespondToQuote,
}: ProviderPlanningTabProps) {
  return (
    <TabsContent value="planning" className="mt-0 flex-1 overflow-auto">
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <PlanningCard
          timeSlots={transformedTimeSlots}
          scheduledDate={scheduledDate || undefined}
          scheduledStartTime={scheduledStartTime || undefined}
          schedulingType={schedulingType as 'fixed' | 'slots' | 'flexible' | null}
          userRole="provider"
          currentUserId={currentUserId}
          onApproveSlot={onAcceptSlot}
          onRejectSlot={onRejectSlot}
          onOpenResponseModal={onOpenResponseModal}
        />

        <QuotesCard
          quotes={transformedQuotes.filter(q => q.provider_id === currentUserId)}
          userRole="provider"
          showActions={true}
          onRespondToQuote={onRespondToQuote}
        />
      </div>
    </TabsContent>
  )
}
