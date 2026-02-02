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
  InterventionDocument,
  // Layout
  ContentWrapper,
  // Cards
  InterventionDetailsCard,
  DocumentsCard,
  QuotesCard,
  PlanningCard
} from '@/components/interventions/shared'

// Unified tabs component (replaces InterventionTabs)
import {
  EntityTabs,
  TabContentWrapper,
  getInterventionTabsConfig
} from '@/components/shared/entity-preview'

// Tab Localisation dédié
import { LocalisationTab } from '@/components/interventions/shared/tabs/localisation-tab'

// Chat component (functional, not mock)
import { InterventionChatTab } from '@/components/interventions/intervention-chat-tab'

// Intervention components
import { DetailPageHeader } from '@/components/ui/detail-page-header'
import type { DetailPageHeaderBadge, DetailPageHeaderMetadata } from '@/components/ui/detail-page-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'
import { Building2, MapPin, User as UserIcon, Calendar } from 'lucide-react'

// Modals
import { QuoteSubmissionModal } from '@/components/intervention/modals/quote-submission-modal'
import { RejectSlotModal } from '@/components/intervention/modals/reject-slot-modal'
import { ModifyChoiceModal } from '@/components/intervention/modals/modify-choice-modal'
import { TimeSlotResponseModal } from '@/components/intervention/modals/time-slot-response-modal'

// Multi-provider components
import { LinkedInterventionBanner } from '@/components/intervention/linked-interventions-section'

// Actions
import { acceptTimeSlotAction, rejectTimeSlotAction } from '@/app/actions/intervention-actions'

// Auto-execute actions from email magic links
import { useAutoExecuteAction } from '@/hooks/use-auto-execute-action'
import { useActivityLogs } from '@/hooks/use-activity-logs'

// Activity tab (shared)
import { ActivityTab } from '@/components/interventions/activity-tab'

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

type AddressRecord = Database['public']['Tables']['addresses']['Row'] | null

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row'] & {
    address_record?: AddressRecord
  }
  lot?: Database['public']['Tables']['lots']['Row'] & {
    address_record?: AddressRecord
    building?: Database['public']['Tables']['buildings']['Row'] & {
      address_record?: AddressRecord
    }
  }
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
  // Chat data
  initialMessagesByThread?: Record<string, any[]>
  initialParticipantsByThread?: Record<string, any[]>
}

// Status labels
// Note: demande_de_devis removed - quote status tracked via QuoteStatusBadge
const statusLabels: Record<string, { label: string; color: string }> = {
  'demande': { label: 'Demande', color: 'bg-gray-100 text-gray-800' },
  'rejetee': { label: 'Rejetée', color: 'bg-red-100 text-red-800' },
  'approuvee': { label: 'Approuvée', color: 'bg-green-100 text-green-800' },
  'planification': { label: 'Planification', color: 'bg-blue-100 text-blue-800' },
  'planifiee': { label: 'Planifiée', color: 'bg-blue-100 text-blue-800' },
  // Note: 'en_cours' removed from workflow
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
  parentLink,
  initialMessagesByThread,
  initialParticipantsByThread
}: PrestataireInterventionDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
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

  // Response modal state (for accept/reject with confirmation)
  const [responseModalSlotId, setResponseModalSlotId] = useState<string | null>(null)
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false)

  // Thread type à utiliser pour InterventionChatTab
  const [defaultThreadType, setDefaultThreadType] = useState<string | undefined>(undefined)

  // Local state for threads with unread counts (for optimistic updates)
  const [localThreads, setLocalThreads] = useState(threads)

  // ============================================================================
  // Tabs Configuration (unified with EntityTabs)
  // ============================================================================

  // Calculate total unread messages across all threads (uses local state for optimistic updates)
  const totalUnreadMessages = useMemo(() => {
    return localThreads.reduce((total, t) => {
      const unread = (t as any).unread_count || 0
      return total + unread
    }, 0)
  }, [localThreads])

  // Handler for marking a thread as read (optimistic update)
  const handleThreadRead = (threadId: string) => {
    setLocalThreads(prevThreads =>
      prevThreads.map(t =>
        t.id === threadId ? { ...t, unread_count: 0 } : t
      )
    )
  }

  // Activity logs for Activity tab
  const { activities: activityLogs } = useActivityLogs({
    teamId: intervention.team_id ?? undefined,
    entityType: 'intervention',
    entityId: intervention.id,
    limit: 100
  })

  // Build tabs with hasUnread indicator for conversations
  const interventionTabs = useMemo(() => {
    const baseTabs = getInterventionTabsConfig('provider')
    return baseTabs.map(tab => {
      if (tab.value === 'conversations') {
        return { ...tab, hasUnread: totalUnreadMessages > 0 }
      }
      return tab
    })
  }, [totalUnreadMessages])

  // ============================================================================
  // Auto-Execute Actions from Email Magic Links
  // ============================================================================

  // Hook to auto-execute actions from email buttons (e.g., "Accepter ce créneau")
  useAutoExecuteAction({
    interventionId: intervention.id,
    handlers: {
      // Prestataire accepts a proposed time slot
      accept_time_slot: async ({ slotId }) => {
        const result = await acceptTimeSlotAction(slotId, intervention.id)
        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de l\'acceptation du créneau')
        }
        handleRefresh()
      },
      // Prestataire rejects a time slot
      reject_slot: async ({ slotId }) => {
        // For rejection, open the modal since a reason is required
        const slot = timeSlots.find(s => s.id === slotId)
        if (slot) {
          setSlotToReject(slot)
          setRejectSlotModalOpen(true)
        }
        throw new Error('Veuillez indiquer la raison du refus')
      },
      // Prestataire submits a quick estimate
      submit_quick_estimate: async ({ amount, quoteId }) => {
        // For quick estimate, we need to submit via API
        const amountNum = parseInt(amount, 10)
        if (isNaN(amountNum) || amountNum <= 0) {
          throw new Error('Montant invalide')
        }

        // Open the quote modal with pre-filled amount
        setAvailabilityOnlyMode(false)
        setQuoteModalOpen(true)

        // Note: The modal will handle the actual submission
        // We show a toast to guide the user
        toast.info(`Devis pré-rempli avec ${amountNum}€. Vérifiez et soumettez.`)
        throw new Error('Vérifiez le devis et soumettez')
      }
    },
    onSuccess: (action) => {
      if (action === 'accept_time_slot') {
        toast.success('Créneau accepté avec succès')
      }
    }
  })

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

  // Detect if there are time slots with pending responses from the current user
  const pendingSlotsForCurrentUser = useMemo(() => {
    return timeSlots.filter(slot => {
      // Only consider active slots
      if (['cancelled', 'selected', 'confirmed', 'rejected'].includes(slot.status)) {
        return false
      }
      // Check if current user has a pending response
      const slotWithResponses = slot as TimeSlot & { responses?: Array<{ user_id: string; response: string }> }
      const userResponse = slotWithResponses.responses?.find(r => r.user_id === currentUser.id)
      // Slot needs attention if no response OR response is pending
      return !userResponse || userResponse.response === 'pending'
    })
  }, [timeSlots, currentUser.id])

  const hasProposedSlots = pendingSlotsForCurrentUser.length > 0
  const proposedSlotsCount = pendingSlotsForCurrentUser.length

  // Handler to navigate to planning tab when clicking "Voir les créneaux"
  const handleViewSlots = () => {
    setActiveTab('planning')
  }

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

  // Participants pour InterventionDetailsCard (ligne Participants dans l'onglet Général)
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
      })),
      // Mode "date fixe": le gestionnaire a sélectionné directement une date
      selected_by_manager: slot.selected_by_manager || false
    }))
  , [timeSlots])

  // Slot sélectionné pour la modale de réponse
  const selectedSlotForResponse = responseModalSlotId
    ? timeSlots.find(s => s.id === responseModalSlotId)
    : null

  // Réponse actuelle de l'utilisateur pour ce slot
  const currentUserResponseForSlot = selectedSlotForResponse
    ? (selectedSlotForResponse as any).responses?.find((r: any) => r.user_id === currentUser.id)?.response
    : null

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

  // Date planifiée (si un créneau est sélectionné)
  const confirmedSlot = timeSlots.find(s => s.status === 'selected')
  const scheduledDate = confirmedSlot?.slot_date || null
  const scheduledStartTime = confirmedSlot?.start_time || null

  // Handler pour ouvrir le chat depuis un participant (icône message dans ParticipantsRow)
  const handleOpenChatFromParticipant = (
    _participantId: string,
    threadType: 'group' | 'tenant_to_managers' | 'provider_to_managers'
  ) => {
    setDefaultThreadType(threadType)
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

  // Handle accept slot - opens the response modal for confirmation
  const handleAcceptSlot = (slot: TimeSlot) => {
    console.log('🔵 [DEBUG] handleAcceptSlot called:', { slotId: slot?.id, interventionId: intervention.id })
    if (!slot) {
      console.error('🔴 [DEBUG] handleAcceptSlot: slot is undefined!')
      toast.error('Erreur: créneau non trouvé')
      return
    }
    // Open the response modal instead of calling action directly
    setResponseModalSlotId(slot.id)
    setIsResponseModalOpen(true)
  }

  // Handle opening response modal (for modify choice button)
  const handleOpenResponseModal = (slotId: string) => {
    const slotExists = timeSlots.some(s => s.id === slotId)
    if (slotExists) {
      setResponseModalSlotId(slotId)
      setIsResponseModalOpen(true)
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

      const successMessage = isSent ? 'Estimation annulée avec succès' : 'Estimation supprimée avec succès'
      toast.success(successMessage)
      handleRefresh()
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error('Erreur lors de la suppression de l\'estimation')
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
  // Note: demande_de_devis removed - quote status tracked via QuoteStatusBadge
  const getStatusBadge = (): DetailPageHeaderBadge => {
    const statusConfig: Record<string, { label: string; color: string; dotColor: string; icon?: any }> = {
      'demande': { label: 'Demande', color: 'bg-blue-50 border-blue-200 text-blue-900', dotColor: 'bg-blue-500', icon: null },
      'approuvee': { label: 'Approuvée', color: 'bg-green-50 border-green-200 text-green-900', dotColor: 'bg-green-500', icon: null },
      'planification': { label: 'Planification', color: 'bg-purple-50 border-purple-200 text-purple-900', dotColor: 'bg-purple-500', icon: null },
      'planifiee': { label: 'Planifiée', color: 'bg-indigo-50 border-indigo-200 text-indigo-900', dotColor: 'bg-indigo-500', icon: null },
      // Note: 'en_cours' removed from workflow
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

      {/* Layout pleine largeur sans sidebar */}
      <div className="layout-padding h-full bg-slate-50 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <EntityTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={interventionTabs}
          >
              {/* TAB: GENERAL */}
              <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <ContentWrapper>
                  {/* Bannières de confirmation si nécessaire */}
                  {/* Show slot banner if there are pending slots, otherwise show confirmation banner */}
                  {hasProposedSlots ? (
                    <ConfirmationRequiredBanner
                      interventionId={intervention.id}
                      hasProposedSlots={true}
                      proposedSlotsCount={proposedSlotsCount}
                      onViewSlots={handleViewSlots}
                    />
                  ) : showConfirmationBanner && (
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
                      interventionStatus={intervention.status}
                      participants={participants}
                      currentUserId={currentUser.id}
                      currentUserRole="prestataire"
                      onOpenChat={handleOpenChatFromParticipant}
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

              {/* TAB: LOCALISATION */}
              <TabsContent value="localisation" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                  <LocalisationTab
                    latitude={(() => {
                      const lotRecord = intervention.lot?.address_record
                      const buildingRecord = intervention.lot?.building?.address_record || intervention.building?.address_record
                      const record = lotRecord || buildingRecord
                      return record?.lat || undefined
                    })()}
                    longitude={(() => {
                      const lotRecord = intervention.lot?.address_record
                      const buildingRecord = intervention.lot?.building?.address_record || intervention.building?.address_record
                      const record = lotRecord || buildingRecord
                      return record?.lng || undefined
                    })()}
                    address={(() => {
                      const lotRecord = intervention.lot?.address_record
                      const buildingRecord = intervention.lot?.building?.address_record || intervention.building?.address_record
                      const record = lotRecord || buildingRecord
                      if (!record) return undefined
                      if (record.formatted_address) return record.formatted_address
                      return [record.street, record.postal_code, record.city].filter(Boolean).join(', ') || undefined
                    })()}
                    buildingName={intervention.lot?.building?.name || intervention.building?.name || undefined}
                    lotReference={intervention.lot?.reference || undefined}
                  />
                </div>
              </TabsContent>

              {/* TAB: CONVERSATIONS */}
              <TabsContent value="conversations" className="mt-0 flex-1 flex flex-col overflow-y-auto h-full">
                <InterventionChatTab
                  interventionId={intervention.id}
                  threads={localThreads}
                  initialMessagesByThread={initialMessagesByThread}
                  initialParticipantsByThread={initialParticipantsByThread}
                  currentUserId={currentUser.id}
                  userRole="prestataire"
                  defaultThreadType={defaultThreadType}
                  onThreadTypeChange={(threadType) => setDefaultThreadType(threadType)}
                  onThreadRead={handleThreadRead}
                />
              </TabsContent>

              {/* TAB: ACTIVITÉ */}
              <TabsContent value="activity" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                  <ActivityTab
                    intervention={intervention}
                    activityLogs={activityLogs.map(log => ({
                      ...log,
                      user: (log as any).user_name ? {
                        id: (log as any).user_id,
                        name: (log as any).user_name,
                        email: (log as any).user_email || '',
                        avatar_url: (log as any).user_avatar_url || null
                      } : undefined
                    }))}
                  />
                </div>
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
                    scheduledStartTime={scheduledStartTime || undefined}
                    userRole="provider"
                    currentUserId={currentUser.id}
                    onAddSlot={handleOpenAvailabilityModal}
                    onApproveSlot={(slotId) => {
                      console.log('🔵 [DEBUG] PlanningCard onApproveSlot called:', { slotId, timeSlotsCount: timeSlots.length })
                      const slot = timeSlots.find(s => s.id === slotId)
                      console.log('🔵 [DEBUG] Slot found:', slot ? { id: slot.id, date: slot.slot_date } : 'NOT FOUND')
                      if (slot) handleAcceptSlot(slot)
                      else console.error('🔴 [DEBUG] Slot not found in timeSlots array!')
                    }}
                    onRejectSlot={(slotId) => {
                      const slot = timeSlots.find(s => s.id === slotId)
                      if (slot) handleRejectSlot(slot)
                    }}
                    onOpenResponseModal={handleOpenResponseModal}
                    className="flex-1 min-h-0"
                  />
                </div>
              </TabsContent>
            </EntityTabs>
        </div>
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

      {/* Time Slot Response Modal (for accept/reject with confirmation) */}
      {selectedSlotForResponse && (
        <TimeSlotResponseModal
          isOpen={isResponseModalOpen}
          onClose={() => {
            setIsResponseModalOpen(false)
            setResponseModalSlotId(null)
          }}
          slot={{
            id: selectedSlotForResponse.id,
            slot_date: selectedSlotForResponse.slot_date || '',
            start_time: selectedSlotForResponse.start_time || '',
            end_time: selectedSlotForResponse.end_time || '',
            notes: (selectedSlotForResponse as any).notes
          }}
          interventionId={intervention.id}
          currentResponse={currentUserResponseForSlot}
          onSuccess={() => {
            setIsResponseModalOpen(false)
            setResponseModalSlotId(null)
            handleRefresh()
          }}
        />
      )}

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
