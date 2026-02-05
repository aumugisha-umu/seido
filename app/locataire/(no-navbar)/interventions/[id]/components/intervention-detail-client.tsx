'use client'

/**
 * Locataire Intervention Detail Client Component
 * Simpler view for tenants with limited actions
 * Utilise les composants partagés BEM pour le nouveau design
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TabsContent } from '@/components/ui/tabs'
import { selectTimeSlotAction, validateByTenantAction } from '@/app/actions/intervention-actions'
import { toast } from 'sonner'
import { formatErrorMessage } from '@/lib/utils/error-formatter'
import { Building2, MapPin, Calendar } from 'lucide-react'

// Composants partagés pour le nouveau design
import {
  // Types
  TimeSlot as SharedTimeSlot,
  InterventionDocument,
  // Layout
  ContentWrapper,
  // Cards
  InterventionDetailsCard,
  DocumentsCard,
  PlanningCard
} from '@/components/interventions/shared'

// Unified tabs component (replaces InterventionTabs)
import {
  EntityTabs,
  TabContentWrapper,
  getInterventionTabsConfig
} from '@/components/shared/entity-preview'

// Tab Localisation dédié
import { LocalisationTab } from '@/components/interventions/shared/tabs/localisation-tab'

// Chat component (functional, not mock)
import { InterventionChatTab } from '@/components/interventions/intervention-chat-tab'

// Intervention components
import { DetailPageHeader } from '@/components/ui/detail-page-header'
import type { DetailPageHeaderBadge, DetailPageHeaderMetadata } from '@/components/ui/detail-page-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'

// Modals
// ProgrammingModal removed - locataires don't need to program interventions
// import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'
import { CancelSlotModal } from '@/components/intervention/modals/cancel-slot-modal'
import { MultiSlotResponseModal } from '@/components/intervention/modals/multi-slot-response-modal'

// Hooks
import { useInterventionPlanning } from '@/hooks/use-intervention-planning'
import { useAutoExecuteAction } from '@/hooks/use-auto-execute-action'
import { useActivityLogs } from '@/hooks/use-activity-logs'

// Activity tab (shared)
import { ActivityTab } from '@/components/interventions/activity-tab'

// Confirmation banners
import {
  ConfirmationRequiredBanner,
  ConfirmationSuccessBanner,
  ConfirmationRejectedBanner
} from '@/components/intervention/confirmation-required-banner'
import {
  getParticipantPermissions,
  hasConfirmed,
  hasRejected
} from '@/lib/utils/intervention-permissions'

import type { Database } from '@/lib/database.types'

type AddressRecord = Database['public']['Tables']['addresses']['Row'] | null

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row'] & {
    address_record?: AddressRecord
  }
  lot?: Database['public']['Tables']['lots']['Row'] & {
    address_record?: AddressRecord
    building?: Database['public']['Tables']['buildings']['Row'] & {
      address_record?: AddressRecord
    }
  }
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
  initialMessagesByThread?: Record<string, any[]>
  initialParticipantsByThread?: Record<string, any[]>
}

export function LocataireInterventionDetailClient({
  intervention,
  documents,
  threads,
  timeSlots,
  currentUser,
  initialMessagesByThread,
  initialParticipantsByThread
}: LocataireInterventionDetailClientProps) {
  const router = useRouter()
  const planning = useInterventionPlanning()
  const [activeTab, setActiveTab] = useState('general')

  // ============================================================================
  // Auto-Execute Actions from Email Magic Links
  // ============================================================================

  // Hook to auto-execute actions from email buttons (e.g., "Accepter ce créneau")
  useAutoExecuteAction({
    interventionId: intervention.id,
    handlers: {
      // Locataire accepts a proposed time slot
      confirm_slot: async ({ slotId }) => {
        const result = await selectTimeSlotAction(intervention.id, slotId)
        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de la sélection du créneau')
        }
        router.refresh()
      },
      // Locataire rejects a time slot
      reject_slot: async ({ slotId }) => {
        // For rejection, we open the modal since a reason is usually required
        const slot = timeSlots.find(s => s.id === slotId)
        if (slot) {
          const formattedSlot = {
            id: slot.id,
            slot_date: slot.slot_date || '',
            start_time: slot.start_time || '',
            end_time: slot.end_time || '',
            notes: (slot as any).notes || null,
            proposer_name: slot.proposed_by_user?.first_name
              ? `${slot.proposed_by_user.first_name} ${slot.proposed_by_user.last_name || ''}`
              : slot.proposed_by_user?.company_name,
            proposer_role: slot.proposed_by_user?.role as 'gestionnaire' | 'prestataire' | 'locataire' | undefined,
            responses: (slot as any).responses?.map((r: any) => ({
              user_id: r.user_id,
              response: r.response as 'accepted' | 'rejected' | 'pending',
              user: {
                name: r.user?.first_name
                  ? `${r.user.first_name} ${r.user.last_name || ''}`
                  : r.user?.company_name || 'Utilisateur',
                role: r.user?.role
              }
            })) || []
          }
          planning.openSlotResponseModal([formattedSlot], intervention.id)
        }
        throw new Error('Veuillez indiquer la raison du refus')
      },
      // Locataire validates completed work
      validate_intervention: async ({ type }) => {
        if (type === 'approve') {
          const result = await validateByTenantAction(intervention.id)
          if (!result.success) {
            throw new Error(result.error || 'Erreur lors de la validation')
          }
          router.refresh()
        } else if (type === 'contest') {
          // Contest requires opening a modal or navigating to a form
          // For now, redirect to the intervention page where they can add a comment
          toast.info('Veuillez utiliser le chat pour signaler le problème')
          setActiveTab('conversations')
        }
      }
    },
    onSuccess: (action) => {
      if (action === 'confirm_slot') {
        toast.success('Créneau confirmé avec succès')
      } else if (action === 'validate_intervention') {
        toast.success('Intervention validée avec succès')
      }
    }
  })

  // Thread type à utiliser pour InterventionChatTab
  const [defaultThreadType, setDefaultThreadType] = useState<string | undefined>(undefined)

  // Local state for threads with unread counts (for optimistic updates)
  const [localThreads, setLocalThreads] = useState(threads)

  // Get assignments from intervention (locataire component uses nested data)
  const assignmentList = useMemo(() => {
    return (intervention as any).assignments || []
  }, [intervention])

  // ============================================================================
  // Tabs Configuration (unified with EntityTabs)
  // ============================================================================

  // Calculate total unread messages across all threads (uses local state for optimistic updates)
  const totalUnreadMessages = useMemo(() => {
    return localThreads.reduce((total, t) => {
      const unread = (t as any).unread_count || 0
      return total + unread
    }, 0)
  }, [localThreads])

  // Handler for marking a thread as read (optimistic update)
  const handleThreadRead = (threadId: string) => {
    setLocalThreads(prevThreads =>
      prevThreads.map(t =>
        t.id === threadId ? { ...t, unread_count: 0 } : t
      )
    )
  }

  // Activity logs for Activity tab
  const { activities: activityLogs } = useActivityLogs({
    teamId: intervention.team_id ?? undefined,
    entityType: 'intervention',
    entityId: intervention.id,
    limit: 100
  })

  // Build tabs with hasUnread indicator for conversations
  const interventionTabs = useMemo(() => {
    const baseTabs = getInterventionTabsConfig('tenant')
    return baseTabs.map(tab => {
      if (tab.value === 'conversations') {
        return { ...tab, hasUnread: totalUnreadMessages > 0 }
      }
      return tab
    })
  }, [totalUnreadMessages])

  // ============================================================================
  // Participant Confirmation Logic
  // ============================================================================

  // Check if current user is the creator (tenant can be creator of their own interventions)
  const isCreator = intervention.created_by === currentUser.id

  // Find current user's assignment
  const currentUserAssignment = useMemo(() => {
    return assignmentList.find((a: any) => a.user_id === currentUser.id)
  }, [assignmentList, currentUser.id])

  // Build intervention confirmation info
  const interventionConfirmationInfo = useMemo(() => ({
    requires_participant_confirmation: intervention.requires_participant_confirmation ?? false
  }), [intervention.requires_participant_confirmation])

  // Build assignment confirmation info
  const assignmentConfirmationInfo = useMemo(() => {
    if (!currentUserAssignment) return null
    return {
      requires_confirmation: currentUserAssignment.requires_confirmation ?? false,
      confirmation_status: (currentUserAssignment.confirmation_status ?? 'not_required') as 'pending' | 'confirmed' | 'rejected' | 'not_required'
    }
  }, [currentUserAssignment])

  // Get permissions for current user
  const participantPermissions = useMemo(() => {
    return getParticipantPermissions(
      interventionConfirmationInfo,
      assignmentConfirmationInfo,
      isCreator
    )
  }, [interventionConfirmationInfo, assignmentConfirmationInfo, isCreator])

  // Determine which banner to show
  const showConfirmationBanner = participantPermissions.canConfirm
  const showConfirmedBanner = !isCreator && hasConfirmed(assignmentConfirmationInfo)
  const showRejectedBanner = !isCreator && hasRejected(assignmentConfirmationInfo)

  // Callback after confirmation/rejection
  const handleConfirmationResponse = () => {
    router.refresh()
  }

  // Transform assignments into Contact arrays by role
  const { managers, providers, tenants } = useMemo(() => {

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
  }, [assignmentList])

  // ============================================================================
  // Transformations pour les composants shared (nouveau design PreviewHybrid)
  // ============================================================================

  // Participants pour InterventionDetailsCard (ligne Participants dans l'onglet Général)
  const participants = useMemo(() => {
    return {
      managers: assignmentList
        .filter((a: any) => a.role === 'gestionnaire' && a.user)
        .map((a: any) => ({
          id: a.user.id,
          name: a.user.name || '',
          email: a.user.email || undefined,
          phone: a.user.phone || undefined,
          role: 'manager' as const
        })),
      providers: assignmentList
        .filter((a: any) => a.role === 'prestataire' && a.user)
        .map((a: any) => ({
          id: a.user.id,
          name: a.user.name || '',
          email: a.user.email || undefined,
          phone: a.user.phone || undefined,
          role: 'provider' as const
        })),
      tenants: assignmentList
        .filter((a: any) => a.role === 'locataire' && a.user)
        .map((a: any) => ({
          id: a.user.id,
          name: a.user.name || '',
          email: a.user.email || undefined,
          phone: a.user.phone || undefined,
          role: 'tenant' as const
        }))
    }
  }, [assignmentList])

  // TimeSlots transformés pour PlanningCard
  const transformedTimeSlots: SharedTimeSlot[] = useMemo(() =>
    timeSlots.map(slot => ({
      id: slot.id,
      slot_date: slot.slot_date || '',
      start_time: slot.start_time || '',
      end_time: slot.end_time || '',
      status: slot.status || 'pending',
      proposed_by: slot.proposed_by || undefined,
      proposed_by_user: slot.proposed_by_user ? { name: slot.proposed_by_user.name } : undefined,
      responses: slot.responses?.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        response: r.response as 'accepted' | 'rejected' | 'pending',
        user: r.user ? { name: r.user.name, role: r.user.role || '' } : undefined
      })),
      // Mode "date fixe": le gestionnaire a sélectionné directement une date
      selected_by_manager: slot.selected_by_manager || false
    }))
  , [timeSlots])

  // Documents transformés pour DocumentsCard
  const transformedDocuments: InterventionDocument[] = useMemo(() =>
    documents.map(d => ({
      id: d.id,
      name: (d as any).original_filename || d.filename || 'Document',
      type: d.document_type || 'file',
      size: d.file_size ? `${Math.round(d.file_size / 1024)} KB` : undefined,
      date: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('fr-FR') : undefined,
      url: d.storage_path || undefined
    }))
  , [documents])

  // Date planifiée (si un créneau est sélectionné)
  const confirmedSlot = timeSlots.find(s => s.status === 'selected')
  const scheduledDate = confirmedSlot?.slot_date || null
  const scheduledStartTime = confirmedSlot?.start_time || null

  // Handler pour ouvrir le chat depuis un participant (icône message dans ParticipantsRow)
  const handleOpenChatFromParticipant = (
    _participantId: string,
    threadType: 'group' | 'tenant_to_managers' | 'provider_to_managers'
  ) => {
    setDefaultThreadType(threadType)
    setActiveTab('conversations')
  }

  // Handle time slot selection (tenants can select in planification status)
  const handleSelectSlot = async (slotId: string) => {
    try {
      const result = await selectTimeSlotAction(intervention.id, slotId)
      if (result.success) {
        toast.success('Créneau sélectionné avec succès')
        router.refresh()
      } else {
        toast.error(formatErrorMessage(result.error, 'Erreur lors de la sélection du créneau'))
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
        toast.error(formatErrorMessage(result.error, 'Erreur lors de la validation des travaux'))
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

  // NOTE: ProgrammingModal functionality removed - locataires don't program interventions
  // Gestionnaires use /gestionnaire/interventions/modifier/[id] page instead

  // Helper functions for DetailPageHeader
  // Note: demande_de_devis removed - quote status tracked via QuoteStatusBadge
  const getStatusBadge = (): DetailPageHeaderBadge => {
    const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
      'demande': { label: 'Demande', color: 'bg-blue-50 border-blue-200 text-blue-900', dotColor: 'bg-blue-500' },
      'approuvee': { label: 'Approuvée', color: 'bg-green-50 border-green-200 text-green-900', dotColor: 'bg-green-500' },
      'planification': { label: 'Planification', color: 'bg-purple-50 border-purple-200 text-purple-900', dotColor: 'bg-purple-500' },
      'planifiee': { label: 'Planifiée', color: 'bg-indigo-50 border-indigo-200 text-indigo-900', dotColor: 'bg-indigo-500' },
      // Note: 'en_cours' removed from workflow
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
        onBack={() => router.push('/locataire/dashboard')}
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
        {/* ProgrammingModal removed - locataires don't program interventions */}

        {/* Cancel Slot Modal */}
        <CancelSlotModal
          isOpen={planning.cancelSlotModal.isOpen}
          onClose={planning.closeCancelSlotModal}
          slot={planning.cancelSlotModal.slot}
          interventionId={intervention.id}
          onSuccess={handleActionComplete}
        />

        {/* Multi Slot Response Modal (handles both accept/reject for multiple slots) */}
        <MultiSlotResponseModal
          isOpen={planning.slotResponseModal.isOpen}
          onClose={planning.closeSlotResponseModal}
          slots={planning.slotResponseModal.slots}
          interventionId={intervention.id}
          onSuccess={handleActionComplete}
        />

        {/* Layout pleine largeur sans sidebar */}
        <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <EntityTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={interventionTabs}
          >
              {/* TAB: GENERAL */}
              <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <ContentWrapper>
                  {/* Bannières de confirmation si nécessaire */}
                  {showConfirmationBanner && (
                    <ConfirmationRequiredBanner
                      interventionId={intervention.id}
                      scheduledDate={intervention.scheduled_date}
                      scheduledTime={null}
                      onConfirm={handleConfirmationResponse}
                      onReject={handleConfirmationResponse}
                    />
                  )}
                  {showConfirmedBanner && <ConfirmationSuccessBanner />}
                  {showRejectedBanner && <ConfirmationRejectedBanner />}

                  {/* Détails de l'intervention */}
                  <div className="flex-shrink-0">
                    <InterventionDetailsCard
                      title={intervention.title}
                      description={intervention.description || undefined}
                      instructions={intervention.instructions || undefined}
                      interventionStatus={intervention.status}
                      participants={participants}
                      currentUserId={currentUser.id}
                      currentUserRole="locataire"
                      onOpenChat={handleOpenChatFromParticipant}
                      planning={{
                        scheduledDate,
                        status: scheduledDate ? 'scheduled' : 'pending',
                        quotesCount: 0,
                        quotesStatus: 'pending'
                      }}
                    />
                  </div>

                  {/* Documents */}
                  <div className="mt-6 flex-1 min-h-0 overflow-hidden">
                    <DocumentsCard
                      documents={transformedDocuments}
                      userRole="tenant"
                      onView={(id) => console.log('View document:', id)}
                      onDownload={(id) => console.log('Download document:', id)}
                      className="overflow-hidden h-full"
                    />
                  </div>
                </ContentWrapper>
              </TabsContent>

              {/* TAB: LOCALISATION */}
              <TabsContent value="localisation" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                  <LocalisationTab
                    latitude={(() => {
                      const lotRecord = intervention.lot?.address_record
                      const buildingRecord = intervention.lot?.building?.address_record || intervention.building?.address_record
                      const record = lotRecord || buildingRecord
                      return record?.lat || undefined
                    })()}
                    longitude={(() => {
                      const lotRecord = intervention.lot?.address_record
                      const buildingRecord = intervention.lot?.building?.address_record || intervention.building?.address_record
                      const record = lotRecord || buildingRecord
                      return record?.lng || undefined
                    })()}
                    address={(() => {
                      const lotRecord = intervention.lot?.address_record
                      const buildingRecord = intervention.lot?.building?.address_record || intervention.building?.address_record
                      const record = lotRecord || buildingRecord
                      if (!record) return undefined
                      if (record.formatted_address) return record.formatted_address
                      return [record.street, record.postal_code, record.city].filter(Boolean).join(', ') || undefined
                    })()}
                    buildingName={intervention.lot?.building?.name || intervention.building?.name || undefined}
                    lotReference={intervention.lot?.reference || undefined}
                  />
                </div>
              </TabsContent>

              {/* TAB: CONVERSATIONS */}
              <TabsContent value="conversations" className="mt-0 flex-1 flex flex-col overflow-y-auto h-full">
                <InterventionChatTab
                  interventionId={intervention.id}
                  threads={localThreads}
                  initialMessagesByThread={initialMessagesByThread}
                  initialParticipantsByThread={initialParticipantsByThread}
                  currentUserId={currentUser.id}
                  userRole="locataire"
                  defaultThreadType={defaultThreadType}
                  onThreadTypeChange={(threadType) => setDefaultThreadType(threadType)}
                  onThreadRead={handleThreadRead}
                />
              </TabsContent>

              {/* TAB: ACTIVITÉ */}
              <TabsContent value="activity" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                  <ActivityTab
                    intervention={intervention}
                    activityLogs={activityLogs.map(log => ({
                      ...log,
                      user: (log as any).user_name ? {
                        id: (log as any).user_id,
                        name: (log as any).user_name,
                        email: (log as any).user_email || '',
                        avatar_url: (log as any).user_avatar_url || null
                      } : undefined
                    }))}
                  />
                </div>
              </TabsContent>

              {/* TAB: PLANNING */}
              <TabsContent value="planning" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6">
                  {/* Planning - Le locataire peut voir et sélectionner les créneaux */}
                  <PlanningCard
                    timeSlots={transformedTimeSlots}
                    scheduledDate={scheduledDate || undefined}
                    scheduledStartTime={scheduledStartTime || undefined}
                    userRole="tenant"
                    currentUserId={currentUser.id}
                    onSelectSlot={handleSelectSlot}
                    className="flex-1 min-h-0"
                  />
                </div>
              </TabsContent>
            </EntityTabs>
        </div>
      </div>
    </>
  )
}