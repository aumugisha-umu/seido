'use client'

/**
 * Gestionnaire Intervention Detail Client Component
 * Manages tabs and interactive elements for intervention details
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'

// Tab components
import { OverviewTab } from './overview-tab'
import { ChatTab } from './chat-tab'
import { DocumentsTab } from './documents-tab'
import { QuotesTab } from './quotes-tab'
import { TimeSlotsTab } from './time-slots-tab'
import { ActivityTab } from './activity-tab'

import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
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
  activityLogs: ActivityLog[]
}

export function InterventionDetailClient({
  intervention,
  assignments,
  documents,
  quotes,
  timeSlots,
  threads,
  activityLogs
}: InterventionDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Get badge counts for tabs
  const getBadgeCount = (tab: string) => {
    switch (tab) {
      case 'chat':
        return threads.length > 0 ? threads.length : undefined
      case 'documents':
        return documents.length > 0 ? documents.length : undefined
      case 'quotes':
        return quotes.length > 0 ? quotes.length : undefined
      case 'time-slots':
        return timeSlots.length > 0 ? timeSlots.length : undefined
      default:
        return undefined
    }
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/gestionnaire">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/gestionnaire/interventions">
              Interventions
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{intervention.reference}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/gestionnaire/interventions')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="chat" className="relative">
            Discussion
            {getBadgeCount('chat') && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                {getBadgeCount('chat')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="relative">
            Documents
            {getBadgeCount('documents') && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                {getBadgeCount('documents')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="quotes" className="relative">
            Devis
            {getBadgeCount('quotes') && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                {getBadgeCount('quotes')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="time-slots" className="relative">
            Créneaux
            {getBadgeCount('time-slots') && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                {getBadgeCount('time-slots')}
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

        <TabsContent value="chat" className="space-y-6">
          <ChatTab
            interventionId={intervention.id}
            threads={threads}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DocumentsTab
            interventionId={intervention.id}
            documents={documents}
            canManage={true}
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
          <TimeSlotsTab
            interventionId={intervention.id}
            timeSlots={timeSlots}
            currentStatus={intervention.status}
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
    </div>
  )
}