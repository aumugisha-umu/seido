'use client'

/**
 * Overview Tab V2 - Nouvelle version utilisant les composants shared
 * Remplace l'ancienne OverviewTab avec le design PreviewHybrid
 */

import { useState, useMemo } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import { ChooseTimeSlotModal } from '@/components/intervention/modals/choose-time-slot-modal'

// Composants partagés
import {
  // Types
  Participant,
  Quote as SharedQuote,
  TimeSlot as SharedTimeSlot,
  Message,
  Comment as SharedComment,
  InterventionDocument,
  UserRole,
  TimelineEventData,
  // Layout
  PreviewHybridLayout,
  ContentWrapper,
  InterventionTabs,
  // Sidebar
  InterventionSidebar,
  // Cards
  InterventionDetailsCard,
  CommentsCard,
  DocumentsCard,
  QuotesCard,
  PlanningCard,
  ConversationCard
} from '@/components/interventions/shared'

import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
}

type Assignment = Database['public']['Tables']['intervention_assignments']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
  responses?: TimeSlotResponse[]
}

interface CommentDB {
  id: string
  content: string
  created_at: string
  user?: Pick<Database['public']['Tables']['users']['Row'], 'id' | 'name' | 'email' | 'avatar_url' | 'role'>
}

interface OverviewTabV2Props {
  intervention: Intervention
  assignments: Assignment[]
  quotes: Quote[]
  timeSlots: TimeSlot[]
  comments: CommentDB[]
  documents?: Database['public']['Tables']['intervention_documents']['Row'][]
  currentUserId: string
  currentUserRole: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire'
  onRefresh: () => void
  onOpenProgrammingModal?: () => void
  onCancelSlot?: (slot: TimeSlot) => void
  onApproveSlot?: (slot: TimeSlot) => void
  onRejectSlot?: (slot: TimeSlot) => void
  onEditSlot?: (slot: TimeSlot) => void
  onApproveQuote?: (quoteId: string) => void
  onRejectQuote?: (quoteId: string) => void
}

/**
 * Transforme les contacts de l'ancien format vers le nouveau format Participant
 */
const transformToParticipant = (assignment: Assignment, role: 'manager' | 'provider' | 'tenant'): Participant | null => {
  if (!assignment.user) return null
  return {
    id: assignment.user.id,
    name: assignment.user.name,
    email: assignment.user.email || undefined,
    phone: assignment.user.phone || undefined,
    role
  }
}

export function OverviewTabV2({
  intervention,
  assignments,
  quotes,
  timeSlots,
  comments,
  documents = [],
  currentUserId,
  currentUserRole,
  onRefresh,
  onOpenProgrammingModal,
  onCancelSlot,
  onApproveSlot,
  onRejectSlot,
  onEditSlot,
  onApproveQuote,
  onRejectQuote
}: OverviewTabV2Props) {
  // State
  const [activeTab, setActiveTab] = useState('general')
  const [activeConversation, setActiveConversation] = useState<'group' | string>('group')

  // State pour la modale de choix de créneau
  const [selectedSlotIdForChoice, setSelectedSlotIdForChoice] = useState<string | null>(null)
  const [isChooseModalOpen, setIsChooseModalOpen] = useState(false)

  // Récupérer le slot complet depuis timeSlots (avec intervention_id)
  const selectedFullSlotForChoice = selectedSlotIdForChoice
    ? timeSlots.find(s => s.id === selectedSlotIdForChoice)
    : null

  // Transformation des participants
  const participants = useMemo(() => ({
    managers: assignments
      .filter(a => a.role === 'gestionnaire')
      .map(a => transformToParticipant(a, 'manager'))
      .filter((p): p is Participant => p !== null),
    providers: assignments
      .filter(a => a.role === 'prestataire')
      .map(a => transformToParticipant(a, 'provider'))
      .filter((p): p is Participant => p !== null),
    tenants: assignments
      .filter(a => a.role === 'locataire')
      .map(a => transformToParticipant(a, 'tenant'))
      .filter((p): p is Participant => p !== null)
  }), [assignments])

  // Transformation des quotes
  const transformedQuotes: SharedQuote[] = useMemo(() =>
    quotes.map(q => ({
      id: q.id,
      amount: q.amount || 0,
      status: q.status as SharedQuote['status'],
      provider_name: q.provider?.name,
      provider_id: q.provider_id || undefined,
      created_at: q.created_at || undefined,
      description: q.description || undefined
    }))
  , [quotes])

  // Transformation des time slots
  const transformedTimeSlots: SharedTimeSlot[] = useMemo(() =>
    timeSlots.map(slot => ({
      id: slot.id,
      slot_date: slot.slot_date || '',
      start_time: slot.start_time || '',
      end_time: slot.end_time || '',
      status: slot.status || 'pending',
      proposed_by: slot.proposed_by || undefined,
      proposed_by_user: slot.proposed_by_user ? { name: slot.proposed_by_user.name } : undefined,
      responses: slot.responses?.map(r => ({
        id: r.id,
        user_id: r.user_id,
        response: r.response as 'accepted' | 'rejected' | 'pending',
        user: r.user ? { name: r.user.name, role: r.user.role || '' } : undefined
      }))
    }))
  , [timeSlots])

  // Transformation des comments
  const transformedComments: SharedComment[] = useMemo(() =>
    comments.map(c => ({
      id: c.id,
      author: c.user?.name || 'Utilisateur',
      content: c.content,
      date: c.created_at,
      role: c.user?.role || undefined
    }))
  , [comments])

  // Transformation des documents
  const transformedDocuments: InterventionDocument[] = useMemo(() =>
    documents.map(d => ({
      id: d.id,
      name: d.original_filename || d.filename || 'Document',
      type: d.document_type || 'file',
      size: d.file_size ? `${Math.round(d.file_size / 1024)} KB` : undefined,
      date: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('fr-FR') : undefined,
      url: d.storage_path || undefined
    }))
  , [documents])

  // Check if quote is required
  const requireQuote = intervention.status === 'demande_de_devis' ||
    quotes.some(q => ['pending', 'sent', 'accepted'].includes(q.status))

  // Callbacks pour les conversations
  const handleIndividualConversationClick = (participantId: string) => {
    setActiveConversation(participantId)
    setActiveTab('conversations')
  }

  const handleGroupConversationClick = () => {
    setActiveConversation('group')
    setActiveTab('conversations')
  }

  // Handler pour ouvrir la modale de choix de créneau
  const handleChooseSlot = (slotId: string) => {
    const slotExists = timeSlots.some(s => s.id === slotId)
    if (slotExists) {
      setSelectedSlotIdForChoice(slotId)
      setIsChooseModalOpen(true)
    }
  }

  // Handler pour fermer la modale et rafraîchir
  const handleChooseModalSuccess = () => {
    setIsChooseModalOpen(false)
    setSelectedSlotIdForChoice(null)
    onRefresh()
  }

  // Déterminer le statut du planning
  const scheduledDate = timeSlots.find(s => s.status === 'selected')?.slot_date || null
  const planningStatus = scheduledDate ? 'scheduled' : 'pending'

  // Déterminer le statut des devis
  const quotesStatus = transformedQuotes.some(q => q.status === 'approved')
    ? 'approved'
    : transformedQuotes.length > 0
      ? 'received'
      : 'pending'

  // Montant du devis validé
  const selectedQuoteAmount = transformedQuotes.find(q => q.status === 'approved')?.amount

  // Statut de l'intervention pour la timeline
  const currentStatus = intervention.status

  // Événements de timeline basés sur le statut réel
  const timelineEvents: TimelineEventData[] = useMemo(() => {
    const events: TimelineEventData[] = []

    // Toujours ajouter la création
    events.push({
      status: 'demande',
      date: intervention.created_at || new Date().toISOString(),
      author: 'Système',
      authorRole: 'manager'
    })

    // Ajouter les étapes selon le statut actuel
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

    if (requireQuote && currentIndex >= statusOrder.indexOf('demande_de_devis')) {
      events.push({
        status: 'demande_de_devis',
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
  }, [intervention, requireQuote])

  // Mock messages (à remplacer par de vraies données si disponibles)
  const mockMessages: Message[] = useMemo(() => [], [])

  return (
    <>
      <PreviewHybridLayout
        sidebar={
          <InterventionSidebar
            participants={participants}
            currentUserRole="manager"
            currentStatus={currentStatus}
            timelineEvents={timelineEvents}
            activeConversation={activeConversation}
            showConversationButtons={true}
            onConversationClick={handleIndividualConversationClick}
            onGroupConversationClick={handleGroupConversationClick}
          />
        }
        content={
          <InterventionTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            userRole="manager"
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
                      status: planningStatus,
                      quotesCount: transformedQuotes.length,
                      quotesStatus,
                      selectedQuoteAmount
                    }}
                  />
                </div>

                {/* Documents + Commentaires */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 flex-1 min-h-0 overflow-hidden">
                  <DocumentsCard
                    documents={transformedDocuments}
                    userRole="manager"
                    onUpload={() => console.log('Upload document')}
                    onView={(id) => console.log('View document:', id)}
                    onDownload={(id) => console.log('Download document:', id)}
                    className="overflow-hidden"
                  />

                  <CommentsCard
                    comments={transformedComments}
                    onAddComment={(content) => console.log('Add comment:', content)}
                    className="overflow-hidden"
                  />
                </div>
              </ContentWrapper>
            </TabsContent>

            {/* TAB: CONVERSATIONS */}
            <TabsContent value="conversations" className="mt-0 flex-1 flex flex-col overflow-hidden h-full">
              <ConversationCard
                messages={mockMessages}
                currentUserId={currentUserId}
                currentUserRole="manager"
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
                {/* Devis */}
                {requireQuote && (
                  <QuotesCard
                    quotes={transformedQuotes}
                    userRole="manager"
                    showActions={true}
                    onAddQuote={() => console.log('Add quote')}
                    onApproveQuote={onApproveQuote}
                    onRejectQuote={onRejectQuote}
                    className="flex-1 min-h-0"
                  />
                )}

                {/* Planning */}
                <PlanningCard
                  timeSlots={transformedTimeSlots}
                  scheduledDate={scheduledDate || undefined}
                  userRole="manager"
                  currentUserId={currentUserId}
                  onAddSlot={onOpenProgrammingModal}
                  onApproveSlot={(slotId) => {
                    const slot = timeSlots.find(s => s.id === slotId)
                    if (slot && onApproveSlot) onApproveSlot(slot)
                  }}
                  onRejectSlot={(slotId) => {
                    const slot = timeSlots.find(s => s.id === slotId)
                    if (slot && onRejectSlot) onRejectSlot(slot)
                  }}
                  onEditSlot={(slotId) => {
                    const slot = timeSlots.find(s => s.id === slotId)
                    if (slot && onEditSlot) onEditSlot(slot)
                  }}
                  onCancelSlot={(slotId) => {
                    const slot = timeSlots.find(s => s.id === slotId)
                    if (slot && onCancelSlot) onCancelSlot(slot)
                  }}
                  onChooseSlot={handleChooseSlot}
                  className="flex-1 min-h-0"
                />
              </div>
            </TabsContent>
          </InterventionTabs>
        }
      />

      {/* Modale de choix de créneau */}
      {selectedFullSlotForChoice && (
        <ChooseTimeSlotModal
          slot={selectedFullSlotForChoice}
          interventionId={selectedFullSlotForChoice.intervention_id}
          hasActiveQuotes={transformedQuotes.some(q => q.status === 'pending' || q.status === 'sent')}
          open={isChooseModalOpen}
          onOpenChange={setIsChooseModalOpen}
          onSuccess={handleChooseModalSuccess}
        />
      )}
    </>
  )
}
