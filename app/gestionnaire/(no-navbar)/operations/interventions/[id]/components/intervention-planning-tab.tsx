import { TabsContent } from '@/components/ui/tabs'
import {
  PlanningCard,
  QuotesCard,
  type Quote as SharedQuote,
  type TimeSlot as SharedTimeSlot,
} from '@/components/interventions/shared'

interface InterventionPlanningTabProps {
  interventionId: string
  schedulingType: string | null
  scheduledDate: string | null
  scheduledStartTime: string | null
  serverUserId: string
  transformedTimeSlots: SharedTimeSlot[]
  transformedQuotes: SharedQuote[]
  requireQuote: boolean
  onApproveSlot: (slotId: string) => void
  onRejectSlot: (slotId: string) => void
  onEditSlot: (slotId: string) => void
  onCancelSlot: (slotId: string) => void
  onChooseSlot: (slotId: string) => void
  onOpenResponseModal: (slotId: string) => void
  onApproveQuote: (quoteId: string) => void
  onRejectQuote: (quoteId: string) => void
  onCancelQuote: (quoteId: string) => void
}

export function InterventionPlanningTab({
  schedulingType,
  scheduledDate,
  scheduledStartTime,
  serverUserId,
  transformedTimeSlots,
  transformedQuotes,
  requireQuote,
  onApproveSlot,
  onRejectSlot,
  onEditSlot,
  onCancelSlot,
  onChooseSlot,
  onOpenResponseModal,
  onApproveQuote,
  onRejectQuote,
  onCancelQuote,
}: InterventionPlanningTabProps) {
  return (
    <TabsContent value="planning" className="mt-0 flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto">
        <PlanningCard
          timeSlots={transformedTimeSlots}
          scheduledDate={scheduledDate || undefined}
          scheduledStartTime={scheduledStartTime || undefined}
          schedulingType={schedulingType as 'fixed' | 'slots' | 'flexible' | null}
          userRole="manager"
          currentUserId={serverUserId}
          onApproveSlot={onApproveSlot}
          onRejectSlot={onRejectSlot}
          onEditSlot={onEditSlot}
          onCancelSlot={onCancelSlot}
          onChooseSlot={onChooseSlot}
          onOpenResponseModal={onOpenResponseModal}
        />

        {requireQuote && (
          <QuotesCard
            quotes={transformedQuotes}
            userRole="manager"
            showActions={true}
            onAddQuote={() => { /* TODO: implement add quote */ }}
            onApproveQuote={onApproveQuote}
            onRejectQuote={onRejectQuote}
            onCancelQuote={onCancelQuote}
          />
        )}
      </div>
    </TabsContent>
  )
}
