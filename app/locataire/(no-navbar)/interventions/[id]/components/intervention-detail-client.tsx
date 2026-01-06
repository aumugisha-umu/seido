'use client'

/**
 * Locataire Intervention Detail Client Component
 * Simpler view for tenants with limited actions
 * Utilise les composants partagés BEM pour le nouveau design
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TabsContent } from '@/components/ui/tabs'
import { DocumentsTab } from '@/app/gestionnaire/(no-navbar)/interventions/[id]/components/documents-tab'
import { selectTimeSlotAction, validateByTenantAction } from '@/app/actions/intervention-actions'
import { toast } from 'sonner'
import { Building2, MapPin, Calendar } from 'lucide-react'

// Composants partagés pour le nouveau design
import {
  // Types
  TimeSlot as SharedTimeSlot,
  Message,
  InterventionDocument,
  TimelineEventData,
  // Layout
  PreviewHybridLayout,
  ContentWrapper,
  InterventionTabs,
  // Sidebar
  InterventionSidebar,
  // Cards
  InterventionDetailsCard,
  DocumentsCard,
  PlanningCard,
  ConversationCard
} from '@/components/interventions/shared'

// Intervention components
import { DetailPageHeader } from '@/components/ui/detail-page-header'
import type { DetailPageHeaderBadge, DetailPageHeaderMetadata } from '@/components/ui/detail-page-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'
import { ChatTab } from './chat-tab'

// Modals
// ProgrammingModal removed - locataires don't need to program interventions
// import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'
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
  const [activeTab, setActiveTab] = useState('general')

  // États pour le nouveau design PreviewHybrid
  const [activeConversation, setActiveConversation] = useState<'group' | string>('group')

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

  // ============================================================================
  // Transformations pour les composants shared (nouveau design PreviewHybrid)
  // ============================================================================

  // Participants pour InterventionSidebar (format Participant)
  const participants = useMemo(() => {
    const assignmentList = (intervention as any).assignments || []
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
  }, [intervention])

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
      }))
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

  // Timeline events pour la progression
  const timelineEvents: TimelineEventData[] = useMemo(() => {
    const events: TimelineEventData[] = []

    events.push({
      status: 'demande',
      date: intervention.created_at || new Date().toISOString(),
      author: currentUser.name || 'Vous',
      authorRole: 'tenant'
    })

    const statusOrder = [
      'demande', 'approuvee', 'demande_de_devis', 'planification',
      'planifiee', 'en_cours', 'cloturee_par_prestataire',
      'cloturee_par_locataire', 'cloturee_par_gestionnaire'
    ]

    const currentIndex = statusOrder.indexOf(intervention.status)

    if (currentIndex > 0) {
      events.push({
        status: 'approuvee',
        date: intervention.updated_at || new Date().toISOString(),
        authorRole: 'manager'
      })
    }

    if (currentIndex >= statusOrder.indexOf('planifiee')) {
      events.push({
        status: 'planifiee',
        date: intervention.updated_at || new Date().toISOString(),
        authorRole: 'provider'
      })
    }

    return events
  }, [intervention, currentUser])

  // Date planifiée (si un créneau est sélectionné)
  const scheduledDate = timeSlots.find(s => s.status === 'selected')?.slot_date || null

  // Messages mock (à remplacer par de vraies données si disponibles)
  const mockMessages: Message[] = useMemo(() => [], [])

  // Callbacks pour les conversations
  const handleConversationClick = (participantId: string) => {
    setActiveConversation(participantId)
    setActiveTab('conversations')
  }

  const handleGroupConversationClick = () => {
    setActiveConversation('group')
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

  // NOTE: ProgrammingModal functionality removed - locataires don't program interventions
  // Gestionnaires use /gestionnaire/interventions/modifier/[id] page instead

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

        {/* Reject Slot Modal */}
        <RejectSlotModal
          isOpen={planning.rejectSlotModal.isOpen}
          onClose={planning.closeRejectSlotModal}
          slot={planning.rejectSlotModal.slot}
          interventionId={intervention.id}
          onSuccess={handleActionComplete}
        />

        {/* Nouveau design PreviewHybrid */}
        <PreviewHybridLayout
          sidebar={
            <InterventionSidebar
              participants={participants}
              currentUserRole="tenant"
              currentStatus={intervention.status}
              timelineEvents={timelineEvents}
              activeConversation={activeConversation}
              showConversationButtons={true}
              onConversationClick={handleConversationClick}
              onGroupConversationClick={handleGroupConversationClick}
            />
          }
          content={
            <InterventionTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              userRole="tenant"
            >
              {/* TAB: GENERAL */}
              <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <ContentWrapper>
                  {/* Détails de l'intervention */}
                  <div className="flex-shrink-0">
                    <InterventionDetailsCard
                      title={intervention.title}
                      description={intervention.description || undefined}
                      instructions={intervention.instructions || undefined}
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

              {/* TAB: CONVERSATIONS */}
              <TabsContent value="conversations" className="mt-0 flex-1 flex flex-col overflow-hidden h-full">
                <ConversationCard
                  messages={mockMessages}
                  currentUserId={currentUser.id}
                  currentUserRole="tenant"
                  conversationType={activeConversation === 'group' ? 'group' : 'individual'}
                  participantName={
                    activeConversation !== 'group'
                      ? [...participants.managers, ...participants.providers, ...participants.tenants]
                          .find(p => p.id === activeConversation)?.name
                      : undefined
                  }
                  onSendMessage={(content) => console.log('Send message:', content)}
                  className="flex-1 mx-4"
                />
              </TabsContent>

              {/* TAB: PLANNING */}
              <TabsContent value="planning" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6">
                  {/* Planning - Le locataire peut voir et sélectionner les créneaux */}
                  <PlanningCard
                    timeSlots={transformedTimeSlots}
                    scheduledDate={scheduledDate || undefined}
                    userRole="tenant"
                    currentUserId={currentUser.id}
                    onSelectSlot={handleSelectSlot}
                    className="flex-1 min-h-0"
                  />
                </div>
              </TabsContent>
            </InterventionTabs>
          }
        />
      </div>
    </>
  )
}