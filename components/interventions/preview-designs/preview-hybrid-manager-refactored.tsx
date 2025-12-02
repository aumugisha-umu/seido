'use client'

/**
 * PreviewHybridManager - Vue Manager de la prévisualisation d'intervention (Refactorisée)
 *
 * Ce composant utilise les composants partagés de @/components/interventions/shared
 * pour éviter la duplication de code avec PreviewHybridProvider et PreviewHybridTenant.
 *
 * @example
 * <PreviewHybridManager
 *   managers={managers}
 *   providers={providers}
 *   tenants={tenants}
 *   quotes={quotes}
 *   description="Description de l'intervention"
 * />
 */

import { useState, useMemo } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import { ChooseTimeSlotModal } from '@/components/intervention/modals/choose-time-slot-modal'

// Types et composants partagés
import {
  // Types
  Participant,
  Quote,
  TimeSlot,
  Message,
  Comment,
  InterventionDocument,
  UserRole,
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
} from '../shared'

// Import de l'ancienne interface pour compatibilité
import { InterventionSchedulingPreviewProps } from '../intervention-scheduling-preview'

/**
 * Transforme les contacts de l'ancien format vers le nouveau format Participant
 */
const transformToParticipant = (contact: any, role: 'manager' | 'provider' | 'tenant'): Participant => ({
  id: contact.id,
  name: contact.name,
  email: contact.email,
  phone: contact.phone,
  role
})

/**
 * Composant principal refactorisé
 */
export function PreviewHybridManagerRefactored({
  managers = [],
  providers = [],
  tenants = [],
  requireQuote = false,
  quotes = [],
  schedulingType = null,
  scheduledDate = null,
  fullTimeSlots = null,
  onOpenProgrammingModal,
  onCancelSlot,
  onApproveSlot,
  onRejectSlot,
  onEditSlot,
  canManageSlots,
  currentUserId,
  description,
  instructions,
  comments = [],
  timelineEvents = [],
  onCancelQuoteRequest,
  onApproveQuote,
  onRejectQuote
}: InterventionSchedulingPreviewProps) {
  // State
  const [activeTab, setActiveTab] = useState('general')
  const [activeConversation, setActiveConversation] = useState<'group' | string>('group')

  // State pour la modale de choix de créneau
  // On stocke l'ID plutôt que l'objet transformé pour garder accès à intervention_id
  const [selectedSlotIdForChoice, setSelectedSlotIdForChoice] = useState<string | null>(null)
  const [isChooseModalOpen, setIsChooseModalOpen] = useState(false)

  // Récupérer le slot complet depuis fullTimeSlots (avec intervention_id)
  const selectedFullSlotForChoice = selectedSlotIdForChoice
    ? fullTimeSlots?.find((s: any) => s.id === selectedSlotIdForChoice)
    : null

  // Transformation des données pour les nouveaux composants
  const participants = useMemo(() => ({
    managers: managers.map((m: any) => transformToParticipant(m, 'manager')),
    providers: providers.map((p: any) => transformToParticipant(p, 'provider')),
    tenants: tenants.map((t: any) => transformToParticipant(t, 'tenant'))
  }), [managers, providers, tenants])

  // Transformation des quotes
  const transformedQuotes: Quote[] = useMemo(() =>
    quotes.map((q: any) => ({
      id: q.id,
      amount: q.amount,
      status: q.status as Quote['status'],
      provider_name: q.provider_name || q.provider?.name,
      provider_id: q.provider_id,
      created_at: q.created_at,
      description: q.description
    }))
    , [quotes])

  // Transformation des time slots
  const transformedTimeSlots: TimeSlot[] = useMemo(() =>
    (fullTimeSlots || []).map((slot: any) => ({
      id: slot.id,
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: slot.status,
      proposed_by: slot.proposed_by,
      proposed_by_user: slot.proposed_by_user,
      responses: slot.responses
    }))
    , [fullTimeSlots])

  // Transformation des comments
  const transformedComments: Comment[] = useMemo(() =>
    comments.map((c: any) => ({
      id: c.id,
      author: c.author,
      content: c.text || c.content,
      date: c.date,
      role: c.role
    }))
    , [comments])

  // Mock messages (à remplacer par de vraies données)
  const mockMessages: Message[] = useMemo(() => [
    { id: '1', content: 'Bonjour, je viens de créer cette intervention.', author: 'Jean Dupont', role: 'manager', date: new Date().toISOString(), isMe: true },
    { id: '2', content: 'Merci. Quand est-ce que le prestataire pourra passer ?', author: 'Marie Martin', role: 'tenant', date: new Date().toISOString() },
    { id: '3', content: 'Je suis disponible mardi prochain dans la matinée.', author: 'Paul Durand', role: 'provider', date: new Date().toISOString() }
  ], [])

  // Mock documents (à remplacer par de vraies données)
  const mockDocuments: InterventionDocument[] = useMemo(() => [
    { id: '1', name: 'Rapport.pdf', type: 'pdf', size: '2.4 MB', date: '2025-01-25', author: 'Jean Dupont' },
    { id: '2', name: 'Photos.jpg', type: 'image', size: '4.1 MB', date: '2025-01-25', author: 'Paul Durand' }
  ], [])

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
    // Vérifie que le slot existe dans fullTimeSlots (avec intervention_id)
    const slotExists = fullTimeSlots?.some((s: any) => s.id === slotId)
    if (slotExists) {
      setSelectedSlotIdForChoice(slotId)
      setIsChooseModalOpen(true)
    }
  }

  // Handler pour fermer la modale et rafraîchir
  const handleChooseModalSuccess = () => {
    setIsChooseModalOpen(false)
    setSelectedSlotIdForChoice(null)
    // Le rafraîchissement sera géré par le composant parent
  }

  // Déterminer le statut du planning
  const planningStatus = scheduledDate ? 'scheduled' : 'pending'

  // Déterminer le statut des devis
  const quotesStatus = transformedQuotes.some(q => q.status === 'approved')
    ? 'approved'
    : transformedQuotes.length > 0
      ? 'received'
      : 'pending'

  // Montant du devis validé
  const selectedQuoteAmount = transformedQuotes.find(q => q.status === 'approved')?.amount

  // Statut de l'intervention pour la timeline (simulé)
  const currentStatus = scheduledDate ? 'planifiee' : requireQuote ? 'demande_de_devis' : 'approuvee'

  // Événements de timeline avec dates et auteurs (mock data)
  const mockTimelineEvents = useMemo(() => {
    const events = [
      {
        status: 'demande',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 jours ago
        author: tenants[0]?.name || 'Sophie Martin',
        authorRole: 'tenant' as const
      },
      {
        status: 'approuvee',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 jours ago
        author: managers[0]?.name || 'Jean Dupont',
        authorRole: 'manager' as const
      }
    ]

    if (requireQuote) {
      events.push({
        status: 'demande_de_devis',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 jours ago
        author: managers[0]?.name || 'Jean Dupont',
        authorRole: 'manager' as const
      })
    }

    if (scheduledDate) {
      events.push({
        status: 'planifiee',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 jour ago
        author: providers[0]?.name || 'Pierre Martin',
        authorRole: 'provider' as UserRole
      })
    }

    return events
  }, [managers, providers, tenants, requireQuote, scheduledDate])

  return (
    <>
    <PreviewHybridLayout
      sidebar={
        <InterventionSidebar
          participants={participants}
          currentUserRole="manager"
          currentStatus={currentStatus}
          timelineEvents={mockTimelineEvents}
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
              {/* Détails de l'intervention avec planification intégrée */}
              <div className="flex-shrink-0">
                <InterventionDetailsCard
                  title="Détails de l'intervention"
                  description={description}
                  instructions={instructions}
                  planning={{
                    scheduledDate,
                    status: planningStatus,
                    quotesCount: transformedQuotes.length,
                    quotesStatus,
                    selectedQuoteAmount
                  }}
                />
              </div>

              {/* Ligne 2: Documents (gauche) + Commentaires (droite) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 flex-1 min-h-0 overflow-hidden">
                <DocumentsCard
                  documents={mockDocuments}
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
              currentUserId={currentUserId || 'current-user'}
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
                currentUserId={currentUserId || 'current-user'}
                onAddSlot={onOpenProgrammingModal}
                onApproveSlot={(slotId) => {
                  const slot = fullTimeSlots?.find((s: any) => s.id === slotId)
                  if (slot && onApproveSlot) onApproveSlot(slot)
                }}
                onRejectSlot={(slotId) => {
                  const slot = fullTimeSlots?.find((s: any) => s.id === slotId)
                  if (slot && onRejectSlot) onRejectSlot(slot)
                }}
                onEditSlot={(slotId) => {
                  const slot = fullTimeSlots?.find((s: any) => s.id === slotId)
                  if (slot && onEditSlot) onEditSlot(slot)
                }}
                onCancelSlot={(slotId) => {
                  const slot = fullTimeSlots?.find((s: any) => s.id === slotId)
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
