'use client'

/**
 * Prestataire Intervention Detail Client
 * Main client component with tabs for provider view
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Tab components
import { OverviewTab } from './overview-tab'
import { ChatTab } from './chat-tab'
import { QuotesTab } from './quotes-tab'
import { DocumentsTab } from './documents-tab'

// Types
import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
}

type Document = Database['public']['Tables']['intervention_documents']['Row']
type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}
type Thread = Database['public']['Tables']['conversation_threads']['Row']
type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
}
type User = Database['public']['Tables']['users']['Row']

interface PrestataireInterventionDetailClientProps {
  intervention: Intervention
  documents: Document[]
  quotes: Quote[]
  threads: Thread[]
  timeSlots: TimeSlot[]
  currentUser: User
}

// Status labels
const statusLabels: Record<string, { label: string; color: string }> = {
  'demande': { label: 'Demande', color: 'bg-gray-100 text-gray-800' },
  'rejetee': { label: 'Rejetée', color: 'bg-red-100 text-red-800' },
  'approuvee': { label: 'Approuvée', color: 'bg-green-100 text-green-800' },
  'demande_de_devis': { label: 'Devis demandé', color: 'bg-yellow-100 text-yellow-800' },
  'planification': { label: 'Planification', color: 'bg-blue-100 text-blue-800' },
  'planifiee': { label: 'Planifiée', color: 'bg-blue-100 text-blue-800' },
  'en_cours': { label: 'En cours', color: 'bg-indigo-100 text-indigo-800' },
  'cloturee_par_prestataire': { label: 'Terminée (prestataire)', color: 'bg-purple-100 text-purple-800' },
  'cloturee_par_locataire': { label: 'Validée (locataire)', color: 'bg-purple-100 text-purple-800' },
  'cloturee_par_gestionnaire': { label: 'Clôturée', color: 'bg-gray-100 text-gray-800' },
  'annulee': { label: 'Annulée', color: 'bg-red-100 text-red-800' }
}

export function PrestataireInterventionDetailClient({
  intervention,
  documents,
  quotes,
  threads,
  timeSlots,
  currentUser
}: PrestataireInterventionDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const statusInfo = statusLabels[intervention.status] || statusLabels['demande']

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Actualiser'
              )}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{intervention.title}</h1>
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Référence: <strong>{intervention.reference}</strong></span>
              <span>•</span>
              <span className="capitalize">Type: <strong>{intervention.type.replace('_', ' ')}</strong></span>
              <span>•</span>
              <span className="capitalize">Urgence: <strong>{intervention.urgency}</strong></span>
            </div>

            {intervention.building && (
              <p className="text-sm text-muted-foreground">
                {intervention.building.name} - {intervention.building.address}, {intervention.building.postal_code} {intervention.building.city}
              </p>
            )}
            {intervention.lot && intervention.lot.building && (
              <p className="text-sm text-muted-foreground">
                {intervention.lot.building.name} - Lot {intervention.lot.reference}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="chat">
              Chat
              {threads.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {threads.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quotes">
              Devis
              {quotes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {quotes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {documents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="space-y-6">
              <OverviewTab
                intervention={intervention}
                timeSlots={timeSlots}
                currentUser={currentUser}
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="chat" className="space-y-6">
              <ChatTab
                interventionId={intervention.id}
                threads={threads}
              />
            </TabsContent>

            <TabsContent value="quotes" className="space-y-6">
              <QuotesTab
                interventionId={intervention.id}
                quotes={quotes}
                currentUser={currentUser}
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <DocumentsTab
                interventionId={intervention.id}
                documents={documents}
                canUpload={true}
                onRefresh={handleRefresh}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
