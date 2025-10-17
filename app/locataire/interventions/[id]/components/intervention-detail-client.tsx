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
import { ChatInterface } from '@/components/chat/chat-interface'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentsTab } from '@/app/gestionnaire/interventions/[id]/components/documents-tab'
import { TimeSlotsTab } from '@/app/gestionnaire/interventions/[id]/components/time-slots-tab'
import { selectTimeSlotAction, validateByTenantAction } from '@/app/actions/intervention-actions'
import { toast } from 'sonner'
import { Activity, MessageSquare, FileText, Calendar } from 'lucide-react'

// Intervention components
import { InterventionDetailHeader } from '@/components/intervention/intervention-detail-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'

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

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
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
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
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

              {/* Time slot selection for tenant */}
              {canSelectSlot && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Sélectionnez un créneau
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choisissez le créneau qui vous convient le mieux pour l'intervention
                    </p>
                    <TimeSlotsTab
                      interventionId={intervention.id}
                      timeSlots={timeSlots}
                      currentStatus={intervention.status}
                      canManage={false}
                    />
                  </CardContent>
                </Card>
              )}
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

              {/* Quick info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Référence</span>
                    <span className="font-medium">{intervention.reference}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium capitalize">
                      {intervention.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Urgence</span>
                    <span className="font-medium capitalize">{intervention.urgency}</span>
                  </div>
                  {intervention.building && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Immeuble</span>
                      <span className="font-medium">{intervention.building.name}</span>
                    </div>
                  )}
                  {intervention.lot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Logement</span>
                      <span className="font-medium">{intervention.lot.reference}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          {threads.length > 0 ? (
            <div className="space-y-6">
              {threads.map((thread) => (
                <Card key={thread.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      {thread.thread_type === 'group'
                        ? 'Discussion générale'
                        : 'Discussion avec les gestionnaires'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChatInterface
                      threadId={thread.id}
                      threadType={thread.thread_type}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Aucune conversation active
                </p>
              </CardContent>
            </Card>
          )}
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
  )
}