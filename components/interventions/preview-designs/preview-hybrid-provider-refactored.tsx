'use client'

/**
 * PreviewHybridProvider - Vue Prestataire de la prévisualisation d'intervention (Refactorisée)
 *
 * Version simplifiée pour les prestataires:
 * - Pas de commentaires internes (visible manager seulement)
 * - Pas de gestion des documents
 * - Peut soumettre des devis
 * - Peut proposer des créneaux
 *
 * @example
 * <PreviewHybridProvider
 *   managers={managers}
 *   tenants={tenants}
 *   quotes={quotes}
 *   description="Description de l'intervention"
 * />
 */

import { useState, useMemo } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import { MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Types et composants partagés
import {
  // Types
  Participant,
  Quote,
  TimeSlot,
  Message,
  // Layout
  PreviewHybridLayout,
  ContentWrapper,
  InterventionTabs,
  // Sidebar
  InterventionSidebar,
  // Cards
  InterventionDetailsCard,
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
 * Composant principal refactorisé - Vue Prestataire
 */
export function PreviewHybridProviderRefactored({
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
  onCancelQuoteRequest,
  onApproveQuote,
  onRejectQuote
}: InterventionSchedulingPreviewProps) {
  // State
  const [activeTab, setActiveTab] = useState('general')
  const [activeConversation, setActiveConversation] = useState<'group' | string>('group')

  // Transformation des données
  // Note: Le prestataire voit managers et tenants, pas les autres prestataires
  const participants = useMemo(() => ({
    managers: managers.map((m: any) => transformToParticipant(m, 'manager')),
    providers: [], // Les prestataires ne voient pas les autres prestataires
    tenants: tenants.map((t: any) => transformToParticipant(t, 'tenant'))
  }), [managers, tenants])

  // Transformation des quotes (prestataire voit ses propres devis)
  const transformedQuotes: Quote[] = useMemo(() =>
    quotes
      .filter((q: any) => q.provider_id === currentUserId) // Filtre ses propres devis
      .map((q: any) => ({
        id: q.id,
        amount: q.amount,
        status: q.status as Quote['status'],
        provider_name: q.provider_name || q.provider?.name,
        provider_id: q.provider_id,
        created_at: q.created_at,
        description: q.description
      }))
  , [quotes, currentUserId])

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

  // Mock messages (à remplacer par de vraies données)
  const mockMessages: Message[] = useMemo(() => [
    { id: '1', content: 'Bonjour, voici les détails de l\'intervention.', author: 'Jean Dupont', role: 'manager', date: new Date().toISOString() },
    { id: '2', content: 'Merci, je suis disponible la semaine prochaine.', author: 'Vous', role: 'provider', date: new Date().toISOString(), isMe: true }
  ], [])

  // Statut de l'intervention
  const currentStatus = scheduledDate ? 'planifiee' : requireQuote ? 'demande_de_devis' : 'approuvee'

  // Location (à récupérer des vraies données)
  const location = "15 rue de la Paix, 75002 Paris"

  // Déterminer le statut du planning
  const planningStatus = scheduledDate ? 'scheduled' : 'pending'

  // Statut des devis pour le prestataire
  const quotesStatus = transformedQuotes.some(q => q.status === 'approved')
    ? 'approved'
    : transformedQuotes.length > 0
      ? 'received'
      : 'pending'

  // Événements de timeline avec dates et auteurs (mock data)
  const mockTimelineEvents = useMemo(() => {
    const events = [
      {
        status: 'demande',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        author: tenants[0]?.name || 'Sophie Martin',
        authorRole: 'tenant' as const
      },
      {
        status: 'approuvee',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        author: managers[0]?.name || 'Jean Dupont',
        authorRole: 'manager' as const
      }
    ]

    if (requireQuote) {
      events.push({
        status: 'demande_de_devis',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        author: managers[0]?.name || 'Jean Dupont',
        authorRole: 'manager' as const
      })
    }

    if (scheduledDate) {
      events.push({
        status: 'planifiee',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        author: 'Vous',
        authorRole: 'provider' as const
      })
    }

    return events
  }, [managers, tenants, requireQuote, scheduledDate])

  // Callbacks pour les conversations
  const handleIndividualConversationClick = (participantId: string) => {
    setActiveConversation(participantId)
    setActiveTab('conversations')
  }

  const handleGroupConversationClick = () => {
    setActiveConversation('group')
    setActiveTab('conversations')
  }

  return (
    <PreviewHybridLayout
      sidebar={
        <InterventionSidebar
          participants={participants}
          currentUserRole="provider"
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
          userRole="provider"
        >
          {/* TAB: GENERAL */}
          <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ContentWrapper>
              {/* Description & Instructions avec aperçu planning */}
              <InterventionDetailsCard
                title="Détails de la mission"
                description={description}
                instructions={instructions}
                planning={{
                  scheduledDate,
                  status: planningStatus,
                  quotesCount: transformedQuotes.length,
                  quotesStatus
                }}
              />

              {/* Localisation */}
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Lieu d'intervention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{location}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Le locataire vous communiquera les instructions d'accès
                  </p>
                </CardContent>
              </Card>
            </ContentWrapper>
          </TabsContent>

          {/* TAB: CONVERSATIONS (Messagerie) */}
          <TabsContent value="conversations" className="mt-0 flex-1 flex flex-col overflow-hidden h-full">
            <ConversationCard
              messages={mockMessages}
              currentUserId={currentUserId || 'current-user'}
              currentUserRole="provider"
              conversationType={activeConversation === 'group' ? 'group' : 'individual'}
              participantName={
                activeConversation !== 'group'
                  ? [...participants.managers, ...participants.tenants]
                      .find(p => p.id === activeConversation)?.name
                  : undefined
              }
              onSendMessage={(content) => console.log('Send message:', content)}
              className="flex-1 mx-4"
            />
          </TabsContent>

          {/* TAB: PLANNING (Planification) */}
          <TabsContent value="planning" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ContentWrapper>
              {/* Devis - Le prestataire peut soumettre */}
              <QuotesCard
                quotes={transformedQuotes}
                userRole="provider"
                onAddQuote={() => console.log('Add quote')}
                onViewQuote={(id) => console.log('View quote:', id)}
                className="mb-6"
              />

              {/* Planning - Le prestataire peut proposer des créneaux */}
              <PlanningCard
                timeSlots={transformedTimeSlots}
                scheduledDate={scheduledDate}
                userRole="provider"
                currentUserId={currentUserId || 'current-user'}
                onAddSlot={onOpenProgrammingModal}
              />
            </ContentWrapper>
          </TabsContent>
        </InterventionTabs>
      }
    />
  )
}
