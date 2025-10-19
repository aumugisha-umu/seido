'use client'

/**
 * Gestionnaire Intervention Detail Client Component
 * Manages tabs and interactive elements for intervention details
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Tab components
import { OverviewTab } from './overview-tab'
import { ChatTab } from './chat-tab'
import { DocumentsTab } from './documents-tab'
import { QuotesTab } from './quotes-tab'
import { TimeSlotsTab } from './time-slots-tab'
import { ActivityTab } from './activity-tab'

// Intervention components
import { InterventionDetailHeader } from '@/components/intervention/intervention-detail-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'

// Hooks
import { useAuth } from '@/hooks/use-auth'
import { useInterventionPlanning } from '@/hooks/use-intervention-planning'

// Modals
import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'

import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
}

type Assignment = Database['public']['Tables']['intervention_assignments']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type Document = Database['public']['Tables']['intervention_documents']['Row']

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
}

type Thread = Database['public']['Tables']['conversation_threads']['Row']

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

interface InterventionDetailClientProps {
  intervention: Intervention
  assignments: Assignment[]
  documents: Document[]
  quotes: Quote[]
  timeSlots: TimeSlot[]
  threads: Thread[]
  activityLogs: ActivityLog[]
}

export function InterventionDetailClient({
  intervention,
  assignments,
  documents,
  quotes,
  timeSlots,
  threads,
  activityLogs
}: InterventionDetailClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const planning = useInterventionPlanning()
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Handle action completion from action panel
  const handleActionComplete = () => {
    handleRefresh()
  }

  // Get badge counts for tabs
  const getBadgeCount = (tab: string) => {
    switch (tab) {
      case 'chat':
        return threads.length > 0 ? threads.length : undefined
      case 'documents':
        return documents.length > 0 ? documents.length : undefined
      case 'time-slots':
        return timeSlots.length > 0 ? timeSlots.length : undefined
      default:
        return undefined
    }
  }

  // Get separate badge counts for quotes tab
  const getQuotesBadges = () => {
    // Demandes en attente (pending requests - amount=0)
    const pendingRequests = quotes.filter(q =>
      q.status === 'pending' && (!q.amount || q.amount === 0)
    ).length

    // Devis soumis en attente de validation (submitted quotes - amount>0)
    const submittedQuotes = quotes.filter(q =>
      (q.status === 'pending' || q.status === 'sent') && q.amount && q.amount > 0
    ).length

    return { pendingRequests, submittedQuotes }
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {/* Intervention Detail Header with Action Panel */}
      <InterventionDetailHeader
        intervention={{
          id: intervention.id,
          title: intervention.title,
          reference: intervention.reference || '',
          status: intervention.status,
          urgency: intervention.urgency || 'normale',
          createdAt: intervention.created_at || '',
          createdBy: (intervention as any).creator_name || 'Utilisateur',
          lot: intervention.lot ? {
            reference: intervention.lot.reference || '',
            building: intervention.lot.building ? {
              name: intervention.lot.building.name || ''
            } : undefined
          } : undefined,
          building: intervention.building ? {
            name: intervention.building.name || ''
          } : undefined
        }}
        onBack={() => router.push('/gestionnaire/interventions')}
        onArchive={() => {
          // TODO: Implement archive logic
          console.log('Archive intervention')
        }}
        onStatusAction={(action) => {
          console.log('Status action:', action)
          // Actions are handled by InterventionActionPanelHeader
        }}
        displayMode="custom"
        actionPanel={
          <InterventionActionPanelHeader
            intervention={{
              id: intervention.id,
              title: intervention.title,
              status: intervention.status,
              tenant_id: intervention.tenant_id || undefined,
              scheduled_date: intervention.scheduled_date || undefined,
              quotes: quotes.map(q => ({
                id: q.id,
                status: q.status,
                providerId: q.provider_id,
                isCurrentUserQuote: q.provider_id === user?.id
              }))
            }}
            userRole="gestionnaire"
            userId={user?.id || ''}
            onActionComplete={handleActionComplete}
            onProposeSlots={() => planning.handleProgrammingModal({
              id: intervention.id,
              title: intervention.title,
              status: intervention.status
            })}
          />
        }
      />

      {/* Programming Modal */}
      <ProgrammingModal
        isOpen={planning.programmingModal.isOpen}
        onClose={planning.closeProgrammingModal}
        intervention={planning.programmingModal.intervention}
        programmingOption={planning.programmingOption}
        onProgrammingOptionChange={planning.setProgrammingOption}
        directSchedule={planning.programmingDirectSchedule}
        onDirectScheduleChange={planning.setProgrammingDirectSchedule}
        proposedSlots={planning.programmingProposedSlots}
        onAddProposedSlot={planning.addProgrammingSlot}
        onUpdateProposedSlot={planning.updateProgrammingSlot}
        onRemoveProposedSlot={planning.removeProgrammingSlot}
        selectedProviders={[]}
        onProviderToggle={() => {}}
        providers={[]}
        onConfirm={planning.handleProgrammingConfirm}
        isFormValid={planning.isProgrammingFormValid()}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="quotes" className="relative">
            Devis
            {(() => {
              const { pendingRequests, submittedQuotes } = getQuotesBadges()
              return (
                <div className="absolute -top-1 -right-1 flex gap-1 z-50">
                  {pendingRequests > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-1.5">
                      {pendingRequests}
                    </span>
                  )}
                  {submittedQuotes > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-1.5">
                      {submittedQuotes}
                    </span>
                  )}
                </div>
              )
            })()}
          </TabsTrigger>
          <TabsTrigger value="chat" className="relative">
            Discussion
            {getBadgeCount('chat') && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 z-50">
                {getBadgeCount('chat')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="relative">
            Documents
            {getBadgeCount('documents') && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 z-50">
                {getBadgeCount('documents')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="time-slots" className="relative">
            Créneaux
            {getBadgeCount('time-slots') && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 z-50">
                {getBadgeCount('time-slots')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            intervention={intervention}
            assignments={assignments}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="quotes" className="space-y-6">
          <QuotesTab
            interventionId={intervention.id}
            quotes={quotes}
            canManage={true}
          />
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <ChatTab
            interventionId={intervention.id}
            threads={threads}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DocumentsTab
            interventionId={intervention.id}
            documents={documents}
            canManage={true}
          />
        </TabsContent>

        <TabsContent value="time-slots" className="space-y-6">
          <TimeSlotsTab
            interventionId={intervention.id}
            timeSlots={timeSlots}
            currentStatus={intervention.status}
            canManage={true}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityTab
            intervention={intervention}
            activityLogs={activityLogs}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}