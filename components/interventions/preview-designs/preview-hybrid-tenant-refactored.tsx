'use client'

/**
 * PreviewHybridTenant - Vue Locataire de la prévisualisation d'intervention (Refactorisée)
 *
 * Version simplifiée pour les locataires:
 * - Pas de commentaires internes
 * - Pas de gestion des devis
 * - Peut sélectionner un créneau
 * - Vue conversation groupe uniquement
 *
 * @example
 * <PreviewHybridTenant
 *   managers={managers}
 *   providers={providers}
 *   description="Description de l'intervention"
 * />
 */

import { useState, useMemo } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import { MapPin, Home } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Types et composants partagés
import {
  // Types
  Participant,
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
 * Composant principal refactorisé - Vue Locataire
 */
export function PreviewHybridTenantRefactored({
  managers = [],
  providers = [],
  tenants = [],
  schedulingType = null,
  scheduledDate = null,
  fullTimeSlots = null,
  currentUserId,
  description,
  instructions
}: InterventionSchedulingPreviewProps) {
  // State
  const [activeTab, setActiveTab] = useState('general')
  const [activeConversation, setActiveConversation] = useState<'group' | string>('group')

  // Transformation des données
  // Note: Le locataire voit managers et prestataires, pas les autres locataires
  const participants = useMemo(() => ({
    managers: managers.map((m: any) => transformToParticipant(m, 'manager')),
    providers: providers.map((p: any) => transformToParticipant(p, 'provider')),
    tenants: [] // Les locataires ne voient pas les autres locataires
  }), [managers, providers])

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
    { id: '1', content: 'Bonjour, nous avons bien reçu votre demande d\'intervention.', author: 'Jean Dupont', role: 'manager', date: new Date().toISOString() },
    { id: '2', content: 'Merci, quand pensez-vous que quelqu\'un pourra passer ?', author: 'Vous', role: 'tenant', date: new Date().toISOString(), isMe: true },
    { id: '3', content: 'Je suis disponible mardi ou mercredi matin.', author: 'Paul Durand', role: 'provider', date: new Date().toISOString() }
  ], [])

  // Statut de l'intervention
  const currentStatus = scheduledDate ? 'planifiee' : 'approuvee'

  // Déterminer le statut du planning pour l'aperçu
  const planningStatus = scheduledDate ? 'scheduled' : 'pending'

  // Événements de timeline avec dates et auteurs (mock data)
  const mockTimelineEvents = useMemo(() => {
    const events = [
      {
        status: 'demande',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        author: 'Vous',
        authorRole: 'tenant' as const
      },
      {
        status: 'approuvee',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        author: managers[0]?.name || 'Jean Dupont',
        authorRole: 'manager' as const
      }
    ]

    if (scheduledDate) {
      events.push({
        status: 'planifiee',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        author: providers[0]?.name || 'Pierre Martin',
        authorRole: 'provider' as const
      })
    }

    return events
  }, [managers, providers, scheduledDate])

  // Callback pour sélectionner un créneau
  const handleSelectSlot = (slotId: string) => {
    console.log('Créneau sélectionné:', slotId)
    // Ici on appellerait l'API pour enregistrer le choix du locataire
  }

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
          currentUserRole="tenant"
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
          userRole="tenant"
        >
          {/* TAB: GENERAL */}
          <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ContentWrapper>
              {/* Description avec aperçu planning */}
              <InterventionDetailsCard
                title="Détails de l'intervention"
                description={description}
                instructions={instructions}
                planning={{
                  scheduledDate,
                  status: planningStatus,
                  quotesStatus: 'pending' // Les locataires ne voient pas les devis
                }}
              />

              {/* Localisation simplifiée pour le locataire */}
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    Lieu d'intervention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">Votre logement</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Le prestataire interviendra à l'adresse enregistrée dans votre profil
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
              currentUserRole="tenant"
              conversationType={activeConversation === 'group' ? 'group' : 'individual'}
              participantName={
                activeConversation !== 'group'
                  ? [...participants.managers, ...participants.providers]
                      .find(p => p.id === activeConversation)?.name
                  : undefined
              }
              onSendMessage={(content) => console.log('Send message:', content)}
              className="flex-1 mx-4"
            />
          </TabsContent>

          {/* TAB: PLANNING (Rendez-vous) */}
          <TabsContent value="planning" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ContentWrapper>
              {/* Planning - Le locataire peut sélectionner un créneau */}
              <PlanningCard
                timeSlots={transformedTimeSlots}
                scheduledDate={scheduledDate}
                userRole="tenant"
                currentUserId={currentUserId || 'current-user'}
                onSelectSlot={handleSelectSlot}
              />

              {/* Informations supplémentaires */}
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="p-2 rounded-full bg-emerald-100">
                      <Home className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Important</p>
                      <p className="text-muted-foreground mt-1">
                        Assurez-vous d'être disponible au créneau sélectionné pour permettre
                        l'accès au prestataire.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ContentWrapper>
          </TabsContent>
        </InterventionTabs>
      }
    />
  )
}
