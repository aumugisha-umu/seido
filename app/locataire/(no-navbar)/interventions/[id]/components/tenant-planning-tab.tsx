import { TabsContent } from '@/components/ui/tabs'
import {
  PlanningCard,
  type TimeSlot as SharedTimeSlot,
} from '@/components/interventions/shared'

interface TenantPlanningTabProps {
  schedulingType: string | null
  scheduledDate: string | null
  scheduledStartTime: string | null
  currentUserId: string
  transformedTimeSlots: SharedTimeSlot[]
  onSelectSlot: (slotId: string) => void
  onAcceptSlot: (slotId: string) => void
  onRejectSlot: (slotId: string) => void
  onOpenResponseModal: (slotId: string) => void
}

export function TenantPlanningTab({
  schedulingType,
  scheduledDate,
  scheduledStartTime,
  currentUserId,
  transformedTimeSlots,
  onSelectSlot,
  onAcceptSlot,
  onRejectSlot,
  onOpenResponseModal,
}: TenantPlanningTabProps) {
  return (
    <TabsContent value="planning" className="mt-0 flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6">
        <PlanningCard
          timeSlots={transformedTimeSlots}
          scheduledDate={scheduledDate || undefined}
          scheduledStartTime={scheduledStartTime || undefined}
          schedulingType={schedulingType as 'fixed' | 'slots' | 'flexible' | null}
          userRole="tenant"
          currentUserId={currentUserId}
          onSelectSlot={onSelectSlot}
          onApproveSlot={onAcceptSlot}
          onRejectSlot={onRejectSlot}
          onOpenResponseModal={onOpenResponseModal}
          className="flex-1 min-h-0"
        />
      </div>
    </TabsContent>
  )
}
