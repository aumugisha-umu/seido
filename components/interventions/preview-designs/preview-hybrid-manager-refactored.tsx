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

// Types et composants partagés
import {
  // Types
  Participant,
  Quote,
  TimeSlot,
  Message,
  Comment,
  InterventionDocument,
  // Layout
  PreviewHybridLayout,
  ContentWrapper,
  InterventionTabs,
  // Sidebar
  InterventionSidebar,
  // Cards
  InterventionDetailsCard,
  SummaryCard,
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

  // Callbacks pour la sidebar
  const handleConversationClick = (id: string | 'group') => {
    setActiveConversation(id)
    if (id !== 'group') {
      setActiveTab('conversations')
    }
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

  return (
    <PreviewHybridLayout
      sidebar={
        <InterventionSidebar
          participants={participants}
          currentUserRole="manager"
          currentStatus={currentStatus}
          activeConversation={activeConversation}
          onConversationClick={handleConversationClick}
        />
      }
      content={
        <InterventionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole="manager"
        >
          {/* TAB: GENERAL */}
          <TabsContent value="general" className="mt-0 flex-1 overflow-y-auto">
            <ContentWrapper>
              {/* Description & Instructions */}
              <InterventionDetailsCard
                title="Détails de l'intervention"
                description={description}
                instructions={instructions}
              />

              {/* Grid: Synthèse, Commentaires, Documents */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <SummaryCard
                  scheduledDate={scheduledDate}
                  quotesCount={transformedQuotes.length}
                  selectedQuoteAmount={selectedQuoteAmount}
                  planningStatus={planningStatus}
                  quotesStatus={quotesStatus}
                />

                <CommentsCard
                  comments={transformedComments}
                  onAddComment={(content) => console.log('Add comment:', content)}
                />

                <DocumentsCard
                  documents={mockDocuments}
                  userRole="manager"
                  onUpload={() => console.log('Upload document')}
                  onView={(id) => console.log('View document:', id)}
                  onDownload={(id) => console.log('Download document:', id)}
                />
              </div>
            </ContentWrapper>
          </TabsContent>

          {/* TAB: CONVERSATIONS */}
          <TabsContent value="conversations" className="mt-0 flex-1 overflow-hidden">
            <ContentWrapper className="h-full">
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
                className="h-[600px]"
              />
            </ContentWrapper>
          </TabsContent>

          {/* TAB: PLANNING */}
          <TabsContent value="planning" className="mt-0 flex-1 overflow-y-auto">
            <ContentWrapper>
              {/* Devis */}
              {requireQuote && (
                <QuotesCard
                  quotes={transformedQuotes}
                  userRole="manager"
                  onAddQuote={() => console.log('Add quote')}
                  onViewQuote={(id) => console.log('View quote:', id)}
                  onApproveQuote={onApproveQuote}
                  onRejectQuote={onRejectQuote}
                  className="mb-6"
                />
              )}

              {/* Planning */}
              <PlanningCard
                timeSlots={transformedTimeSlots}
                scheduledDate={scheduledDate}
                userRole="manager"
                currentUserId={currentUserId || 'current-user'}
                onAddSlot={onOpenProgrammingModal}
                onApproveSlot={onApproveSlot}
                onRejectSlot={onRejectSlot}
                onEditSlot={onEditSlot}
              />
            </ContentWrapper>
          </TabsContent>
        </InterventionTabs>
      }
    />
  )
}
