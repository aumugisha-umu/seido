'use client'

/**
 * Prestataire Intervention Detail Client
 * Main client component with tabs for provider view
 * Utilise les composants partagés BEM pour le nouveau design
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { formatErrorMessage } from '@/lib/utils/error-formatter'
import { createBrowserSupabaseClient } from '@/lib/services'

// Composants partagés pour le nouveau design
import {
  // Types
  Quote as SharedQuote,
  TimeSlot as SharedTimeSlot,
  Message,
  Comment as SharedComment,
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
  CommentsCard,
  DocumentsCard,
  QuotesCard,
  PlanningCard,
  ConversationCard
} from '@/components/interventions/shared'

// Tab components (gardés pour compatibilité)
import { ChatTab } from './chat-tab'
import { QuotesTab } from './quotes-tab'
import { DocumentsTab } from './documents-tab'

// Intervention components
import { DetailPageHeader } from '@/components/ui/detail-page-header'
import type { DetailPageHeaderBadge, DetailPageHeaderMetadata } from '@/components/ui/detail-page-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'
import { Building2, MapPin, User as UserIcon, Calendar } from 'lucide-react'

// Modals
import { QuoteSubmissionModal } from '@/components/intervention/modals/quote-submission-modal'
import { RejectSlotModal } from '@/components/intervention/modals/reject-slot-modal'
import { ModifyChoiceModal } from '@/components/intervention/modals/modify-choice-modal'

// Multi-provider components
import { LinkedInterventionBanner } from '@/components/intervention/linked-interventions-section'

// Actions
import { acceptTimeSlotAction } from '@/app/actions/intervention-actions'

// Confirmation banners
import {
  ConfirmationRequiredBanner,
  ConfirmationSuccessBanner,
  ConfirmationRejectedBanner
} from '@/components/intervention/confirmation-required-banner'
import {
  getParticipantPermissions,
  hasConfirmed,
  hasRejected
} from '@/lib/utils/intervention-permissions'

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

// Multi-provider types
type AssignmentMode = Database['public']['Enums']['assignment_mode']

interface ParentLink {
  id: string
  parent_intervention_id: string
  child_intervention_id: string
  provider_id: string
  link_type: string
  parent?: {
    id: string
    reference: string
    title: string
  }
}

interface PrestataireInterventionDetailClientProps {
  intervention: Intervention
  documents: Document[]
  quotes: Quote[]
  threads: Thread[]
  timeSlots: TimeSlot[]
  assignments: Assignment[]
  currentUser: User
  // Multi-provider mode data
  assignmentMode?: AssignmentMode
  providerInstructions?: string
  parentLink?: ParentLink
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
  currentUser,
  assignmentMode = 'single',
  providerInstructions,
  parentLink
}: PrestataireInterventionDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [availabilityOnlyMode, setAvailabilityOnlyMode] = useState(false) // Hide estimation section
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [rejectQuoteModalOpen, setRejectQuoteModalOpen] = useState(false)
  const [quoteToReject, setQuoteToReject] = useState<Quote | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Reject slot modal state
  const [rejectSlotModalOpen, setRejectSlotModalOpen] = useState(false)
  const [slotToReject, setSlotToReject] = useState<TimeSlot | null>(null)

  // Modify choice modal state
  const [modifyChoiceModalOpen, setModifyChoiceModalOpen] = useState(false)
  const [slotToModify, setSlotToModify] = useState<TimeSlot | null>(null)
  const [currentChoice, setCurrentChoice] = useState<'accepted' | 'rejected'>('accepted')

  // États pour le nouveau design PreviewHybrid
  const [activeConversation, setActiveConversation] = useState<'group' | string>('group')

  // ============================================================================
  // Participant Confirmation Logic
  // ============================================================================

  // Prestataire is never the creator (interventions are created by managers/tenants)
  const isCreator = false

  // Find current user's assignment
  const currentUserAssignment = useMemo(() => {
    return assignments.find(a => a.user_id === currentUser.id)
  }, [assignments, currentUser.id])

  // Build intervention confirmation info
  const interventionConfirmationInfo = useMemo(() => ({
    requires_participant_confirmation: intervention.requires_participant_confirmation ?? false
  }), [intervention.requires_participant_confirmation])

  // Build assignment confirmation info
  const assignmentConfirmationInfo = useMemo(() => {
    if (!currentUserAssignment) return null
    return {
      requires_confirmation: currentUserAssignment.requires_confirmation ?? false,
      confirmation_status: (currentUserAssignment.confirmation_status ?? 'not_required') as 'pending' | 'confirmed' | 'rejected' | 'not_required'
    }
  }, [currentUserAssignment])

  // Get permissions for current user
  const participantPermissions = useMemo(() => {
    return getParticipantPermissions(
      interventionConfirmationInfo,
      assignmentConfirmationInfo,
      isCreator
    )
  }, [interventionConfirmationInfo, assignmentConfirmationInfo, isCreator])

  // Determine which banner to show
  const showConfirmationBanner = participantPermissions.canConfirm
  const showConfirmedBanner = hasConfirmed(assignmentConfirmationInfo)
  const showRejectedBanner = hasRejected(assignmentConfirmationInfo)

  // Callback after confirmation/rejection
  const handleConfirmationResponse = () => {
    router.refresh()
  }

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

  // ============================================================================
  // Transformations pour les composants shared (nouveau design PreviewHybrid)
  // ============================================================================

  // Participants pour InterventionSidebar (format Participant)
  const participants = useMemo(() => ({
    managers: assignments
      .filter(a => a.role === 'gestionnaire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name || '',
        email: a.user!.email || undefined,
        phone: a.user!.phone || undefined,
        role: 'manager' as const
      })),
    providers: assignments
      .filter(a => a.role === 'prestataire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name || '',
        email: a.user!.email || undefined,
        phone: a.user!.phone || undefined,
        role: 'provider' as const
      })),
    tenants: assignments
      .filter(a => a.role === 'locataire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name || '',
        email: a.user!.email || undefined,
        phone: a.user!.phone || undefined,
        role: 'tenant' as const
      }))
  }), [assignments])

  // Quotes transformés pour QuotesCard
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
      responses: (slot as any).responses?.map((r: any) => ({
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
      author: 'Système',
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
  }, [intervention])

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

  const handleRefresh = async () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  // Handle reject slot - opens the reject modal
  const handleRejectSlot = (slot: TimeSlot) => {
    setSlotToReject(slot)
    setRejectSlotModalOpen(true)
  }

  // Handle accept slot - calls the server action directly
  const handleAcceptSlot = async (slot: TimeSlot) => {
    try {
      const result = await acceptTimeSlotAction(slot.id, intervention.id)
      if (result.success) {
        toast.success('Créneau accepté avec succès')
        handleRefresh()
      } else {
        toast.error(formatErrorMessage(result.error, 'Erreur lors de l\'acceptation du créneau'))
      }
    } catch (error) {
      console.error('Error accepting slot:', error)
      toast.error('Erreur lors de l\'acceptation du créneau')
    }
  }

  // Handle modify choice - opens the modify choice modal
  const handleModifyChoice = (slot: TimeSlot, currentResponse: 'accepted' | 'rejected') => {
    setSlotToModify(slot)
    setCurrentChoice(currentResponse)
    setModifyChoiceModalOpen(true)
  }

  // Handle opening availability modal (quote submission modal in availability-only mode)
  const handleOpenAvailabilityModal = () => {
    setAvailabilityOnlyMode(true)
    setQuoteModalOpen(true)
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

  // Handle opening quote submission modal (full quote with estimation)
  const handleOpenQuoteModal = () => {
    setSelectedQuote(null)
    setAvailabilityOnlyMode(false) // Show full form with estimation
    setQuoteModalOpen(true)
  }

  // Handle editing existing quote
  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setAvailabilityOnlyMode(false) // Ensure full form is shown when editing
    setQuoteModalOpen(true)
  }

  // Transform database quote to ExistingQuote format for QuoteSubmissionForm
  const transformQuoteToExistingQuote = (quote: Quote) => {
    // Extract labor and materials costs from line_items JSONB
    const lineItems = quote.line_items as any[] || []
    const laborItem = lineItems.find((item: any) => item.description?.includes('Main d\'œuvre'))
    const materialsItem = lineItems.find((item: any) => item.description?.includes('Matériaux'))

    return {
      id: quote.id, // Conserver l'ID du devis pour permettre la modification
      laborCost: laborItem?.total || quote.amount || 0,
      materialsCost: materialsItem?.total || 0,
      workDetails: quote.description || '',
      estimatedDurationHours: laborItem?.quantity || 1,
      attachments: [],
      providerAvailabilities: []
    }
  }

  const statusInfo = statusLabels[intervention.status] || statusLabels['demande']

  // Helper functions for DetailPageHeader
  const getStatusBadge = (): DetailPageHeaderBadge => {
    const statusConfig: Record<string, { label: string; color: string; dotColor: string; icon?: any }> = {
      'demande': { label: 'Demande', color: 'bg-blue-50 border-blue-200 text-blue-900', dotColor: 'bg-blue-500', icon: null },
      'approuvee': { label: 'Approuvée', color: 'bg-green-50 border-green-200 text-green-900', dotColor: 'bg-green-500', icon: null },
      'demande_de_devis': { label: 'Demande de devis', color: 'bg-amber-50 border-amber-200 text-amber-900', dotColor: 'bg-amber-500', icon: null },
      'planification': { label: 'Planification', color: 'bg-purple-50 border-purple-200 text-purple-900', dotColor: 'bg-purple-500', icon: null },
      'planifiee': { label: 'Planifiée', color: 'bg-indigo-50 border-indigo-200 text-indigo-900', dotColor: 'bg-indigo-500', icon: null },
      'en_cours': { label: 'En cours', color: 'bg-cyan-50 border-cyan-200 text-cyan-900', dotColor: 'bg-cyan-500', icon: null },
      'cloturee_par_prestataire': { label: 'Clôturée (Prestataire)', color: 'bg-emerald-50 border-emerald-200 text-emerald-900', dotColor: 'bg-emerald-500', icon: null },
      'cloturee_par_gestionnaire': { label: 'Clôturée', color: 'bg-slate-50 border-slate-200 text-slate-900', dotColor: 'bg-slate-500', icon: null },
      'annulee': { label: 'Annulée', color: 'bg-red-50 border-red-200 text-red-900', dotColor: 'bg-red-500', icon: null },
      'rejetee': { label: 'Rejetée', color: 'bg-red-50 border-red-200 text-red-900', dotColor: 'bg-red-500', icon: null }
    }
    const config = statusConfig[intervention.status] || statusConfig['demande']
    return {
      label: config.label,
      color: config.color,
      dotColor: config.dotColor,
      icon: config.icon
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

    if (intervention.creator?.name) {
      metadata.push({ icon: UserIcon, text: `Par ${intervention.creator.name}` })
    }

    if (intervention.created_at) {
      metadata.push({ icon: Calendar, text: formatDate(intervention.created_at) })
    }

    return metadata
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Intervention Detail Header with Action Panel */}
      <DetailPageHeader
        onBack={() => router.back()}
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
              quotes: quotes.map(q => ({
                id: q.id,
                status: q.status,
                providerId: q.provider_id,
                isCurrentUserQuote: q.provider_id === currentUser.id,
                amount: q.amount,
                description: q.description,
                line_items: q.line_items
              }))
            }}
            userRole="prestataire"
            userId={currentUser.id}
            timeSlots={timeSlots}
            onActionComplete={handleActionComplete}
            onOpenQuoteModal={handleOpenQuoteModal}
            onEditQuote={handleEditQuote}
            onRejectQuoteRequest={handleRejectQuoteRequest}
            onCancelQuote={handleCancelQuote}
            onProposeSlots={handleOpenAvailabilityModal}
          />
        }
        hasGlobalNav={false}
      />

      {/* Banner for child interventions (linked from parent) */}
      {parentLink?.parent && (
        <div className="layout-padding pt-4">
          <LinkedInterventionBanner
            parentId={parentLink.parent.id}
            parentReference={parentLink.parent.reference}
          />
        </div>
      )}

      {/* Provider-specific instructions (in separate mode) */}
      {providerInstructions && (
        <div className="layout-padding pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Instructions pour vous
            </h3>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">
              {providerInstructions}
            </p>
          </div>
        </div>
      )}

      {/* Nouveau design PreviewHybrid */}
      <div className="layout-padding h-full bg-slate-50 flex flex-col overflow-hidden">
        <PreviewHybridLayout
          sidebar={
            <InterventionSidebar
              participants={participants}
              currentUserRole="provider"
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
              userRole="provider"
            >
              {/* TAB: GENERAL */}
              <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <ContentWrapper>
                  {/* Bannières de confirmation si nécessaire */}
                  {showConfirmationBanner && (
                    <ConfirmationRequiredBanner
                      interventionId={intervention.id}
                      scheduledDate={intervention.scheduled_date}
                      scheduledTime={null}
                      onConfirm={handleConfirmationResponse}
                      onReject={handleConfirmationResponse}
                    />
                  )}
                  {showConfirmedBanner && <ConfirmationSuccessBanner />}
                  {showRejectedBanner && <ConfirmationRejectedBanner />}

                  {/* Détails de l'intervention */}
                  <div className="flex-shrink-0">
                    <InterventionDetailsCard
                      title={intervention.title}
                      description={intervention.description || undefined}
                      instructions={intervention.instructions || undefined}
                      planning={{
                        scheduledDate,
                        status: scheduledDate ? 'scheduled' : 'pending',
                        quotesCount: transformedQuotes.length,
                        quotesStatus: transformedQuotes.some(q => q.status === 'approved')
                          ? 'approved'
                          : transformedQuotes.length > 0
                            ? 'received'
                            : 'pending',
                        selectedQuoteAmount: transformedQuotes.find(q => q.status === 'approved')?.amount
                      }}
                    />
                  </div>

                  {/* Documents */}
                  <div className="mt-6 flex-1 min-h-0 overflow-hidden">
                    <DocumentsCard
                      documents={transformedDocuments}
                      userRole="provider"
                      onUpload={() => console.log('Upload document')}
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
                  currentUserRole="provider"
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
                  {/* Devis du prestataire */}
                  <QuotesCard
                    quotes={transformedQuotes.filter(q => q.provider_id === currentUser.id)}
                    userRole="provider"
                    showActions={false}
                    onAddQuote={handleOpenQuoteModal}
                    className="flex-1 min-h-0"
                  />

                  {/* Planning */}
                  <PlanningCard
                    timeSlots={transformedTimeSlots}
                    scheduledDate={scheduledDate || undefined}
                    userRole="provider"
                    currentUserId={currentUser.id}
                    onAddSlot={handleOpenAvailabilityModal}
                    onApproveSlot={(slotId) => {
                      const slot = timeSlots.find(s => s.id === slotId)
                      if (slot) handleAcceptSlot(slot)
                    }}
                    onRejectSlot={(slotId) => {
                      const slot = timeSlots.find(s => s.id === slotId)
                      if (slot) handleRejectSlot(slot)
                    }}
                    className="flex-1 min-h-0"
                  />
                </div>
              </TabsContent>
            </InterventionTabs>
          }
        />
      </div>


      {/* Quote Submission Modal */}
      <QuoteSubmissionModal
        open={quoteModalOpen}
        onOpenChange={setQuoteModalOpen}
        intervention={{
          ...intervention,
          urgency: intervention.urgency || 'normale',
          priority: intervention.urgency || 'normale',
          time_slots: timeSlots
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
          setAvailabilityOnlyMode(false) // Reset mode
          handleRefresh()
        }}
        hideEstimationSection={availabilityOnlyMode}
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

      {/* Reject Slot Modal */}
      <RejectSlotModal
        isOpen={rejectSlotModalOpen}
        onClose={() => setRejectSlotModalOpen(false)}
        slot={slotToReject}
        interventionId={intervention.id}
        onSuccess={() => {
          setRejectSlotModalOpen(false)
          setSlotToReject(null)
          handleRefresh()
        }}
      />

      {/* Modify Choice Modal */}
      <ModifyChoiceModal
        isOpen={modifyChoiceModalOpen}
        onClose={() => setModifyChoiceModalOpen(false)}
        slot={slotToModify}
        currentResponse={currentChoice}
        interventionId={intervention.id}
        onSuccess={() => {
          setModifyChoiceModalOpen(false)
          setSlotToModify(null)
          handleRefresh()
        }}
      />
    </div>
  )
}
