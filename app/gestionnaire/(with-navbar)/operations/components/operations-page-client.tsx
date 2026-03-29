'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageActions } from '@/components/page-actions'
import { TaskTypeSegment, type TaskType } from '@/components/operations/task-type-segment'
import { RemindersNavigator } from '@/components/operations/reminders-navigator'
import { WhatsAppTriageNavigator } from '@/components/operations/whatsapp-triage-navigator'
import { AiAssistantEmptyState } from '@/components/operations/ai-assistant-empty-state'
import { InterventionsPageClient } from '../../interventions/interventions-page-client'
import { useReminderActions } from '@/hooks/use-reminder-actions'
import { useNavigationPending } from '@/hooks/use-navigation-pending'
import { useSubscription } from '@/hooks/use-subscription'
import type { ReminderWithRelations } from '@/lib/types/reminder.types'
import type { WhatsAppTriageItem } from '@/app/actions/whatsapp-triage-actions'

interface OperationsPageClientProps {
  initialInterventions: Record<string, unknown>[]
  initialInterventionTotal: number
  initialInterventionHasMore: boolean
  reminders: ReminderWithRelations[]
  whatsappTriageItems?: WhatsAppTriageItem[]
  isAiSubscribed?: boolean
  teamId: string
  userId: string
  pageSize: number
}

export function OperationsPageClient({
  initialInterventions,
  initialInterventionTotal,
  initialInterventionHasMore,
  reminders,
  whatsappTriageItems = [],
  isAiSubscribed = false,
  teamId,
  userId,
  pageSize,
}: OperationsPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { handleStartReminder, handleCompleteReminder, handleCancelReminder } = useReminderActions()
  const { isPending: isNavigatingIntervention, navigate: navigateIntervention } = useNavigationPending()
  const { isPending: isNavigatingReminder, navigate: navigateReminder } = useNavigationPending()
  const { isReadOnly, loading: subscriptionLoading } = useSubscription()
  const urlTypeParam = searchParams.get('type')
  const validTypes: TaskType[] = ['assistant_ia', 'intervention', 'rappel']
  const urlType = validTypes.includes(urlTypeParam as TaskType) ? (urlTypeParam as TaskType) : null
  const initialType = urlType || (whatsappTriageItems.length > 0 ? 'assistant_ia' : 'intervention')
  const [activeType, setActiveType] = useState<TaskType>(initialType)

  const handleTypeChange = (type: TaskType) => {
    setActiveType(type)
    // Update URL without full navigation
    const url = new URL(window.location.href)
    url.searchParams.set('type', type)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <>
      <PageActions>
        <Button
          className="flex items-center gap-2"
          disabled={!subscriptionLoading && isReadOnly}
          title={isReadOnly ? 'Activez votre abonnement' : undefined}
          onClick={() => navigateIntervention("/gestionnaire/operations/nouvelle-intervention")}
          isLoading={isNavigatingIntervention}
          loadingText="Nouvelle intervention"
        >
          <Plus className="h-4 w-4" />Nouvelle intervention
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          disabled={!subscriptionLoading && isReadOnly}
          title={isReadOnly ? 'Activez votre abonnement' : undefined}
          onClick={() => navigateReminder("/gestionnaire/operations/nouveau-rappel")}
          isLoading={isNavigatingReminder}
          loadingText="Nouveau rappel"
        >
          <Bell className="h-4 w-4" />Nouveau rappel
        </Button>
      </PageActions>

      <div className="content-max-width px-5 sm:px-6 lg:px-10 pt-4 pb-2">
        <TaskTypeSegment
          activeType={activeType}
          onTypeChange={handleTypeChange}
          assistantIaCount={whatsappTriageItems.length}
          interventionCount={initialInterventionTotal}
          reminderCount={reminders.length}
        />
      </div>

      {activeType === 'assistant_ia' ? (
        <div className="flex-1 flex flex-col layout-container">
          {!isAiSubscribed && whatsappTriageItems.length === 0 ? (
            <AiAssistantEmptyState />
          ) : (
            <WhatsAppTriageNavigator items={whatsappTriageItems} />
          )}
        </div>
      ) : activeType === 'intervention' ? (
        <InterventionsPageClient
          initialInterventions={initialInterventions}
          teamId={teamId}
          userId={userId}
          initialTotal={initialInterventionTotal}
          initialHasMore={initialInterventionHasMore}
          pageSize={pageSize}
          hidePageActions
        />
      ) : (
        <div className="flex-1 flex flex-col layout-container">
          <RemindersNavigator
            reminders={reminders}
            emptyStateConfig={{
              title: 'Aucun rappel',
              description: 'Creez votre premier rappel pour commencer',
              showCreateButton: true,
              createButtonText: 'Creer un rappel',
              createButtonAction: () => router.push('/gestionnaire/operations/nouveau-rappel'),
            }}
            onStart={handleStartReminder}
            onComplete={handleCompleteReminder}
            onCancel={handleCancelReminder}
          />
        </div>
      )}
    </>
  )
}
