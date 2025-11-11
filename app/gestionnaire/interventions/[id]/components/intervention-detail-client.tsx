'use client'

/**
 * Gestionnaire Intervention Detail Client Component
 * Manages tabs and interactive elements for intervention details
 */

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Tab components
import { OverviewTab } from './overview-tab'
import { ChatTab } from './chat-tab'
import { DocumentsTab } from './documents-tab'
import { QuotesTab } from './quotes-tab'
import { ActivityTab } from './activity-tab'
import { ExecutionTab } from '@/components/intervention/tabs/execution-tab'

// Intervention components
import { InterventionDetailHeader } from '@/components/intervention/intervention-detail-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'

// Hooks
import { useAuth } from '@/hooks/use-auth'
import { useInterventionPlanning } from '@/hooks/use-intervention-planning'
import { useTeamStatus } from '@/hooks/use-team-status'
import { useToast } from '@/hooks/use-toast'

// Contact selector
import { ContactSelector, type ContactSelectorRef } from '@/components/contact-selector'

// Actions
import { assignUserAction, unassignUserAction } from '@/app/actions/intervention-actions'

// Modals
import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'
import { CancelSlotModal } from '@/components/intervention/modals/cancel-slot-modal'
import { RejectSlotModal } from '@/components/intervention/modals/reject-slot-modal'

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
  initialMessagesByThread?: Record<string, any[]>
  initialParticipantsByThread?: Record<string, any[]>
  activityLogs: ActivityLog[]
}

export function InterventionDetailClient({
  intervention,
  assignments,
  documents,
  quotes,
  timeSlots,
  threads,
  initialMessagesByThread,
  initialParticipantsByThread,
  activityLogs
}: InterventionDetailClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { currentUserTeam } = useTeamStatus()
  const { toast } = useToast()
  const planning = useInterventionPlanning()
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Ref for ContactSelector modal
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Transform assignments into Contact arrays by role
  const { managers, providers, tenants } = useMemo(() => {
    const managers = assignments
      .filter(a => a.role === 'gestionnaire')
      .map(a => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'gestionnaire' as const
      }))
      .filter(c => c.id) // Remove empty contacts

    const providers = assignments
      .filter(a => a.role === 'prestataire')
      .map(a => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'prestataire' as const
      }))
      .filter(c => c.id)

    const tenants = assignments
      .filter(a => a.role === 'locataire')
      .map(a => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'locataire' as const
      }))
      .filter(c => c.id)

    return { managers, providers, tenants }
  }, [assignments])

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

  // Handlers for adding/modifying participants (gestionnaires et prestataires uniquement)
  const handleOpenManagerModal = () => {
    contactSelectorRef.current?.openContactModal('manager')
  }

  const handleOpenProviderModal = () => {
    contactSelectorRef.current?.openContactModal('provider')
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
      reference: intervention.reference,
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
      // No slots + status "planification" = "organize" (flexible) mode was selected
      // Pre-select "organize" option for edit mode
      planning.setProgrammingOption('organize')
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
    <div className="layout-padding container content-max-width py-6 space-y-6">
      {/* Intervention Detail Header with Action Panel */}
      <InterventionDetailHeader
        intervention={{
          id: intervention.id,
          title: intervention.title,
          reference: intervention.reference || '',
          status: intervention.status,
          urgency: intervention.urgency || 'normale',
          createdAt: intervention.created_at || '',
          createdBy: intervention.creator?.name || 'Utilisateur',
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
            onProposeSlots={handleOpenProgrammingModalWithData}
            timeSlots={timeSlots}
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
        managers={managers}
        selectedManagers={managers.map(m => m.id)}
        onManagerToggle={() => {}}
        onOpenManagerModal={handleOpenManagerModal}
        providers={providers}
        selectedProviders={providers.map(p => p.id)}
        onProviderToggle={() => {}}
        onOpenProviderModal={handleOpenProviderModal}
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
        onSuccess={handleRefresh}
      />

      {/* Reject Slot Modal */}
      <RejectSlotModal
        isOpen={planning.rejectSlotModal.isOpen}
        onClose={planning.closeRejectSlotModal}
        slot={planning.rejectSlotModal.slot}
        interventionId={intervention.id}
        onSuccess={handleRefresh}
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
          <TabsTrigger value="time-slots" className="relative">
            Exécution
            {getBadgeCount('time-slots') && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 z-50">
                {getBadgeCount('time-slots')}
              </span>
            )}
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

        <TabsContent value="time-slots" className="space-y-6">
          <ExecutionTab
            interventionId={intervention.id}
            timeSlots={timeSlots}
            currentStatus={intervention.status}
            intervention={{
              id: intervention.id,
              type: intervention.type || '',
              status: intervention.status || '',
              title: intervention.title || '',
              description: intervention.description,
              priority: intervention.priority,
              urgency: intervention.urgency,
              reference: intervention.reference,
              created_at: intervention.created_at,
              location: intervention.specific_location,
            }}
            onOpenProgrammingModal={handleOpenProgrammingModalWithData}
            onCancelSlot={(slot) => planning.openCancelSlotModal(slot, intervention.id)}
            onRejectSlot={(slot) => planning.openRejectSlotModal(slot, intervention.id)}
            currentUserId={user?.id}
          />
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <ChatTab
            interventionId={intervention.id}
            threads={threads}
            initialMessagesByThread={initialMessagesByThread}
            initialParticipantsByThread={initialParticipantsByThread}
            currentUserId={user?.id || ''}
            userRole={user?.role || 'gestionnaire'}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DocumentsTab
            interventionId={intervention.id}
            documents={documents}
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

      {/* Contact Selector Modal */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={intervention.team_id || currentUserTeam?.id || ""}
        displayMode="compact"
        hideUI={true}
        selectedContacts={{
          manager: managers,
          provider: providers
        }}
        onContactSelected={async (contact, contactType) => {
          try {
            if (contactType === 'manager') {
              const result = await assignUserAction(intervention.id, contact.id, 'gestionnaire')
              if (result.success) {
                toast({ title: 'Gestionnaire ajouté', variant: 'default' })
              } else {
                toast({
                  title: 'Erreur',
                  description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
                  variant: 'destructive'
                })
              }
            } else if (contactType === 'provider') {
              const result = await assignUserAction(intervention.id, contact.id, 'prestataire')
              if (result.success) {
                toast({ title: 'Prestataire ajouté', variant: 'default' })
              } else {
                toast({
                  title: 'Erreur',
                  description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
                  variant: 'destructive'
                })
              }
            }
            handleRefresh()
          } catch (error) {
            console.error('Error assigning contact:', error)
            toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
          }
        }}
        onContactCreated={async (contact, contactType) => {
          try {
            if (contactType === 'manager') {
              const result = await assignUserAction(intervention.id, contact.id, 'gestionnaire')
              if (result.success) {
                toast({ title: 'Gestionnaire créé et ajouté', variant: 'default' })
              } else {
                toast({
                  title: 'Erreur',
                  description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
                  variant: 'destructive'
                })
              }
            } else if (contactType === 'provider') {
              const result = await assignUserAction(intervention.id, contact.id, 'prestataire')
              if (result.success) {
                toast({ title: 'Prestataire créé et ajouté', variant: 'default' })
              } else {
                toast({
                  title: 'Erreur',
                  description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
                  variant: 'destructive'
                })
              }
            }
            handleRefresh()
          } catch (error) {
            console.error('Error creating and assigning contact:', error)
            toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
          }
        }}
        onContactRemoved={async (contactId, contactType) => {
          try {
            if (contactType === 'manager') {
              const result = await unassignUserAction(intervention.id, contactId, 'gestionnaire')
              if (result.success) {
                toast({ title: 'Gestionnaire retiré', variant: 'default' })
              } else {
                toast({
                  title: 'Erreur',
                  description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
                  variant: 'destructive'
                })
              }
            } else if (contactType === 'provider') {
              const result = await unassignUserAction(intervention.id, contactId, 'prestataire')
              if (result.success) {
                toast({ title: 'Prestataire retiré', variant: 'default' })
              } else {
                toast({
                  title: 'Erreur',
                  description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
                  variant: 'destructive'
                })
              }
            }
            handleRefresh()
          } catch (error) {
            console.error('Error removing contact:', error)
            toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
          }
        }}
      />
    </div>
  )
}