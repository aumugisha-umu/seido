'use client'

/**
 * Locataire Intervention Detail Client Component
 * Simpler view for tenants with limited actions
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InterventionOverviewCard } from '@/components/interventions/intervention-overview-card'
import { StatusTimeline } from '@/components/interventions/status-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentsTab } from '@/app/gestionnaire/(no-navbar)/interventions/[id]/components/documents-tab'
import { ExecutionTab } from '@/components/intervention/tabs/execution-tab'
import { selectTimeSlotAction, validateByTenantAction } from '@/app/actions/intervention-actions'
import { toast } from 'sonner'
import { Activity, FileText, Building2, MapPin, Calendar } from 'lucide-react'

// Intervention components
import { DetailPageHeader } from '@/components/ui/detail-page-header'
import type { DetailPageHeaderBadge, DetailPageHeaderMetadata } from '@/components/ui/detail-page-header'
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
  creator?: {
    id: string
    name: string
    email: string | null
    role: string
  }
}

type Document = Database['public']['Tables']['intervention_documents']['Row']
type Thread = Database['public']['Tables']['conversation_threads']['Row']
type User = Database['public']['Tables']['users']['Row']

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: User
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: User
  responses?: TimeSlotResponse[]
}

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

  // Transform assignments into Contact arrays by role
  const { managers, providers, tenants } = useMemo(() => {
    // Locataire component might not have assignments prop, use empty array as fallback
    const assignmentList = (intervention as any).assignments || []

    const managers = assignmentList
      .filter((a: any) => a.role === 'gestionnaire')
      .map((a: any) => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'gestionnaire' as const
      }))
      .filter((c: any) => c.id)

    const providers = assignmentList
      .filter((a: any) => a.role === 'prestataire')
      .map((a: any) => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'prestataire' as const
      }))
      .filter((c: any) => c.id)

    const tenants = assignmentList
      .filter((a: any) => a.role === 'locataire')
      .map((a: any) => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'locataire' as const
      }))
      .filter((c: any) => c.id)

    return { managers, providers, tenants }
  }, [intervention])

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
      type: intervention.type || '',
      status: intervention.status || '',
      title: intervention.title || '',
      description: intervention.description,
      priority: intervention.priority,
      urgency: intervention.urgency,
      reference: intervention.reference || '',
      created_at: intervention.created_at,
      created_by: intervention.creator?.name || 'Utilisateur',
      location: intervention.specific_location,
      lot: intervention.lot ? {
        reference: intervention.lot.reference || '',
        building: intervention.lot.building ? {
          name: intervention.lot.building.name || ''
        } : undefined
      } : undefined,
      building: intervention.building ? {
        name: intervention.building.name || ''
      } : undefined
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

  // Helper functions for DetailPageHeader
  const getStatusBadge = (): DetailPageHeaderBadge => {
    const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
      'demande': { label: 'Demande', color: 'bg-blue-50 border-blue-200 text-blue-900', dotColor: 'bg-blue-500' },
      'approuvee': { label: 'Approuvée', color: 'bg-green-50 border-green-200 text-green-900', dotColor: 'bg-green-500' },
      'demande_de_devis': { label: 'Demande de devis', color: 'bg-amber-50 border-amber-200 text-amber-900', dotColor: 'bg-amber-500' },
      'planification': { label: 'Planification', color: 'bg-purple-50 border-purple-200 text-purple-900', dotColor: 'bg-purple-500' },
      'planifiee': { label: 'Planifiée', color: 'bg-indigo-50 border-indigo-200 text-indigo-900', dotColor: 'bg-indigo-500' },
      'en_cours': { label: 'En cours', color: 'bg-cyan-50 border-cyan-200 text-cyan-900', dotColor: 'bg-cyan-500' },
      'cloturee_par_locataire': { label: 'Clôturée', color: 'bg-emerald-50 border-emerald-200 text-emerald-900', dotColor: 'bg-emerald-500' },
      'cloturee_par_gestionnaire': { label: 'Clôturée', color: 'bg-slate-50 border-slate-200 text-slate-900', dotColor: 'bg-slate-500' },
      'annulee': { label: 'Annulée', color: 'bg-red-50 border-red-200 text-red-900', dotColor: 'bg-red-500' },
      'rejetee': { label: 'Rejetée', color: 'bg-red-50 border-red-200 text-red-900', dotColor: 'bg-red-500' }
    }
    const config = statusConfig[intervention.status] || statusConfig['demande']
    return {
      label: config.label,
      color: config.color,
      dotColor: config.dotColor
    }
  }

  const getUrgencyBadge = (): DetailPageHeaderBadge | null => {
    const urgency = intervention.urgency || 'normale'
    if (urgency === 'normale') return null

    const urgencyConfig: Record<string, { label: string; color: string; dotColor: string }> = {
      'haute': { label: 'Urgent', color: 'bg-red-50 border-red-200 text-red-900', dotColor: 'bg-red-500' },
      'moyenne': { label: 'Prioritaire', color: 'bg-yellow-50 border-yellow-200 text-yellow-900', dotColor: 'bg-yellow-500' }
    }
    const config = urgencyConfig[urgency]
    return config ? {
      label: config.label,
      color: config.color,
      dotColor: config.dotColor
    } : null
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getMetadata = (): DetailPageHeaderMetadata[] => {
    const metadata: DetailPageHeaderMetadata[] = []

    if (intervention.building?.name) {
      metadata.push({ icon: Building2, text: intervention.building.name })
    }

    if (intervention.lot?.reference) {
      metadata.push({ icon: MapPin, text: `Lot ${intervention.lot.reference}` })
    }

    // Note: Pas de "Créé par" pour le locataire (moins pertinent)

    if (intervention.created_at) {
      metadata.push({ icon: Calendar, text: formatDate(intervention.created_at) })
    }

    return metadata
  }

  return (
    <>
      {/* Intervention Detail Header with Action Panel */}
      <DetailPageHeader
        onBack={() => router.push('/locataire/interventions')}
        backButtonText="Retour"
        title={intervention.title}
        badges={[getStatusBadge(), getUrgencyBadge()].filter((badge): badge is DetailPageHeaderBadge => badge !== null)}
        metadata={getMetadata()}
        actionButtons={
          <InterventionActionPanelHeader
            intervention={{
              id: intervention.id,
              title: intervention.title,
              status: intervention.status,
              tenant_id: intervention.tenant_id || undefined,
              scheduled_date: intervention.scheduled_date || undefined,
              assignments: (intervention as any).assignments || []
            }}
            userRole="locataire"
            userId={currentUser.id}
            onActionComplete={handleActionComplete}
          />
        }
        hasGlobalNav={false}
      />

      <div className="layout-padding h-full bg-slate-50 flex flex-col overflow-hidden">
        {/* Modals */}
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
          managers={managers}
          selectedManagers={managers.map(m => m.id)}
          onManagerToggle={() => {}}
          providers={providers}
          selectedProviders={providers.map(p => p.id)}
          onProviderToggle={() => {}}
          tenants={tenants}
          selectedTenants={tenants.map(t => t.id)}
          onTenantToggle={() => {}}
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

        {/* Tabs Navigation */}
        <div className="content-max-width mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 mb-6">
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
              <InterventionOverviewCard
                intervention={intervention}
                managers={managers}
                providers={providers}
                tenants={tenants}
                requireQuote={false}
                quotes={[]}
                schedulingType={
                  intervention.scheduled_date
                    ? 'fixed'
                    : timeSlots.length > 0
                    ? 'slots'
                    : null
                }
                schedulingSlots={timeSlots
                  .filter(ts => ts.slot_date && ts.start_time && ts.end_time)
                  .map(ts => ({
                    date: ts.slot_date!,
                    startTime: ts.start_time!,
                    endTime: ts.end_time!
                  }))}
                fullTimeSlots={timeSlots}
                currentUserId={currentUser.id}
                currentUserRole="locataire"
                onUpdate={() => router.refresh()}
              />
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
        </div>
      </div>
    </>
  )
}