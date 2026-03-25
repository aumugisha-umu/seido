'use client'

/**
 * Prestataire Intervention Detail Client
 * Main client component with tabs for provider view
 * Utilise les composants partagés BEM pour le nouveau design
 */

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatErrorMessage } from '@/lib/utils/error-formatter'
import { createBrowserSupabaseClient } from '@/lib/services'
import { useDocumentActions } from '@/components/interventions/shared'

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
  PlanningCard,
  ReportsCard,
  InterventionReport,
} from '@/components/interventions/shared'

// Unified tabs component (replaces InterventionTabs)
import {
  EntityTabs,
  TabContentWrapper,
  getInterventionTabsConfig
} from '@/components/shared/entity-preview'

// Tab Localisation dédié
import { LocalisationTab } from '@/components/interventions/shared/tabs/localisation-tab'

// Lazy-loaded chat component shared across all roles
import { LazyInterventionChatTab as InterventionChatTab } from '@/components/interventions/lazy-intervention-chat-tab'

// Intervention components
import { DetailPageHeader } from '@/components/ui/detail-page-header'
import type { DetailPageHeaderBadge, DetailPageHeaderMetadata } from '@/components/ui/detail-page-header'
import { InterventionActionPanelHeader } from '@/components/intervention/intervention-action-panel-header'
import { Building2, MapPin, User as UserIcon, Calendar } from 'lucide-react'

// Modals
import { QuoteSubmissionModal } from '@/components/intervention/modals/quote-submission-modal'
import { ModifyChoiceModal } from '@/components/intervention/modals/modify-choice-modal'
import { MultiSlotResponseModal, type TimeSlot as ModalTimeSlot } from '@/components/intervention/modals/multi-slot-response-modal'

// Multi-provider components
import { LinkedInterventionBanner } from '@/components/intervention/linked-interventions-section'

// Actions
import { acceptTimeSlotAction, rejectTimeSlotAction } from '@/app/actions/intervention-actions'

// Auto-execute actions from email magic links
import { useAutoExecuteAction } from '@/hooks/use-auto-execute-action'
import { useActivityLogs } from '@/hooks/use-activity-logs'

// Progression card (moved from Activity tab to General tab)
import { InterventionProgressCard } from '@/components/interventions/intervention-progress-card'

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

// Realtime invalidation
import { useRealtimeOptional } from '@/contexts/realtime-context'

// Extracted sub-components
import { ProviderGeneralTab } from './provider-general-tab'
import { ProviderPlanningTab } from './provider-planning-tab'
import { ProviderModals } from './provider-modals'

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
  reports: InterventionReport[]
  quotes: Quote[]
  threads: Thread[]
  timeSlots: TimeSlot[]
  assignments: Assignment[]
  currentUser: User
  // Multi-provider mode data
  assignmentMode?: AssignmentMode
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
  reports,
  quotes,
  threads,
  timeSlots,
  assignments,
  currentUser,
  assignmentMode = 'single',
  parentLink,
  initialMessagesByThread,
  initialParticipantsByThread
}: PrestataireInterventionDetailClientProps) {
  const router = useRouter()
  const realtime = useRealtimeOptional()
  const searchParams = useSearchParams()
  const [autoOpenComplete, setAutoOpenComplete] = useState(false)

  // Detect ?action=complete or ?action=quote query param to auto-open modals
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'complete') {
      setAutoOpenComplete(true)
    } else if (action === 'quote') {
      setQuoteModalOpen(true)
    }
    // Clean URL to prevent re-opening on refresh
    if (action) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [searchParams])

  // Deep-link support: ?tab=conversations&thread=group
  const initialTab = searchParams.get('tab')
  const initialThread = searchParams.get('thread')
  const [activeTab, setActiveTab] = useState(
    initialTab === 'conversations' ? 'conversations' : 'general'
  )
  const [refreshing, setRefreshing] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [rejectQuoteModalOpen, setRejectQuoteModalOpen] = useState(false)
  const [quoteToReject, setQuoteToReject] = useState<Quote | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Modify choice modal state
  const [modifyChoiceModalOpen, setModifyChoiceModalOpen] = useState(false)
  const [slotToModify, setSlotToModify] = useState<TimeSlot | null>(null)
  const [currentChoice, setCurrentChoice] = useState<'accepted' | 'rejected'>('accepted')

  // Response modal state (all active slots)
  const [responseModalSlots, setResponseModalSlots] = useState<ModalTimeSlot[]>([])
  const [responseModalExisting, setResponseModalExisting] = useState<
    Record<string, { response: 'accept' | 'reject' | 'pending'; reason?: string }>
  >({})
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false)

  // Thread type à utiliser pour InterventionChatTab
  const [defaultThreadType, setDefaultThreadType] = useState<string | undefined>(initialThread || undefined)

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
        // Open MultiSlotResponseModal with all active slots
        handleOpenResponseModal(slotId)
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

  // Count ALL active (non-cancelled/selected/confirmed/rejected) slots, regardless of response
  const totalActiveSlotsCount = useMemo(() => {
    return timeSlots.filter(slot =>
      !['cancelled', 'selected', 'confirmed', 'rejected'].includes(slot.status)
    ).length
  }, [timeSlots])

  // True when user has responded to all proposed slots (none pending, but active slots exist)
  const hasRespondedToAllSlots = totalActiveSlotsCount > 0 && proposedSlotsCount === 0

  // Handler to navigate to planning tab when clicking "Voir les créneaux"
  const handleViewSlots = () => {
    setActiveTab('planning')
  }

  // Callback after confirmation/rejection
  const handleConfirmationResponse = () => {
    realtime?.broadcastInvalidation(['interventions'])
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
        company_name: (typeof a.user!.company === 'object' ? (a.user!.company as any)?.name : a.user!.company) || undefined,
        role: 'manager' as const,
        hasAccount: !!a.user!.auth_user_id
      })),
    providers: assignments
      .filter(a => a.role === 'prestataire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name || '',
        email: a.user!.email || undefined,
        phone: a.user!.phone || undefined,
        company_name: (typeof a.user!.company === 'object' ? (a.user!.company as any)?.name : a.user!.company) || undefined,
        role: 'provider' as const,
        hasAccount: !!a.user!.auth_user_id
      })),
    tenants: assignments
      .filter(a => a.role === 'locataire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name || '',
        email: a.user!.email || undefined,
        phone: a.user!.phone || undefined,
        company_name: (typeof a.user!.company === 'object' ? (a.user!.company as any)?.name : a.user!.company) || undefined,
        role: 'tenant' as const,
        hasAccount: !!a.user!.auth_user_id
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

  // Slots proposed by current user (for cancel-on-accept logic)
  const userProposedSlotIds = useMemo(() =>
    timeSlots
      .filter(s => s.proposed_by === currentUser.id && (s.status === 'pending' || s.status === 'requested'))
      .map(s => s.id),
    [timeSlots, currentUser.id]
  )

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

  // Preview/download de documents via hook partagé (modal in-app)
  const { handleViewDocument, handleDownloadDocument, previewModal } = useDocumentActions({ documents })

  const handleRefresh = async () => {
    setRefreshing(true)
    realtime?.broadcastInvalidation(['interventions'])
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  // Handle reject slot — opens response modal with ALL active slots, pre-filled as reject
  const handleRejectSlot = (slot: TimeSlot) => {
    handleOpenResponseModal(slot.id, 'reject')
  }

  // Handle accept slot — opens response modal with ALL active slots, pre-filled as accept
  const handleAcceptSlot = (slot: TimeSlot) => {
    if (!slot) {
      toast.error('Erreur: créneau non trouvé')
      return
    }
    handleOpenResponseModal(slot.id, 'accept')
  }

  // Handle opening response modal — shows ALL active slots
  // intent param pre-fills the clicked slot's response (accept/reject)
  const handleOpenResponseModal = (slotId: string, intent?: 'accept' | 'reject') => {
    const activeSlots = timeSlots.filter(s =>
      s.status !== 'cancelled' && s.status !== 'rejected'
    )

    const modalSlots: ModalTimeSlot[] = activeSlots.map(slot => ({
      id: slot.id,
      slot_date: slot.slot_date || '',
      start_time: slot.start_time || '',
      end_time: slot.end_time || '',
      notes: (slot as any).notes || null,
      proposer_name: slot.proposed_by_user?.first_name
        ? `${slot.proposed_by_user.first_name} ${slot.proposed_by_user.last_name || ''}`
        : slot.proposed_by_user?.company_name || (slot.proposed_by_user as any)?.name,
      proposer_role: slot.proposed_by_user?.role as 'gestionnaire' | 'prestataire' | 'locataire' | undefined,
      responses: ((slot as any).responses || []).map((r: any) => ({
        user_id: r.user_id,
        response: r.response as 'accepted' | 'rejected' | 'pending',
        user: {
          name: r.user?.first_name
            ? `${r.user.first_name} ${r.user.last_name || ''}`
            : r.user?.company_name || r.user?.name || 'Utilisateur',
          role: r.user?.role
        }
      }))
    }))

    // Build existingResponses: 'accepted'->'accept', 'rejected'->'reject'
    const existing: Record<string, { response: 'accept' | 'reject' | 'pending'; reason?: string }> = {}
    for (const slot of activeSlots) {
      const userResp = ((slot as any).responses || []).find(
        (r: any) => r.user_id === currentUser.id
      )
      if (userResp && userResp.response !== 'pending') {
        existing[slot.id] = {
          response: userResp.response === 'accepted' ? 'accept'
                  : userResp.response === 'rejected' ? 'reject'
                  : 'pending',
          reason: userResp.notes || undefined
        }
      }
    }

    // Overlay user's click intent for the target slot
    if (slotId && intent) {
      existing[slotId] = { response: intent }
      // If accepting, auto-reject all other pending slots (matches modal behavior)
      if (intent === 'accept') {
        for (const s of activeSlots) {
          if (s.id !== slotId && !existing[s.id]) {
            existing[s.id] = { response: 'reject', reason: 'Autre créneau accepté' }
          }
        }
      }
    }

    setResponseModalSlots(modalSlots)
    setResponseModalExisting(existing)
    setIsResponseModalOpen(true)
  }

  // Handle modify choice - opens the modify choice modal
  const handleModifyChoice = (slot: TimeSlot, currentResponse: 'accepted' | 'rejected') => {
    setSlotToModify(slot)
    setCurrentChoice(currentResponse)
    setModifyChoiceModalOpen(true)
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
    // Find existing pending quote request for this provider so the API uses UPDATE path
    const pendingQuote = transformedQuotes.find(
      q => q.provider_id === currentUser.id && (q.status === 'pending' || q.status === 'sent')
    ) || null
    setSelectedQuote(pendingQuote)
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
      id: quote.id, // Conserver l'ID du devis pour permettre la modification
      laborCost: laborItem?.total || quote.amount || 0,
      materialsCost: materialsItem?.total || 0,
      workDetails: quote.description || '',
      attachments: [],
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
              requires_quote: intervention.requires_quote || false,
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
            autoOpenComplete={autoOpenComplete}
          />
        }
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

      {/* Layout pleine largeur sans sidebar */}
      <div className="layout-padding h-full bg-slate-50 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <EntityTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={interventionTabs}
          >
              {/* TAB: GENERAL */}
              <ProviderGeneralTab
                intervention={intervention}
                participants={participants}
                currentUserId={currentUser.id}
                showConfirmedBanner={showConfirmedBanner}
                showRejectedBanner={showRejectedBanner}
                scheduledDate={scheduledDate}
                proposedSlotsCount={proposedSlotsCount}
                hasRespondedToAllSlots={hasRespondedToAllSlots}
                totalActiveSlotsCount={totalActiveSlotsCount}
                transformedQuotes={transformedQuotes}
                transformedDocuments={transformedDocuments}
                reports={reports}
                onViewDocument={handleViewDocument}
                onDownloadDocument={handleDownloadDocument}
                activityLogs={activityLogs.map(log => ({
                  ...log,
                  user: (log as any).user_name ? {
                    id: (log as any).user_id,
                    name: (log as any).user_name,
                    email: (log as any).user_email || '',
                    avatar_url: (log as any).user_avatar_url || null
                  } : undefined
                }))}
                onOpenChatFromParticipant={handleOpenChatFromParticipant}
                onOpenSlotResponseModal={() => handleOpenResponseModal('')}
                onOpenQuoteModal={handleOpenQuoteModal}
              />

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


              {/* TAB: PLANNING */}
              <ProviderPlanningTab
                schedulingType={intervention.scheduling_type}
                scheduledDate={scheduledDate}
                scheduledStartTime={scheduledStartTime}
                currentUserId={currentUser.id}
                transformedTimeSlots={transformedTimeSlots}
                transformedQuotes={transformedQuotes}
                onAcceptSlot={(slotId) => {
                  const slot = timeSlots.find(s => s.id === slotId)
                  if (slot) handleAcceptSlot(slot)
                }}
                onRejectSlot={(slotId) => {
                  const slot = timeSlots.find(s => s.id === slotId)
                  if (slot) handleRejectSlot(slot)
                }}
                onOpenResponseModal={handleOpenResponseModal}
                onRespondToQuote={handleOpenQuoteModal}
              />
            </EntityTabs>
        </div>
      </div>


      {/* All modals extracted to ProviderModals component */}
      <ProviderModals
        intervention={intervention}
        quoteModalOpen={quoteModalOpen}
        onQuoteModalOpenChange={setQuoteModalOpen}
        selectedQuote={selectedQuote}
        onQuoteSuccess={() => {
          setQuoteModalOpen(false)
          setSelectedQuote(null)
          handleRefresh()
        }}
        rejectQuoteModalOpen={rejectQuoteModalOpen}
        onRejectQuoteModalOpenChange={setRejectQuoteModalOpen}
        onConfirmRejectQuote={handleConfirmRejectQuote}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        isRejecting={isRejecting}
        responseModalSlots={responseModalSlots}
        isResponseModalOpen={isResponseModalOpen}
        responseModalExisting={responseModalExisting}
        userProposedSlotIds={userProposedSlotIds}
        onCloseResponseModal={() => {
          setIsResponseModalOpen(false)
          setResponseModalSlots([])
          setResponseModalExisting({})
        }}
        onRefresh={handleRefresh}
        modifyChoiceModalOpen={modifyChoiceModalOpen}
        onCloseModifyChoiceModal={() => setModifyChoiceModalOpen(false)}
        slotToModify={slotToModify}
        currentChoice={currentChoice}
        onModifyChoiceSuccess={() => {
          setModifyChoiceModalOpen(false)
          setSlotToModify(null)
          handleRefresh()
        }}
        previewModal={previewModal}
      />
    </div>
  )
}
