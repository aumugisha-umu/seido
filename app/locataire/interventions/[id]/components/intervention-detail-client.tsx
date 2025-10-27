'use client'

/**
 * Locataire Intervention Detail Client Component
 * Simpler view for tenants with limited actions
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InterventionOverviewCard } from '@/components/interventions/intervention-overview-card'
import { StatusTimeline } from '@/components/interventions/status-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentsTab } from '@/app/gestionnaire/interventions/[id]/components/documents-tab'
import { ExecutionTab } from '@/components/intervention/tabs/execution-tab'
import { selectTimeSlotAction, validateByTenantAction } from '@/app/actions/intervention-actions'
import { toast } from 'sonner'
import { Activity, FileText, Calendar } from 'lucide-react'

// Intervention components
import { InterventionDetailHeader } from '@/components/intervention/intervention-detail-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'
import { ChatTab } from './chat-tab'

// Modals
import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'
import { CancelSlotModal } from '@/components/intervention/modals/cancel-slot-modal'
import { RejectSlotModal } from '@/components/intervention/modals/reject-slot-modal'

// Hooks
import { useInterventionPlanning } from '@/hooks/use-intervention-planning'

import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
}

type Document = Database['public']['Tables']['intervention_documents']['Row']
type Thread = Database['public']['Tables']['conversation_threads']['Row']
type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row']
type User = Database['public']['Tables']['users']['Row']

interface LocataireInterventionDetailClientProps {
  intervention: Intervention
  documents: Document[]
  threads: Thread[]
  timeSlots: TimeSlot[]
  currentUser: User
}

export function LocataireInterventionDetailClient({
  intervention,
  documents,
  threads,
  timeSlots,
  currentUser
}: LocataireInterventionDetailClientProps) {
  const router = useRouter()
  const planning = useInterventionPlanning()
  const [activeTab, setActiveTab] = useState('overview')

  // Handle time slot selection (tenants can select in planification status)
  const handleSelectSlot = async (slotId: string) => {
    try {
      const result = await selectTimeSlotAction(intervention.id, slotId)
      if (result.success) {
        toast.success('Créneau sélectionné avec succès')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error selecting slot:', error)
      toast.error('Erreur lors de la sélection du créneau')
    }
  }

  // Handle work validation
  const handleValidateWork = async (satisfaction?: number) => {
    try {
      const result = await validateByTenantAction(intervention.id, satisfaction)
      if (result.success) {
        toast.success('Travaux validés avec succès')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error validating work:', error)
      toast.error('Erreur lors de la validation des travaux')
    }
  }

  // Check if tenant can select time slot
  const canSelectSlot = intervention.status === 'planification' && timeSlots.length > 0

  // Handle action completion from action panel
  const handleActionComplete = () => {
    router.refresh()
  }

  // Handle opening programming modal with existing data pre-filled
  const handleOpenProgrammingModalWithData = () => {
    const interventionAction = {
      id: intervention.id,
      type: '',
      status: intervention.status || '',
      title: intervention.title || '',
      description: intervention.description,
      priority: intervention.priority,
      urgency: intervention.urgency,
      reference: intervention.reference || '',
      created_at: intervention.created_at,
      location: intervention.specific_location,
    }

    // Determine planning mode based on existing time slots
    if (timeSlots.length === 0) {
      // No slots yet - open with default mode
      planning.openProgrammingModal(interventionAction)
    } else if (timeSlots.length === 1) {
      // Single slot - likely "direct" mode
      const slot = timeSlots[0]
      planning.setProgrammingOption('direct')
      planning.setProgrammingDirectSchedule({
        date: slot.slot_date,
        startTime: slot.start_time,
        endTime: slot.end_time
      })
      planning.openProgrammingModal(interventionAction)
    } else {
      // Multiple slots - "propose" mode
      planning.setProgrammingOption('propose')
      planning.setProgrammingProposedSlots(
        timeSlots.map(slot => ({
          date: slot.slot_date,
          startTime: slot.start_time,
          endTime: slot.end_time
        }))
      )
      planning.openProgrammingModal(interventionAction)
    }
  }

  return (
    <div className="container max-w-6xl mx-auto space-y-6">
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
        onBack={() => router.push('/locataire/interventions')}
        onArchive={() => {
          // TODO: Implement archive logic for tenant
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
              scheduled_date: intervention.scheduled_date || undefined
            }}
            userRole="locataire"
            userId={currentUser.id}
            onActionComplete={handleActionComplete}
          />
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="execution">
            Exécution
            {timeSlots.length > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                {timeSlots.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="chat">
            Discussion
            {threads.length > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                {threads.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {documents.length > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                {documents.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              <InterventionOverviewCard intervention={intervention} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status timeline */}
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
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <ChatTab
            interventionId={intervention.id}
            threads={threads}
            currentUserId={currentUser.id}
            userRole="locataire"
          />
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          <ExecutionTab
            interventionId={intervention.id}
            timeSlots={timeSlots}
            currentStatus={intervention.status}
            intervention={{
              id: intervention.id,
              type: '',
              status: intervention.status || '',
              title: intervention.title || '',
              description: intervention.description,
              priority: intervention.priority,
              urgency: intervention.urgency,
              reference: intervention.reference || '',
              created_at: intervention.created_at,
              location: intervention.specific_location,
            }}
            onOpenProgrammingModal={handleOpenProgrammingModalWithData}
            onCancelSlot={(slot) => planning.openCancelSlotModal(slot, intervention.id)}
            onRejectSlot={(slot) => planning.openRejectSlotModal(slot, intervention.id)}
            currentUserId={currentUser?.id}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DocumentsTab
            interventionId={intervention.id}
            documents={documents}
            canManage={false}
          />
        </TabsContent>
      </Tabs>

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

      {/* Cancel Slot Modal */}
      <CancelSlotModal
        isOpen={planning.cancelSlotModal.isOpen}
        onClose={planning.closeCancelSlotModal}
        slot={planning.cancelSlotModal.slot}
        interventionId={intervention.id}
        onSuccess={handleActionComplete}
      />

      {/* Reject Slot Modal */}
      <RejectSlotModal
        isOpen={planning.rejectSlotModal.isOpen}
        onClose={planning.closeRejectSlotModal}
        slot={planning.rejectSlotModal.slot}
        interventionId={intervention.id}
        onSuccess={handleActionComplete}
      />
    </div>
  )
}