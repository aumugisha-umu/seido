'use client'

/**
 * Prestataire Intervention Detail Client
 * Main client component with tabs for provider view
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/services'

// Tab components
import { OverviewTab } from './overview-tab'
import { ChatTab } from './chat-tab'
import { QuotesTab } from './quotes-tab'
import { DocumentsTab } from './documents-tab'
import { ExecutionTab } from '@/components/intervention/tabs/execution-tab'

// Intervention components
import { InterventionDetailHeader } from '@/components/intervention/intervention-detail-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'

// Modals
import { QuoteSubmissionModal } from '@/components/intervention/modals/quote-submission-modal'
import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'
import { CancelSlotModal } from '@/components/intervention/modals/cancel-slot-modal'
import { RejectSlotModal } from '@/components/intervention/modals/reject-slot-modal'

// Hooks
import { useInterventionPlanning } from '@/hooks/use-intervention-planning'

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
type Assignment = Database['public']['Tables']['intervention_assignments']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

interface PrestataireInterventionDetailClientProps {
  intervention: Intervention
  documents: Document[]
  quotes: Quote[]
  threads: Thread[]
  timeSlots: TimeSlot[]
  assignments: Assignment[]
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
  'en_cours': { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
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
  assignments,
  currentUser
}: PrestataireInterventionDetailClientProps) {
  const router = useRouter()
  const planning = useInterventionPlanning()
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [rejectQuoteModalOpen, setRejectQuoteModalOpen] = useState(false)
  const [quoteToReject, setQuoteToReject] = useState<Quote | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Transform assignments into Contact arrays by role
  const { managers, providers, tenants } = useMemo(() => {
    const managers = assignments
      .filter(a => a.role === 'gestionnaire')
      .map(a => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'gestionnaire' as const
      }))
      .filter(c => c.id)

    const providers = assignments
      .filter(a => a.role === 'prestataire')
      .map(a => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'prestataire' as const
      }))
      .filter(c => c.id)

    const tenants = assignments
      .filter(a => a.role === 'locataire')
      .map(a => ({
        id: a.user?.id || '',
        name: a.user?.name || '',
        email: a.user?.email || '',
        phone: a.user?.phone,
        role: a.user?.role,
        type: 'locataire' as const
      }))
      .filter(c => c.id)

    return { managers, providers, tenants }
  }, [assignments])

  const handleRefresh = async () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  // Handle opening programming modal with existing data pre-filled
  const handleOpenProgrammingModalWithData = () => {
    const interventionAction = {
      id: intervention.id,
      type: intervention.type || '',
      status: intervention.status || '',
      title: intervention.title || '',
      description: intervention.description,
      priority: intervention.priority,
      urgency: intervention.urgency,
      reference: intervention.reference || '',
      created_at: intervention.created_at,
      created_by: intervention.creator?.name || 'Utilisateur',
      location: intervention.specific_location,
      lot: intervention.lot ? {
        reference: intervention.lot.reference || ''
      } : undefined,
      building: intervention.building ? {
        name: intervention.building.name || ''
      } : undefined
    }

    // Determine planning mode based on existing time slots
    if (timeSlots.length === 0) {
      // No slots yet - open with default mode
      planning.openProgrammingModal(interventionAction)
    } else if (timeSlots.length === 1) {
      // Single slot - likely "direct" mode
      const slot = timeSlots[0]
      planning.setProgrammingOption('direct')
      planning.setProgrammingDirectSchedule({
        date: slot.slot_date,
        startTime: slot.start_time,
        endTime: slot.end_time
      })
      planning.openProgrammingModal(interventionAction)
    } else {
      // Multiple slots - "propose" mode
      planning.setProgrammingOption('propose')
      planning.setProgrammingProposedSlots(
        timeSlots.map(slot => ({
          date: slot.slot_date,
          startTime: slot.start_time,
          endTime: slot.end_time
        }))
      )
      planning.openProgrammingModal(interventionAction)
    }
  }

  // Handle opening reject quote modal from action panel
  const handleRejectQuoteRequest = (quote: Quote) => {
    setQuoteToReject(quote)
    setRejectionReason('')
    setRejectQuoteModalOpen(true)
  }

  // Handle rejecting quote request
  const handleConfirmRejectQuote = async () => {
    if (!quoteToReject) return

    if (!rejectionReason.trim()) {
      toast.error('Veuillez indiquer la raison du rejet')
      return
    }

    setIsRejecting(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase
        .from('intervention_quotes')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteToReject.id)

      if (error) throw error

      toast.success('Demande de devis rejetée')
      setRejectQuoteModalOpen(false)
      setQuoteToReject(null)
      setRejectionReason('')
      handleRefresh()
    } catch (error) {
      console.error('Error rejecting quote request:', error)
      toast.error('Erreur lors du rejet de la demande')
    } finally {
      setIsRejecting(false)
    }
  }

  // Handle cancelling quote
  const handleCancelQuote = async (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    const isSent = quote?.status === 'sent'

    const confirmMessage = isSent
      ? 'Êtes-vous sûr de vouloir annuler ce devis ? Le gestionnaire ne pourra plus le consulter.'
      : 'Êtes-vous sûr de vouloir supprimer ce devis ?'

    if (!confirm(confirmMessage)) return

    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase
        .from('intervention_quotes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.id
        })
        .eq('id', quoteId)

      if (error) throw error

      const successMessage = isSent ? 'Devis annulé avec succès' : 'Devis supprimé avec succès'
      toast.success(successMessage)
      handleRefresh()
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error('Erreur lors de la suppression du devis')
    }
  }

  // Handle action completion from action panel
  const handleActionComplete = (navigateToTab?: string) => {
    if (navigateToTab) {
      setActiveTab(navigateToTab)
    }
    handleRefresh()
  }

  // Handle opening quote submission modal
  const handleOpenQuoteModal = () => {
    setSelectedQuote(null)
    setQuoteModalOpen(true)
  }

  // Handle editing existing quote
  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setQuoteModalOpen(true)
  }

  // Transform database quote to ExistingQuote format for QuoteSubmissionForm
  const transformQuoteToExistingQuote = (quote: Quote) => {
    // Extract labor and materials costs from line_items JSONB
    const lineItems = quote.line_items as any[] || []
    const laborItem = lineItems.find((item: any) => item.description?.includes('Main d\'œuvre'))
    const materialsItem = lineItems.find((item: any) => item.description?.includes('Matériaux'))

    return {
      laborCost: laborItem?.total || quote.amount || 0,
      materialsCost: materialsItem?.total || 0,
      workDetails: quote.description || '',
      estimatedDurationHours: laborItem?.quantity || 1,
      attachments: [],
      providerAvailabilities: []
    }
  }

  const statusInfo = statusLabels[intervention.status] || statusLabels['demande']

  return (
    <div className="min-h-screen bg-background">
      {/* Intervention Detail Header with Action Panel */}
      <InterventionDetailHeader
        intervention={{
          id: intervention.id,
          title: intervention.title,
          reference: intervention.reference || '',
          status: intervention.status,
          urgency: intervention.urgency || 'normale',
          createdAt: intervention.created_at || '',
          createdBy: intervention.creator?.name || 'Utilisateur',
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
        onBack={() => router.back()}
        onArchive={() => {
          // TODO: Implement archive logic for provider
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
              scheduled_date: intervention.scheduled_date || undefined,
              quotes: quotes.map(q => ({
                id: q.id,
                status: q.status,
                providerId: q.provider_id,
                isCurrentUserQuote: q.provider_id === currentUser.id,
                amount: q.amount
              }))
            }}
            userRole="prestataire"
            userId={currentUser.id}
            timeSlots={timeSlots}
            onActionComplete={handleActionComplete}
            onOpenQuoteModal={handleOpenQuoteModal}
            onRejectQuoteRequest={handleRejectQuoteRequest}
            onCancelQuote={handleCancelQuote}
          />
        }
      />

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="quotes">
              Devis
              {quotes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {quotes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="execution">
              Exécution
              {timeSlots.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {timeSlots.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="chat">
              Chat
              {threads.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {threads.length}
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
                currentUserId={currentUser.id}
                userRole="prestataire"
              />
            </TabsContent>

            <TabsContent value="quotes" className="space-y-6">
              <QuotesTab
                interventionId={intervention.id}
                quotes={quotes}
                currentUser={currentUser}
                onRefresh={handleRefresh}
                onEditQuote={handleEditQuote}
              />
            </TabsContent>

            <TabsContent value="execution" className="space-y-6">
              <ExecutionTab
                interventionId={intervention.id}
                timeSlots={timeSlots}
                currentStatus={intervention.status}
                intervention={{
                  id: intervention.id,
                  type: '',
                  status: intervention.status || '',
                  title: '',
                  description: intervention.description,
                  priority: intervention.priority,
                  urgency: intervention.urgency,
                  reference: intervention.reference || '',
                  created_at: intervention.created_at,
                  location: intervention.specific_location,
                }}
                onOpenProgrammingModal={handleOpenProgrammingModalWithData}
                onCancelSlot={(slot) => planning.openCancelSlotModal(slot, intervention.id)}
                onRejectSlot={(slot) => planning.openRejectSlotModal(slot, intervention.id)}
                currentUserId={currentUser?.id}
                userRole="prestataire"
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

      {/* Programming Modal */}
      <ProgrammingModal
        isOpen={planning.programmingModal.isOpen}
        onClose={planning.closeProgrammingModal}
        intervention={planning.programmingModal.intervention}
        programmingOption={planning.programmingOption}
        onProgrammingOptionChange={planning.setProgrammingOption}
        directSchedule={planning.programmingDirectSchedule}
        onDirectScheduleChange={planning.setProgrammingDirectSchedule}
        proposedSlots={planning.programmingProposedSlots}
        onAddProposedSlot={planning.addProgrammingSlot}
        onUpdateProposedSlot={planning.updateProgrammingSlot}
        onRemoveProposedSlot={planning.removeProgrammingSlot}
        managers={managers}
        selectedManagers={managers.map(m => m.id)}
        onManagerToggle={() => {}}
        providers={providers}
        selectedProviders={providers.map(p => p.id)}
        onProviderToggle={() => {}}
        tenants={tenants}
        selectedTenants={tenants.map(t => t.id)}
        onTenantToggle={() => {}}
        onConfirm={planning.handleProgrammingConfirm}
        isFormValid={planning.isProgrammingFormValid()}
      />

      {/* Cancel Slot Modal */}
      <CancelSlotModal
        isOpen={planning.cancelSlotModal.isOpen}
        onClose={planning.closeCancelSlotModal}
        slot={planning.cancelSlotModal.slot}
        interventionId={intervention.id}
        onSuccess={handleRefresh}
      />

      {/* Reject Slot Modal */}
      <RejectSlotModal
        isOpen={planning.rejectSlotModal.isOpen}
        onClose={planning.closeRejectSlotModal}
        slot={planning.rejectSlotModal.slot}
        interventionId={intervention.id}
        onSuccess={handleRefresh}
      />

      {/* Quote Submission Modal */}
      <QuoteSubmissionModal
        open={quoteModalOpen}
        onOpenChange={setQuoteModalOpen}
        intervention={{
          ...intervention,
          urgency: intervention.urgency || 'normale',
          priority: intervention.urgency || 'normale'
        }}
        existingQuote={selectedQuote ? transformQuoteToExistingQuote(selectedQuote) : undefined}
        quoteRequest={selectedQuote ? {
          id: selectedQuote.id,
          status: selectedQuote.status,
          individual_message: selectedQuote.internal_notes || undefined,
          deadline: intervention.quote_deadline,
          sent_at: selectedQuote.created_at
        } : undefined}
        onSuccess={() => {
          setQuoteModalOpen(false)
          setSelectedQuote(null)
          handleRefresh()
        }}
      />

      {/* Reject Quote Request Modal */}
      <Dialog open={rejectQuoteModalOpen} onOpenChange={setRejectQuoteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande de devis</DialogTitle>
            <DialogDescription>
              Veuillez indiquer pourquoi vous ne pouvez pas répondre à cette demande de devis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">
                Raison du rejet *
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Intervention hors de ma zone géographique, compétences spécialisées requises, indisponible sur la période..."
                className="min-h-[120px] mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Cette raison sera visible par le gestionnaire.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-900">
                <strong>Attention:</strong> Une fois rejetée, vous ne pourrez plus soumettre de devis pour cette demande.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectQuoteModalOpen(false)}
              disabled={isRejecting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRejectQuote}
              disabled={!rejectionReason.trim() || isRejecting}
            >
              {isRejecting ? 'Rejet en cours...' : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
