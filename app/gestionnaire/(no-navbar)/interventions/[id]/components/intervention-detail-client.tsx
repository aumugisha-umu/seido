'use client'

/**
 * Gestionnaire Intervention Detail Client Component
 * Manages tabs and interactive elements for intervention details
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

// Tab components (ChatTab kept for potential reuse)
import { ChatTab } from './chat-tab'
import { DocumentsTab } from './documents-tab'
import { EntityEmailsTab } from '@/components/emails/entity-emails-tab'

// Chat complet avec threads et temps réel
import { InterventionChatTab } from '@/components/interventions/intervention-chat-tab'

// Modale d'upload de documents
import { DocumentUploadDialog } from '@/components/interventions/document-upload-dialog'

// Composants partagés pour le nouveau design
import {
  // Types
  Participant,
  Quote as SharedQuote,
  TimeSlot as SharedTimeSlot,
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
  PlanningCard
} from '@/components/interventions/shared'

// Contacts navigator (grid/list views)
import { InterventionContactsNavigator } from '@/components/interventions/intervention-contacts-navigator'

// Helpers de formatage
import { formatDate, formatTime, formatTimeRange } from '@/components/interventions/shared/utils/helpers'

// Modal pour choisir un créneau
import { ChooseTimeSlotModal } from '@/components/intervention/modals/choose-time-slot-modal'
// Modal pour répondre à un créneau (accepter/refuser)
import { TimeSlotResponseModal } from '@/components/intervention/modals/time-slot-response-modal'
// Modal pour prévisualiser les documents
import { DocumentPreviewModal } from '@/components/intervention/modals/document-preview-modal'

// Intervention components
import { DetailPageHeader, type DetailPageHeaderBadge, type DetailPageHeaderMetadata } from '@/components/ui/detail-page-header'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, MapPin, User, AlertCircle, Edit, XCircle, MoreVertical, UserCheck, CheckCircle, MessageSquare, Calendar, FileText, Loader2 } from 'lucide-react'

// Quote status utilities
import { getQuoteBadgeStatus, getQuoteBadgeLabel, getQuoteBadgeColor } from '@/lib/utils/quote-status'

// Role-based actions utilities
import {
  getRoleBasedActions,
  getDotMenuActions,
  toButtonVariant,
  type RoleBasedAction
} from '@/lib/intervention-action-utils'

// Hooks
import { useAuth } from '@/hooks/use-auth'
import { useInterventionPlanning } from '@/hooks/use-intervention-planning'
import { useTeamStatus } from '@/hooks/use-team-status'
import { useToast } from '@/hooks/use-toast'
import { useInterventionApproval } from '@/hooks/use-intervention-approval'

// Contact selector
import { ContactSelector, type ContactSelectorRef } from '@/components/contact-selector'

// Actions
import { assignUserAction, unassignUserAction, cancelQuoteAction } from '@/app/actions/intervention-actions'
import { addInterventionComment } from '@/app/actions/intervention-comment-actions'

// Confirmation banners
import {
  ConfirmationRequiredBanner,
  ConfirmationSuccessBanner,
  ConfirmationRejectedBanner
} from '@/components/intervention/confirmation-required-banner'
import {
  getParticipantPermissions,
  needsConfirmation,
  hasConfirmed,
  hasRejected
} from '@/lib/utils/intervention-permissions'

// Intervention type icons and utils
import { getTypeIcon } from '@/components/interventions/intervention-type-icon'

// Modals
// ProgrammingModal removed - using edit page instead
// import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'
import { CancelSlotModal } from '@/components/intervention/modals/cancel-slot-modal'
import { RejectSlotModal } from '@/components/intervention/modals/reject-slot-modal'
import { CancelQuoteRequestModal } from '@/components/intervention/modals/cancel-quote-request-modal'
import { CancelQuoteConfirmModal } from '@/components/intervention/modals/cancel-quote-confirm-modal'
import { FinalizationModalLive } from '@/components/intervention/finalization-modal-live'
import dynamic from 'next/dynamic'

// Dynamic imports for approval modals
const ApprovalModal = dynamic(() => import("@/components/intervention/modals/approval-modal").then(mod => ({ default: mod.ApprovalModal })), { ssr: false })
const ApproveConfirmationModal = dynamic(() => import("@/components/intervention/modals/approve-confirmation-modal").then(mod => ({ default: mod.ApproveConfirmationModal })), { ssr: false })
const RejectConfirmationModal = dynamic(() => import("@/components/intervention/modals/reject-confirmation-modal").then(mod => ({ default: mod.RejectConfirmationModal })), { ssr: false })

// Multi-provider components
import { LinkedInterventionsSection, LinkedInterventionBanner } from '@/components/intervention/linked-interventions-section'

// Google Maps
import { GoogleMapsProvider, GoogleMapPreview } from '@/components/google-maps'
// AssignmentModeBadge moved to sidebar - see ParticipantsList
import { FinalizeMultiProviderButton } from '@/components/intervention/finalize-multi-provider-button'

import type { Database } from '@/lib/database.types'
import { createBrowserSupabaseClient } from '@/lib/services'

// Type pour address_record retourné par Supabase via la relation address_id(*)
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
  tenant?: Database['public']['Tables']['users']['Row']
  creator?: {
    id: string
    name: string
    email: string | null
    role: string
  }
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

interface Comment {
  id: string
  content: string
  created_at: string
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url' | 'role'>
}

// Multi-provider types
type AssignmentMode = Database['public']['Enums']['assignment_mode']

interface InterventionLink {
  id: string
  parent_intervention_id: string
  child_intervention_id: string
  provider_id: string
  link_type: string
  created_at: string
  parent?: { id: string; reference: string; title: string; status: string }
  child?: { id: string; reference: string; title: string; status: string }
  provider?: { id: string; first_name: string; last_name: string; avatar_url?: string }
}

interface InterventionAddress {
  latitude: number
  longitude: number
  formatted_address: string | null
}

interface InterventionDetailClientProps {
  intervention: Intervention
  assignments: Assignment[]
  documents: Document[]
  quotes: Quote[]
  timeSlots: TimeSlot[]
  threads: Thread[]
  initialMessagesByThread?: Record<string, any[]>
  initialParticipantsByThread?: Record<string, any[]>
  comments: Comment[]
  // Server-provided user info to prevent hydration mismatch
  serverUserRole: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire'
  serverUserId: string
  // Multi-provider mode data
  assignmentMode?: AssignmentMode
  linkedInterventions?: InterventionLink[]
  isParentIntervention?: boolean
  isChildIntervention?: boolean
  providerCount?: number
  // Address for map display
  interventionAddress?: InterventionAddress | null
}

// ============================================================================
// Type Badge Constants (same as interventions-list-view-v1.tsx)
// ============================================================================

const TYPE_TO_CATEGORY: Record<string, 'bien' | 'bail' | 'locataire'> = {
  // Bien (Property)
  'plomberie': 'bien', 'electricite': 'bien', 'chauffage': 'bien', 'serrurerie': 'bien',
  'menuiserie': 'bien', 'peinture': 'bien', 'espaces_verts': 'bien', 'nettoyage': 'bien',
  'renovation': 'bien', 'travaux_structurels': 'bien', 'toiture_facade': 'bien',
  'ascenseur': 'bien', 'securite_incendie': 'bien', 'autre_technique': 'bien',
  // Bail (Lease)
  'etat_des_lieux_entree': 'bail', 'etat_des_lieux_sortie': 'bail', 'regularisation_charges': 'bail',
  'revision_loyer': 'bail', 'renouvellement_bail': 'bail', 'resiliation_bail': 'bail',
  'quittancement': 'bail', 'contentieux_loyer': 'bail', 'autre_administratif': 'bail',
  // Locataire (Tenant)
  'nuisances': 'locataire', 'sinistre': 'locataire', 'demande_autorisation': 'locataire',
  'reclamation': 'locataire', 'probleme_voisinage': 'locataire', 'assurance': 'locataire',
  'autre_locataire': 'locataire',
}

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  bien: 'bg-blue-100 text-blue-700 border-blue-200',
  bail: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  locataire: 'bg-orange-100 text-orange-700 border-orange-200',
}

export function InterventionDetailClient({
  intervention,
  assignments,
  documents,
  quotes,
  timeSlots,
  threads,
  initialMessagesByThread,
  initialParticipantsByThread,
  comments,
  serverUserRole,
  serverUserId,
  assignmentMode = 'single',
  linkedInterventions = [],
  isParentIntervention = false,
  isChildIntervention = false,
  providerCount = 0,
  interventionAddress
}: InterventionDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { currentUserTeam } = useTeamStatus()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('general')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancelQuoteModal, setCancelQuoteModal] = useState<{
    isOpen: boolean
    quoteId: string | null
    providerName: string
  }>({
    isOpen: false,
    quoteId: null,
    providerName: ''
  })
  const [isCancellingQuote, setIsCancellingQuote] = useState(false)
  // ✅ FIX 2026-01-26: Use requires_quote field instead of deprecated demande_de_devis status
  const [requireQuote, setRequireQuote] = useState(intervention.requires_quote || false)
  const [showFinalizationModal, setShowFinalizationModal] = useState(false)

  // États pour le nouveau design PreviewHybrid
  const [activeConversation, setActiveConversation] = useState<'group' | string>('group')
  const [selectedSlotIdForChoice, setSelectedSlotIdForChoice] = useState<string | null>(null)
  const [isChooseModalOpen, setIsChooseModalOpen] = useState(false)
  // État pour la modale de réponse à un créneau
  const [responseModalSlotId, setResponseModalSlotId] = useState<string | null>(null)
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false)

  // Thread type sélectionné pour le chat (utilisé quand on clique sur une icône message)
  const [selectedThreadType, setSelectedThreadType] = useState<string>('group')

  // État pour la modale d'upload de documents
  const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false)

  // État pour la modale de prévisualisation de documents
  const [previewDocument, setPreviewDocument] = useState<{
    id: string
    name: string
    type?: string
    size?: string
    date?: string
    url?: string
    mimeType?: string
  } | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

  // État pour le message initial dans le chat
  const [initialChatMessage, setInitialChatMessage] = useState<string | null>(null)

  // Helpers for button visibility based on intervention status
  const canModifyOrCancel = !['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee', 'demande'].includes(intervention.status)
  const canFinalize = ['planifiee', 'cloturee_par_prestataire', 'cloturee_par_locataire'].includes(intervention.status)

  // Role-based actions from centralized utility
  const headerActions = getRoleBasedActions(intervention.id, intervention.status, 'gestionnaire')
  const dotMenuActions = getDotMenuActions(intervention.id, intervention.status, 'gestionnaire')

  // State for action button loading
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // State for cancel quote confirmation modal (from toggle)
  const [cancelQuoteConfirmModal, setCancelQuoteConfirmModal] = useState<{
    isOpen: boolean
    quoteId: string | null
    providerName: string
  }>({
    isOpen: false,
    quoteId: null,
    providerName: ''
  })
  const [isCancellingQuoteFromToggle, setIsCancellingQuoteFromToggle] = useState(false)

  // Ref for ContactSelector modal
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Get params for contact creation return flow
  const newContactId = searchParams.get('newContactId')
  const returnedContactType = searchParams.get('contactType')

  // Helper function to get active quote (pending, sent, accepted)
  const getActiveQuote = () => {
    return quotes.find(q =>
      ['pending', 'sent', 'accepted'].includes(q.status)
    )
  }

  // Sync requireQuote state with active quote (not just intervention status)
  useEffect(() => {
    const activeQuote = getActiveQuote()
    setRequireQuote(activeQuote !== undefined)
  }, [quotes])

  // ============================================================================
  // Participant Confirmation Logic
  // ============================================================================

  // Check if current user is the creator
  const isCreator = intervention.created_by === serverUserId

  // Find current user's assignment (if any)
  const currentUserAssignment = useMemo(() => {
    return assignments.find(a => a.user_id === serverUserId)
  }, [assignments, serverUserId])

  // Build intervention confirmation info for permissions helper
  const interventionConfirmationInfo = useMemo(() => ({
    requires_participant_confirmation: intervention.requires_participant_confirmation ?? false
  }), [intervention.requires_participant_confirmation])

  // Build assignment confirmation info for permissions helper
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

  // Determine which banner to show (if any)
  const showConfirmationBanner = participantPermissions.canConfirm
  const showConfirmedBanner = !isCreator && hasConfirmed(assignmentConfirmationInfo)
  const showRejectedBanner = !isCreator && hasRejected(assignmentConfirmationInfo)

  // Callback after confirmation/rejection
  const handleConfirmationResponse = () => {
    // Refresh the page to get updated data
    router.refresh()
  }

  // Transform assignments into Contact arrays by role (legacy format for modals)
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
      .filter(c => c.id) // Remove empty contacts

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
      })),
      // Mode "date fixe": le gestionnaire a sélectionné directement une date
      selected_by_manager: slot.selected_by_manager || false
    }))
    , [timeSlots])

  // Calculer les stats de réponse pour la section Planning (vue générale)
  const responseStats = useMemo(() => {
    // Filtrer les slots actifs (pending ou requested)
    const activeSlots = transformedTimeSlots.filter(s =>
      s.status === 'pending' || s.status === 'requested'
    )

    if (activeSlots.length === 0) return undefined

    // Compter les participants attendus (ceux avec requires_confirmation)
    const participantsWithConfirmation = assignments.filter(a => a.requires_confirmation)
    const totalExpectedResponses = participantsWithConfirmation.length

    if (totalExpectedResponses === 0) return undefined

    // Calculer le détail par créneau
    const slotDetails = activeSlots.map(slot => {
      const responses = slot.responses || []
      return {
        slotDate: slot.slot_date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        accepted: responses.filter(r => r.response === 'accepted').length,
        rejected: responses.filter(r => r.response === 'rejected').length,
        pending: responses.filter(r => r.response === 'pending').length
      }
    })

    // Trouver le max de réponses reçues (accepted + rejected)
    const maxResponsesReceived = Math.max(
      ...slotDetails.map(s => s.accepted + s.rejected),
      0
    )

    return {
      maxResponsesReceived,
      totalExpectedResponses,
      slotDetails
    }
  }, [transformedTimeSlots, assignments])

  // Comments transformés pour CommentsCard
  const transformedComments: SharedComment[] = useMemo(() =>
    comments.map(c => ({
      id: c.id,
      author: c.user?.name || 'Utilisateur',
      content: c.content,
      date: c.created_at,
      role: c.user?.role || undefined
    }))
    , [comments])

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

    // Toujours ajouter la création
    events.push({
      status: 'demande',
      date: intervention.created_at || new Date().toISOString(),
      author: 'Système',
      authorRole: 'manager'
    })

    // Ajouter les étapes selon le statut actuel
    // Note: 'en_cours' removed from workflow - interventions go directly from 'planifiee' to finalization
    const statusOrder = [
      'demande', 'approuvee', 'demande_de_devis', 'planification',
      'planifiee', 'cloturee_par_prestataire',
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

    if (requireQuote && currentIndex >= statusOrder.indexOf('demande_de_devis')) {
      events.push({
        status: 'demande_de_devis',
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
  }, [intervention, requireQuote])

  // Calculer les compteurs de messages non lus par type de thread
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    threads.forEach(t => {
      if ((t as any).unread_count && (t as any).unread_count > 0) {
        counts[t.thread_type] = (counts[t.thread_type] || 0) + (t as any).unread_count
      }
    })
    return counts
  }, [threads])

  // Récupérer le slot complet pour la modale de choix
  const selectedFullSlotForChoice = selectedSlotIdForChoice
    ? timeSlots.find(s => s.id === selectedSlotIdForChoice)
    : null

  // Récupérer le slot complet pour la modale de réponse
  const selectedSlotForResponse = responseModalSlotId
    ? timeSlots.find(s => s.id === responseModalSlotId)
    : null
  // Récupérer la réponse actuelle de l'utilisateur pour ce slot
  const currentUserResponseForSlot = selectedSlotForResponse
    ? (selectedSlotForResponse as any).responses?.find((r: any) => r.user_id === serverUserId)?.response
    : null

  // Créneau confirmé (si un créneau est sélectionné/confirmé)
  const confirmedSlot = timeSlots.find(s => s.status === 'selected')
  const scheduledDate = confirmedSlot?.slot_date || null
  const scheduledStartTime = confirmedSlot?.start_time || null
  const scheduledEndTime = confirmedSlot?.end_time || null
  // ✅ FIX 2026-01-28: Mode date fixe = ne pas afficher l'heure de fin (calculée auto +1h)
  const isFixedScheduling = confirmedSlot?.selected_by_manager === true

  // Compter les créneaux proposés (non sélectionnés)
  // Statuts DB: 'requested' (demandé), 'pending' (en attente), 'selected' (confirmé), 'rejected', 'cancelled'
  const proposedSlotsCount = timeSlots.filter(s =>
    s.status === 'pending' || s.status === 'requested'
  ).length

  // Statut du planning: 'scheduled' si confirmé, 'proposed' si créneaux proposés, 'pending' sinon
  const planningStatus: 'pending' | 'proposed' | 'scheduled' | 'completed' = scheduledDate
    ? 'scheduled'
    : proposedSlotsCount > 0
      ? 'proposed'
      : 'pending'

  // Statut des devis
  const quotesStatus = transformedQuotes.some(q => q.status === 'approved')
    ? 'approved'
    : transformedQuotes.length > 0
      ? 'received'
      : 'pending'

  // Montant du devis validé
  const selectedQuoteAmount = transformedQuotes.find(q => q.status === 'approved')?.amount

  // Initialize planning hook with quote request data
  const planning = useInterventionPlanning(
    requireQuote,
    providers.map(p => p.id),
    intervention.instructions || ''
  )

  // Initialize approval hook for approve/reject actions
  const approvalHook = useInterventionApproval()

  // Prepare intervention data for approval hook
  const interventionActionData = useMemo(() => {
    const location = intervention.lot?.reference
      ? `${intervention.lot.building?.name || intervention.building?.name || ''} - Lot ${intervention.lot.reference}`
      : intervention.building?.name || 'Localisation non spécifiée'

    return {
      id: intervention.id,
      type: intervention.type || '',
      status: intervention.status,
      title: intervention.title,
      description: intervention.description,
      urgency: intervention.urgency || 'normale',
      reference: intervention.reference,
      created_at: intervention.created_at,
      created_by: intervention.created_by,
      location,
      lot: intervention.lot ? {
        reference: intervention.lot.reference || '',
        building: intervention.lot.building ? { name: intervention.lot.building.name } : undefined
      } : undefined,
      building: intervention.building ? { name: intervention.building.name } : undefined,
      hasFiles: (documents?.length || 0) > 0
    }
  }, [intervention, documents])

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Handle action completion from action panel
  const handleActionComplete = () => {
    handleRefresh()
  }

  // Handler for header action buttons (from getRoleBasedActions)
  const handleHeaderActionClick = async (action: RoleBasedAction) => {
    // Special cases: some actions need specific handling
    switch (action.actionType) {
      case 'approve':
        approvalHook.handleApprovalAction(interventionActionData, 'approve')
        return
      case 'reject':
        approvalHook.handleApprovalAction(interventionActionData, 'reject')
        return
      case 'request_details':
        handleRequestDetails()
        return
      case 'finalize':
        // Check if it's an API action or navigation
        if (action.apiRoute) {
          setActionLoading(action.actionType)
          try {
            const response = await fetch(action.apiRoute, {
              method: action.apiMethod || 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ interventionId: intervention.id })
            })
            const data = await response.json()
            if (data.success) {
              toast({
                title: 'Action effectuée',
                description: 'L\'intervention a été clôturée'
              })
              handleRefresh()
            } else {
              throw new Error(data.error || 'Erreur lors de l\'action')
            }
          } catch (error) {
            toast({
              title: 'Erreur',
              description: error instanceof Error ? error.message : 'Impossible d\'effectuer l\'action',
              variant: 'destructive'
            })
          } finally {
            setActionLoading(null)
          }
          return
        } else if (action.href) {
          // For finalize with href (e.g., cloturee_par_prestataire), open the modal
          setShowFinalizationModal(true)
          return
        }
        break
      case 'remind_tenant':
        // API call for remind tenant
        if (action.apiRoute) {
          setActionLoading(action.actionType)
          try {
            const response = await fetch(action.apiRoute, {
              method: action.apiMethod || 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ interventionId: intervention.id })
            })
            const data = await response.json()
            if (data.success) {
              toast({
                title: 'Relance envoyée',
                description: 'Le locataire a été relancé par email'
              })
              handleRefresh()
            } else {
              throw new Error(data.error || 'Erreur lors de l\'envoi')
            }
          } catch (error) {
            toast({
              title: 'Erreur',
              description: error instanceof Error ? error.message : 'Impossible d\'envoyer la relance',
              variant: 'destructive'
            })
          } finally {
            setActionLoading(null)
          }
          return
        }
        break
      case 'modify':
        // Navigate to edit page
        router.push(action.href || `/gestionnaire/interventions/modifier/${intervention.id}`)
        return
      case 'cancel':
        // TODO: Open cancel modal
        console.log('Annuler intervention')
        return
    }

    // Default: navigate if href is present
    if (action.href) {
      router.push(action.href)
    }
  }

  // Handle cancel quote request - open confirmation modal
  const handleCancelQuoteRequest = (requestId: string) => {
    const quote = quotes.find(q => q.id === requestId)
    const providerName = quote?.provider?.name || 'ce prestataire'

    setCancelQuoteModal({
      isOpen: true,
      quoteId: requestId,
      providerName
    })
  }

  // Confirm cancel quote request
  const handleConfirmCancelQuote = async () => {
    if (!cancelQuoteModal.quoteId) return

    setIsCancellingQuote(true)

    try {
      const response = await fetch(`/api/intervention/${intervention.id}/quotes/${cancelQuoteModal.quoteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel quote request')
      }

      toast({
        title: 'Demande annulée',
        description: 'La demande d\'estimation a été annulée avec succès'
      })

      setCancelQuoteModal({ isOpen: false, quoteId: null, providerName: '' })
      handleRefresh()
    } catch (error) {
      console.error('Error canceling quote request:', error)
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'annulation de la demande',
        variant: 'destructive'
      })
    } finally {
      setIsCancellingQuote(false)
    }
  }

  // Handle toggle quote request ON/OFF
  const handleToggleQuoteRequest = (checked: boolean) => {
    // If toggling OFF and there is an active quote, show confirmation modal
    if (!checked) {
      const activeQuote = getActiveQuote()
      if (activeQuote) {
        const providerName = activeQuote.provider?.name || 'ce prestataire'
        setCancelQuoteConfirmModal({
          isOpen: true,
          quoteId: activeQuote.id,
          providerName
        })
        // Don't change toggle state yet (will be updated after confirmation)
        return
      }
    }
    // If toggling ON or no active quote, update toggle state directly
    setRequireQuote(checked)
  }

  // Confirm cancel quote from toggle
  const handleConfirmCancelQuoteFromToggle = async () => {
    if (!cancelQuoteConfirmModal.quoteId) return

    setIsCancellingQuoteFromToggle(true)

    try {
      console.log('🔄 Cancelling quote from toggle:', {
        interventionId: intervention.id,
        quoteId: cancelQuoteConfirmModal.quoteId,
        currentStatus: intervention.status
      })

      // 1. Cancel the quote request
      const cancelResponse = await fetch(
        `/api/intervention/${intervention.id}/quotes/${cancelQuoteConfirmModal.quoteId}`,
        { method: 'DELETE' }
      )

      if (!cancelResponse.ok) {
        const errorData = await cancelResponse.json().catch(() => ({}))
        console.error('Quote cancellation failed:', errorData)
        throw new Error(errorData.error || 'Failed to cancel quote')
      }

      console.log('✅ Quote cancelled successfully - status automatically updated to planification')

      toast({
        title: 'Demande annulée',
        description: 'La demande d\'estimation a été annulée'
      })

      setCancelQuoteConfirmModal({ isOpen: false, quoteId: null, providerName: '' })
      handleRefresh()
    } catch (error) {
      console.error('Error cancelling quote from toggle:', error)
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'annulation'
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsCancellingQuoteFromToggle(false)
    }
  }

  // Handlers for opening contact modals (using ref)
  const handleOpenManagerModal = () => {
    contactSelectorRef.current?.openContactModal('manager')
  }

  const handleOpenProviderModal = () => {
    contactSelectorRef.current?.openContactModal('provider')
  }

  // Callbacks for ContactSelector (immediate application like in creation flow)
  const handleContactSelected = async (contact: any, contactType: string) => {
    const role = contactType === 'manager' ? 'gestionnaire' : 'prestataire'
    const result = await assignUserAction(intervention.id, contact.id, role)

    if (result.success) {
      toast({
        title: 'Contact assigné',
        description: `${contact.name} a été assigné à l'intervention`,
        variant: 'default'
      })
      handleRefresh()
    } else {
      toast({
        title: 'Erreur',
        description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
        variant: 'destructive'
      })
    }
  }

  const handleContactCreated = async (contact: any, contactType: string) => {
    const role = contactType === 'manager' ? 'gestionnaire' : 'prestataire'
    const result = await assignUserAction(intervention.id, contact.id, role)

    if (result.success) {
      toast({
        title: 'Contact créé et assigné',
        description: `${contact.name} a été créé et assigné à l'intervention`,
        variant: 'default'
      })
      handleRefresh()
    } else {
      toast({
        title: 'Erreur',
        description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
        variant: 'destructive'
      })
    }
  }

  const handleContactRemoved = async (contactId: string, contactType: string) => {
    const role = contactType === 'manager' ? 'gestionnaire' : 'prestataire'
    const result = await unassignUserAction(intervention.id, contactId, role)

    if (result.success) {
      toast({
        title: 'Contact retiré',
        description: 'Le contact a été retiré de l\'intervention',
        variant: 'default'
      })
      handleRefresh()
    } else {
      toast({
        title: 'Erreur',
        description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
        variant: 'destructive'
      })
    }
  }

  // Handle redirect to multi-step contact creation flow
  const handleRequestContactCreation = (contactType: string) => {
    console.log(`🔗 [INTERVENTION-DETAIL] Redirecting to contact creation: ${contactType}`)
    // Build return URL with placeholder that will be replaced by the contact creation page
    const baseReturnUrl = `/gestionnaire/interventions/${intervention.id}`
    const returnUrl = `${baseReturnUrl}?newContactId=PLACEHOLDER&contactType=${contactType}`
    router.push(`/gestionnaire/contacts/nouveau?type=${contactType}&returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  // Auto-assign newly created contact when returning from contact creation
  useEffect(() => {
    if (!newContactId || !returnedContactType || newContactId === 'PLACEHOLDER') return

    console.log(`✅ [INTERVENTION-DETAIL] Auto-assigning new contact: ${newContactId}`)

    const role = returnedContactType === 'gestionnaire' || returnedContactType === 'manager'
      ? 'gestionnaire'
      : 'prestataire'

    assignUserAction(intervention.id, newContactId, role).then((result) => {
      if (result.success) {
        toast({
          title: 'Contact créé et assigné',
          description: 'Le nouveau contact a été créé et assigné avec succès',
          variant: 'default'
        })
        // Clean URL params and refresh
        router.replace(`/gestionnaire/interventions/${intervention.id}`)
        router.refresh()
      } else {
        toast({
          title: 'Erreur d\'assignation',
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          variant: 'destructive'
        })
      }
    })
  }, [newContactId, returnedContactType, intervention.id, router, toast])

  // Get badge counts for tabs
  const getBadgeCount = (tab: string) => {
    switch (tab) {
      case 'chat':
        return threads.length > 0 ? threads.length : undefined
      case 'documents':
        return documents.length > 0 ? documents.length : undefined
      case 'time-slots':
        return timeSlots.length > 0 ? timeSlots.length : undefined
      default:
        return undefined
    }
  }

  // Get separate badge counts for quotes tab
  const getQuotesBadges = () => {
    // Demandes en attente (pending requests - amount=0)
    const pendingRequests = quotes.filter(q =>
      q.status === 'pending' && (!q.amount || q.amount === 0)
    ).length

    // Devis soumis en attente de validation (submitted quotes - amount>0)
    const submittedQuotes = quotes.filter(q =>
      (q.status === 'pending' || q.status === 'sent') && q.amount && q.amount > 0
    ).length

    return { pendingRequests, submittedQuotes }
  }

  // Handle edit intervention - redirect to edit page
  const handleOpenProgrammingModalWithData = () => {
    // Redirect to the edit page instead of opening the modal
    router.push(`/gestionnaire/interventions/modifier/${intervention.id}`)
  }

  // Handler pour approuver un slot proposé par le prestataire
  const handleApproveSlot = async (slot: TimeSlot) => {
    try {
      // Construire les dates ISO pour l'API select-slot
      const slotStart = `${slot.slot_date}T${slot.start_time}`
      const slotEnd = `${slot.slot_date}T${slot.end_time}`

      const response = await fetch(`/api/intervention/${intervention.id}/select-slot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotStart, slotEnd })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Créneau approuvé',
          description: 'L\'intervention a été planifiée avec succès'
        })
        handleRefresh()
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de l\'approbation du créneau',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error approving slot:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'approbation du créneau',
        variant: 'destructive'
      })
    }
  }

  // Handler pour rejeter un slot proposé par le prestataire
  const handleRejectSlot = (slot: TimeSlot) => {
    planning.openRejectSlotModal(slot, intervention.id)
  }

  // Handler pour modifier un slot proposé par le gestionnaire
  const handleEditSlot = (slot: TimeSlot) => {
    // Ouvrir la modal de programmation avec les données existantes
    handleOpenProgrammingModalWithData()
  }

  // Handler pour approuver une estimation
  const handleApproveQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/intervention/${intervention.id}/quotes/${quoteId}/approve`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success || response.ok) {
        toast({
          title: 'Estimation approuvée',
          description: 'L\'estimation a été approuvée avec succès'
        })
        handleRefresh()
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de l\'approbation de l\'estimation',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error approving quote:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'approbation de l\'estimation',
        variant: 'destructive'
      })
    }
  }

  // Handler pour rejeter une estimation
  const handleRejectQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/intervention/${intervention.id}/quotes/${quoteId}/reject`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success || response.ok) {
        toast({
          title: 'Estimation rejetée',
          description: 'L\'estimation a été rejetée'
        })
        handleRefresh()
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors du rejet de l\'estimation',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error rejecting quote:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors du rejet de l\'estimation',
        variant: 'destructive'
      })
    }
  }

  // Handler pour annuler une demande d'estimation (statut pending)
  const handleCancelQuote = async (quoteId: string) => {
    try {
      const result = await cancelQuoteAction(quoteId, intervention.id)

      if (result.success) {
        toast({
          title: 'Demande annulée',
          description: 'La demande d\'estimation a été annulée'
        })
        handleRefresh()
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de l\'annulation de la demande',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error cancelling quote:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'annulation de la demande',
        variant: 'destructive'
      })
    }
  }

  // ============================================================================
  // Callbacks pour le nouveau design PreviewHybrid
  // ============================================================================

  // Callbacks pour les conversations - switchent vers l'onglet conversations
  const handleConversationClick = (participantId: string) => {
    setActiveConversation(participantId)
    // Déterminer le type de thread en fonction du rôle du participant
    const isProvider = participants.providers.some(p => p.id === participantId)
    const isTenant = participants.tenants.some(p => p.id === participantId)
    if (isProvider) {
      setSelectedThreadType('provider_to_managers')
    } else if (isTenant) {
      setSelectedThreadType('tenant_to_managers')
    } else {
      setSelectedThreadType('group')
    }
    // Switch vers l'onglet conversations
    setActiveTab('conversations')
  }

  const handleGroupConversationClick = () => {
    setActiveConversation('group')
    setSelectedThreadType('group')
    // Switch vers l'onglet conversations
    setActiveTab('conversations')
  }

  // Handler pour demander des détails (ouvre le chat avec message prérempli)
  const handleRequestDetails = () => {
    // Récupérer le prénom du locataire ayant fait la demande
    const tenant = tenants.length > 0 ? tenants[0] : null
    const tenantFirstName = tenant?.name?.split(' ')[0] || 'Monsieur/Madame'
    
    const message = `Bonjour ${tenantFirstName}, pourriez-vous nous fournir plus de détails sur cette demande afin que nous puissions l'analyser ?`
    setInitialChatMessage(message)
    setActiveTab('conversations')
    setSelectedThreadType('group')
  }

  // Handler pour changement d'onglet avec réinitialisation du message initial si nécessaire
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Réinitialiser le message initial si on quitte l'onglet conversations
    if (tab !== 'conversations') {
      setInitialChatMessage(null)
    }
  }

  // Handler pour visualiser un document (ouvre la modale de preview)
  const handleViewDocument = async (documentId: string) => {
    const doc = documents.find(d => d.id === documentId)
    if (!doc) {
      toast({ title: "Erreur", description: "Document non trouvé", variant: "destructive" })
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()
      // Le bucket est privé, on doit utiliser une URL signée (valide 1 heure)
      const { data, error } = await supabase.storage
        .from(doc.storage_bucket)
        .createSignedUrl(doc.storage_path, 3600) // 1 heure de validité

      if (error) throw error

      // Ouvrir la modale de preview au lieu d'un nouvel onglet
      const fileName = (doc as any).original_filename || doc.filename || 'Document'
      setPreviewDocument({
        id: doc.id,
        name: fileName,
        type: doc.document_type || undefined,
        size: doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : undefined,
        date: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('fr-FR') : undefined,
        url: data.signedUrl,
        mimeType: doc.mime_type || undefined
      })
      setIsPreviewModalOpen(true)
    } catch (error) {
      console.error('Error previewing document:', error)
      toast({ title: "Erreur", description: "Impossible d'ouvrir le document", variant: "destructive" })
    }
  }

  // Handler pour télécharger depuis la modale de preview
  const handleDownloadFromPreview = () => {
    if (previewDocument) {
      handleDownloadDocument(previewDocument.id)
    }
  }

  // Handler pour télécharger un document
  const handleDownloadDocument = async (documentId: string) => {
    const doc = documents.find(d => d.id === documentId)
    if (!doc) {
      toast({ title: "Erreur", description: "Document non trouvé", variant: "destructive" })
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()
      const fileName = (doc as any).original_filename || doc.filename || 'document'

      // Créer une URL signée avec l'option download pour forcer Content-Disposition: attachment
      const { data, error } = await supabase.storage
        .from(doc.storage_bucket)
        .createSignedUrl(doc.storage_path, 3600, {
          download: fileName
        })

      if (error) throw error

      // Créer un élément <a> temporaire pour déclencher le téléchargement
      const link = document.createElement('a')
      link.href = data.signedUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading document:', error)
      toast({ title: "Erreur", description: "Impossible de télécharger le document", variant: "destructive" })
    }
  }

  // Handler pour ajouter un commentaire
  const handleAddComment = async (content: string) => {
    try {
      const result = await addInterventionComment({
        interventionId: intervention.id,
        content
      })

      if (result.success) {
        toast({
          title: 'Commentaire ajouté',
          description: 'Votre commentaire a été enregistré'
        })
        router.refresh()
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible d\'ajouter le commentaire',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive'
      })
    }
  }

  // Handler pour ouvrir la modale de choix de créneau
  const handleChooseSlot = (slotId: string) => {
    const slotExists = timeSlots.some(s => s.id === slotId)
    if (slotExists) {
      setSelectedSlotIdForChoice(slotId)
      setIsChooseModalOpen(true)
    }
  }

  // Handler pour ouvrir la modale de réponse à un créneau
  const handleOpenResponseModal = (slotId: string) => {
    const slotExists = timeSlots.some(s => s.id === slotId)
    if (slotExists) {
      setResponseModalSlotId(slotId)
      setIsResponseModalOpen(true)
    }
  }

  // Handler pour fermer la modale et rafraîchir
  const handleChooseModalSuccess = () => {
    setIsChooseModalOpen(false)
    setSelectedSlotIdForChoice(null)
    handleRefresh()
  }

  // Prepare header data
  // Note: demande_de_devis removed - quote status shown via getQuoteBadge()
  const getStatusBadge = (): DetailPageHeaderBadge => {
    const statusMap: Record<string, { label: string; color: string; dotColor: string }> = {
      demande: { label: 'Demande', color: 'bg-blue-100 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
      rejetee: { label: 'Rejetée', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
      approuvee: { label: 'Approuvée', color: 'bg-green-100 text-green-800 border-green-200', dotColor: 'bg-green-500' },
      planification: { label: 'Planification', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dotColor: 'bg-yellow-500' },
      planifiee: { label: 'Planifiée', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', dotColor: 'bg-indigo-500' },
      // Note: 'en_cours' removed from workflow
      cloturee_par_prestataire: { label: 'Clôturée (prestataire)', color: 'bg-green-100 text-green-800 border-green-200', dotColor: 'bg-green-500' },
      cloturee_par_locataire: { label: 'Clôturée (locataire)', color: 'bg-green-100 text-green-800 border-green-200', dotColor: 'bg-green-500' },
      cloturee_par_gestionnaire: { label: 'Clôturée', color: 'bg-gray-100 text-gray-800 border-gray-200', dotColor: 'bg-gray-500' },
      annulee: { label: 'Annulée', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
    }
    const status = statusMap[intervention.status] || statusMap.demande
    return { ...status, icon: AlertCircle }
  }

  // Quote status badge - shows when intervention requires quote
  const getQuoteBadge = (): DetailPageHeaderBadge | null => {
    if (!intervention.requires_quote) return null

    const quoteStatus = getQuoteBadgeStatus(quotes)
    if (!quoteStatus) return null

    return {
      label: getQuoteBadgeLabel(quoteStatus),
      color: getQuoteBadgeColor(quoteStatus),
      dotColor: '',
      icon: FileText
    }
  }

  const getUrgencyBadge = (): DetailPageHeaderBadge | null => {
    const urgency = intervention.urgency || 'normale'
    const urgencyMap: Record<string, { label: string; color: string; dotColor: string }> = {
      haute: { label: 'Urgente', color: 'bg-orange-100 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
      normale: { label: 'Normale', color: 'bg-blue-100 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
      basse: { label: 'Basse', color: 'bg-gray-100 text-gray-800 border-gray-200', dotColor: 'bg-gray-500' },
    }
    return urgency !== 'normale' ? urgencyMap[urgency] || null : null
  }

  const getTypeBadge = (): DetailPageHeaderBadge | null => {
    const typeCode = intervention.type
    if (!typeCode) return null

    const categoryCode = TYPE_TO_CATEGORY[typeCode] || 'bien'
    const badgeStyle = CATEGORY_BADGE_STYLES[categoryCode] || CATEGORY_BADGE_STYLES.bien
    const TypeIcon = getTypeIcon(typeCode)

    // Format label: capitalize first letter and replace underscores with spaces
    const label = typeCode
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    return {
      label,
      color: badgeStyle,
      dotColor: '', // No dot for type badge, we use icon
      icon: TypeIcon
    }
  }

  const headerBadges: DetailPageHeaderBadge[] = [getTypeBadge(), getStatusBadge(), getQuoteBadge(), getUrgencyBadge()].filter(Boolean) as DetailPageHeaderBadge[];

  // Metadata: Show scheduled date/time in header when confirmed
  // ✅ FIX 2026-01-28: Ne pas afficher l'heure de fin en mode date fixe (selected_by_manager)
  const headerMetadata: DetailPageHeaderMetadata[] = [];
  if (scheduledDate) {
    let scheduledText: string;
    if (scheduledStartTime) {
      // Mode date fixe: afficher seulement l'heure de début
      // Mode créneaux: afficher la plage horaire complète
      scheduledText = isFixedScheduling
        ? `${formatDate(scheduledDate)} • ${formatTime(scheduledStartTime)}`
        : scheduledEndTime
          ? `${formatDate(scheduledDate)} • ${formatTimeRange(scheduledStartTime, scheduledEndTime)}`
          : `${formatDate(scheduledDate)} • ${formatTime(scheduledStartTime)}`;
    } else {
      scheduledText = formatDate(scheduledDate);
    }
    headerMetadata.push({
      icon: Calendar,
      text: scheduledText
    });
  }

  // Helper function to check if action badge should be shown
  const shouldShowActionBadge = (
    status: string,
    quotes: Quote[]
  ): boolean => {
    switch (status) {
      case 'demande':
      case 'approuvee':
      case 'cloturee_par_prestataire':
      case 'cloturee_par_locataire':
        return true;

      case 'demande_de_devis':
        return quotes?.some(q => q.status === 'pending' || q.status === 'sent') ?? false;

      default:
        return false;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Unified Detail Page Header */}
      <DetailPageHeader
        onBack={() => router.push('/gestionnaire/interventions')}
        backButtonText="Retour"
        title={intervention.title}
        badges={headerBadges}
        metadata={headerMetadata}
        actionButtons={
          <>
            {/* Desktop Layout (≥1024px) : Badge inline + Boutons dynamiques + Dot menu */}
            <div className="hidden lg:flex lg:items-center lg:gap-2 transition-all duration-200">
              {shouldShowActionBadge(intervention.status, quotes) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-xs font-medium text-amber-900 whitespace-nowrap">
                    Action en attente
                  </span>
                </div>
              )}

              {/* Dynamic action buttons from getRoleBasedActions */}
              {headerActions.map((action, idx) => {
                // Special handling for finalize with multi-provider mode
                if (action.actionType === 'finalize' && assignmentMode === 'separate' && providerCount > 1 && !isParentIntervention) {
                  return (
                    <FinalizeMultiProviderButton
                      key={idx}
                      interventionId={intervention.id}
                      providerCount={providerCount}
                      onSuccess={handleRefresh}
                      variant="desktop"
                    />
                  )
                }

                return (
                  <TooltipProvider key={idx}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={toButtonVariant(action.variant)}
                          size="sm"
                          onClick={() => handleHeaderActionClick(action)}
                          disabled={actionLoading === action.actionType}
                          className={`gap-2 min-h-[36px] ${
                            action.variant === 'primary' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''
                          }`}
                        >
                          {actionLoading === action.actionType ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <action.icon className="w-4 h-4" />
                          )}
                          <span>{action.label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{action.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}

              {/* Dot menu for secondary actions (Modifier/Annuler) */}
              {dotMenuActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                    >
                      <MoreVertical className="w-4 h-4" />
                      <span className="sr-only">Plus d'actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {dotMenuActions.map((action, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        onClick={() => handleHeaderActionClick(action)}
                        className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600 focus:bg-red-50' : ''}
                      >
                        <action.icon className="w-4 h-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Tablet Layout (768-1023px) : Badge compact + Dynamic buttons + Dot menu */}
            <div className="hidden md:flex lg:hidden items-center gap-2 transition-all duration-200">
              {shouldShowActionBadge(intervention.status, quotes) && (
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span className="sr-only">Action en attente</span>
                </div>
              )}

              {/* Dynamic action buttons from getRoleBasedActions */}
              {headerActions.map((action, idx) => {
                // Special handling for finalize with multi-provider mode
                if (action.actionType === 'finalize' && assignmentMode === 'separate' && providerCount > 1 && !isParentIntervention) {
                  return (
                    <FinalizeMultiProviderButton
                      key={idx}
                      interventionId={intervention.id}
                      providerCount={providerCount}
                      onSuccess={handleRefresh}
                      variant="tablet"
                    />
                  )
                }

                return (
                  <Button
                    key={idx}
                    variant={toButtonVariant(action.variant)}
                    size="sm"
                    onClick={() => handleHeaderActionClick(action)}
                    disabled={actionLoading === action.actionType}
                    className={`gap-1.5 min-h-[36px] ${
                      action.variant === 'primary' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''
                    }`}
                  >
                    {actionLoading === action.actionType ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <action.icon className="w-4 h-4" />
                    )}
                    <span>{action.label}</span>
                  </Button>
                )
              })}

              {/* Dot menu for secondary actions (Modifier/Annuler) */}
              {dotMenuActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                    >
                      <MoreVertical className="w-4 h-4" />
                      <span className="sr-only">Plus d'actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {dotMenuActions.map((action, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        onClick={() => handleHeaderActionClick(action)}
                        className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600 focus:bg-red-50' : ''}
                      >
                        <action.icon className="w-4 h-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Mobile Layout (<768px) : All actions in dropdown menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative gap-2 min-h-[44px]"
                  >
                    {/* Point indicateur rouge animé si action requise */}
                    {shouldShowActionBadge(intervention.status, quotes) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                    )}
                    <MoreVertical className="w-4 h-4" />
                    <span>Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Badge informatif en haut du menu */}
                  {shouldShowActionBadge(intervention.status, quotes) && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 rounded-sm mx-1 mb-1">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        Action en attente
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Primary actions from getRoleBasedActions */}
                  {headerActions.map((action, idx) => {
                    // Special handling for finalize with multi-provider mode
                    if (action.actionType === 'finalize' && assignmentMode === 'separate' && providerCount > 1 && !isParentIntervention) {
                      return (
                        <FinalizeMultiProviderButton
                          key={idx}
                          interventionId={intervention.id}
                          providerCount={providerCount}
                          onSuccess={handleRefresh}
                          variant="mobile"
                        />
                      )
                    }

                    return (
                      <DropdownMenuItem
                        key={idx}
                        onClick={() => handleHeaderActionClick(action)}
                        disabled={actionLoading === action.actionType}
                        className={
                          action.variant === 'primary' ? 'text-green-700 focus:text-green-800 focus:bg-green-50' :
                          action.variant === 'destructive' ? 'text-red-700 focus:text-red-800 focus:bg-red-50' : ''
                        }
                      >
                        {actionLoading === action.actionType ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <action.icon className="w-4 h-4 mr-2" />
                        )}
                        {action.label}
                      </DropdownMenuItem>
                    )
                  })}

                  {/* Separator before secondary actions */}
                  {dotMenuActions.length > 0 && headerActions.length > 0 && <DropdownMenuSeparator />}

                  {/* Secondary actions (Modifier/Annuler) */}
                  {dotMenuActions.map((action, idx) => (
                    <DropdownMenuItem
                      key={`dot-${idx}`}
                      onClick={() => handleHeaderActionClick(action)}
                      className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
                    >
                      <action.icon className="w-4 h-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        }
      />

      {/* Banner for child interventions (linked from parent) */}
      {isChildIntervention && linkedInterventions[0]?.parent && (
        <div className="layout-padding pt-4 bg-background">
          <LinkedInterventionBanner
            parentId={linkedInterventions[0].parent.id}
            parentReference={linkedInterventions[0].parent.reference}
          />
        </div>
      )}


      <div className="layout-padding flex-1 min-h-0 bg-muted flex flex-col overflow-hidden">

        {/* ProgrammingModal removed - redirects to /gestionnaire/interventions/modifier/[id] now */}

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

        {/* Cancel Quote Request Modal */}
        <CancelQuoteRequestModal
          isOpen={cancelQuoteModal.isOpen}
          onClose={() => setCancelQuoteModal({ isOpen: false, quoteId: null, providerName: '' })}
          onConfirm={handleConfirmCancelQuote}
          providerName={cancelQuoteModal.providerName}
          isLoading={isCancellingQuote}
        />

        {/* Cancel Quote Confirm Modal (from toggle) */}
        <CancelQuoteConfirmModal
          isOpen={cancelQuoteConfirmModal.isOpen}
          onClose={() => setCancelQuoteConfirmModal({ isOpen: false, quoteId: null, providerName: '' })}
          onConfirm={handleConfirmCancelQuoteFromToggle}
          providerName={cancelQuoteConfirmModal.providerName}
          isLoading={isCancellingQuoteFromToggle}
        />

        {/* Finalization Modal */}
        <FinalizationModalLive
          interventionId={intervention.id}
          isOpen={showFinalizationModal}
          onClose={() => setShowFinalizationModal(false)}
          onComplete={handleRefresh}
        />

        {/* Nouveau design PreviewHybrid */}
        <PreviewHybridLayout
          className="flex-1"
          sidebar={
            <InterventionSidebar
              participants={participants}
              currentUserRole="manager"
              currentUserId={serverUserId}
              currentStatus={intervention.status}
              timelineEvents={timelineEvents}
              activeConversation={activeConversation}
              showConversationButtons={true}
              onConversationClick={handleConversationClick}
              onGroupConversationClick={handleGroupConversationClick}
              onParticipantClick={() => handleTabChange('contacts')}
              assignmentMode={assignmentMode}
              unreadCounts={unreadCounts}
            />
          }
          content={
            <InterventionTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              userRole="manager"
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
                      locationDetails={(() => {
                        // Priorité: adresse du lot (indépendant), sinon adresse du building
                        const lotRecord = intervention.lot?.address_record
                        const buildingRecord = intervention.lot?.building?.address_record || intervention.building?.address_record
                        const record = lotRecord || buildingRecord

                        return {
                          buildingName: intervention.lot?.building?.name || intervention.building?.name || null,
                          lotReference: intervention.lot?.reference || null,
                          fullAddress: record?.formatted_address
                            || (record?.street || record?.city
                              ? [record.street, record.postal_code, record.city].filter(Boolean).join(', ')
                              : null),
                          latitude: record?.lat || null,
                          longitude: record?.lng || null
                        }
                      })()}
                      planning={{
                        scheduledDate,
                        scheduledStartTime,
                        scheduledEndTime,
                        isFixedScheduling, // ✅ Mode date fixe: ne pas afficher l'heure de fin
                        status: planningStatus,
                        proposedSlotsCount,
                        quotesCount: transformedQuotes.length,
                        requestedQuotesCount: transformedQuotes.filter(q => q.status === 'pending').length,
                        receivedQuotesCount: transformedQuotes.filter(q => q.status === 'sent').length,
                        quotesStatus,
                        selectedQuoteAmount,
                        responseStats
                      }}
                      createdBy={intervention.creator?.name || null}
                      createdAt={intervention.created_at || null}
                      onNavigateToPlanning={() => setActiveTab('planning')}
                    />
                  </div>

                  {/* Carte de localisation (si coordonnées disponibles) */}
                  {interventionAddress && (
                    <div className="flex-shrink-0 mt-6">
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Localisation
                      </h3>
                      <GoogleMapsProvider>
                        <GoogleMapPreview
                          latitude={interventionAddress.latitude}
                          longitude={interventionAddress.longitude}
                          address={interventionAddress.formatted_address || (() => {
                            const building = intervention.lot?.building || intervention.building
                            if (!building?.address_record) return undefined
                            const record = building.address_record
                            if (record.formatted_address) return record.formatted_address
                            const parts = [record.street, record.postal_code, record.city].filter(Boolean)
                            return parts.length > 0 ? parts.join(', ') : undefined
                          })()}
                          height={200}
                          className="rounded-lg border border-border shadow-sm"
                          showOpenButton={true}
                        />
                      </GoogleMapsProvider>
                    </div>
                  )}

                  {/* Documents + Commentaires */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 flex-1 min-h-0 overflow-hidden">
                    <DocumentsCard
                      documents={transformedDocuments}
                      userRole="manager"
                      onUpload={() => setIsDocumentUploadOpen(true)}
                      onView={handleViewDocument}
                      onDownload={handleDownloadDocument}
                      className="overflow-hidden"
                    />

                    <CommentsCard
                      comments={transformedComments}
                      onAddComment={handleAddComment}
                      className="overflow-hidden"
                    />
                  </div>

                  {/* Linked interventions section (for parent interventions in separate mode) */}
                  {isParentIntervention && linkedInterventions.length > 0 && (
                    <LinkedInterventionsSection
                      links={linkedInterventions}
                      currentInterventionId={intervention.id}
                      className="mt-6"
                    />
                  )}
                </ContentWrapper>
              </TabsContent>

              {/* TAB: CONVERSATIONS */}
              <TabsContent value="conversations" className="mt-0 flex-1 flex flex-col overflow-hidden h-full">
                <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6">
                  <InterventionChatTab
                    interventionId={intervention.id}
                    threads={threads}
                    initialMessagesByThread={initialMessagesByThread}
                    initialParticipantsByThread={initialParticipantsByThread}
                    currentUserId={serverUserId}
                    userRole={serverUserRole as 'gestionnaire' | 'locataire' | 'prestataire' | 'admin'}
                    defaultThreadType={selectedThreadType}
                    initialMessage={initialChatMessage || undefined}
                    onMessageSent={() => setInitialChatMessage(null)}
                  />
                </div>
              </TabsContent>

              {/* TAB: PLANNING */}
              <TabsContent value="planning" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto">
                  {/* Devis */}
                  {requireQuote && (
                    <QuotesCard
                      quotes={transformedQuotes}
                      userRole="manager"
                      showActions={true}
                      onAddQuote={() => console.log('Add quote')}
                      onApproveQuote={handleApproveQuote}
                      onRejectQuote={handleRejectQuote}
                      onCancelQuote={handleCancelQuote}
                      className="flex-1 min-h-0"
                    />
                  )}

                  {/* Planning */}
                  <PlanningCard
                    timeSlots={transformedTimeSlots}
                    scheduledDate={scheduledDate || undefined}
                    scheduledStartTime={scheduledStartTime || undefined}
                    userRole="manager"
                    currentUserId={serverUserId}
                    onAddSlot={handleOpenProgrammingModalWithData}
                    onApproveSlot={(slotId) => {
                      const slot = timeSlots.find(s => s.id === slotId)
                      if (slot) handleApproveSlot(slot)
                    }}
                    onRejectSlot={(slotId) => {
                      const slot = timeSlots.find(s => s.id === slotId)
                      if (slot) handleRejectSlot(slot)
                    }}
                    onEditSlot={(slotId) => {
                      const slot = timeSlots.find(s => s.id === slotId)
                      if (slot) handleEditSlot(slot)
                    }}
                    onCancelSlot={(slotId) => {
                      const slot = timeSlots.find(s => s.id === slotId)
                      if (slot) planning.openCancelSlotModal(slot, intervention.id)
                    }}
                    onChooseSlot={handleChooseSlot}
                    onOpenResponseModal={handleOpenResponseModal}
                    className="flex-1 min-h-0"
                  />
                </div>
              </TabsContent>

              {/* TAB: CONTACTS */}
              <TabsContent value="contacts" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                  <InterventionContactsNavigator
                    assignments={assignments}
                    className="h-full"
                  />
                </div>
              </TabsContent>

              {/* TAB: EMAILS */}
              <TabsContent value="emails" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 sm:p-6">
                  <EntityEmailsTab
                    entityType="intervention"
                    entityId={intervention.id}
                    entityName={intervention.title}
                  />
                </div>
              </TabsContent>
            </InterventionTabs>
          }
        />

        {/* Modale de choix de créneau */}
        {selectedFullSlotForChoice && (
          <ChooseTimeSlotModal
            slot={selectedFullSlotForChoice}
            interventionId={selectedFullSlotForChoice.intervention_id}
            hasActiveQuotes={transformedQuotes.some(q => q.status === 'pending' || q.status === 'sent')}
            open={isChooseModalOpen}
            onOpenChange={setIsChooseModalOpen}
            onSuccess={handleChooseModalSuccess}
          />
        )}

        {/* Modale de réponse à un créneau (accepter/refuser) */}
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
            onSuccess={handleRefresh}
          />
        )}

        {/* Contact Selector Modal */}
        <ContactSelector
          ref={contactSelectorRef}
          teamId={intervention.team_id || currentUserTeam?.id || ""}
          displayMode="compact"
          hideUI={true}
          selectedContacts={{
            manager: managers,
            provider: providers
          }}
          onContactSelected={handleContactSelected}
          onContactCreated={handleContactCreated}
          onContactRemoved={handleContactRemoved}
          onRequestContactCreation={handleRequestContactCreation}
        />

        {/* Modale d'upload de documents */}
        <DocumentUploadDialog
          interventionId={intervention.id}
          open={isDocumentUploadOpen}
          onOpenChange={setIsDocumentUploadOpen}
          onUploadComplete={() => {
            setIsDocumentUploadOpen(false)
            router.refresh()
          }}
        />

        {/* Modale de prévisualisation de documents */}
        <DocumentPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false)
            setPreviewDocument(null)
          }}
          document={previewDocument}
          onDownload={handleDownloadFromPreview}
        />

        {/* Modals pour l'approbation/rejet */}
        {approvalHook.approvalModal.isOpen && (
          <ApprovalModal
            isOpen={approvalHook.approvalModal.isOpen}
            onClose={approvalHook.closeApprovalModal}
            intervention={approvalHook.approvalModal.intervention}
            action={approvalHook.approvalModal.action}
            rejectionReason={approvalHook.rejectionReason}
            internalComment={approvalHook.internalComment}
            onRejectionReasonChange={approvalHook.setRejectionReason}
            onInternalCommentChange={approvalHook.setInternalComment}
            onActionChange={approvalHook.handleActionChange}
            onConfirm={approvalHook.handleConfirmAction}
          />
        )}

        {approvalHook.confirmationModal.isOpen && approvalHook.confirmationModal.action === "approve" && (
          <ApproveConfirmationModal
            isOpen={true}
            onClose={approvalHook.closeConfirmationModal}
            onConfirm={approvalHook.handleFinalConfirmation}
            intervention={approvalHook.confirmationModal.intervention}
            internalComment={approvalHook.internalComment}
            onInternalCommentChange={approvalHook.setInternalComment}
            isLoading={approvalHook.isLoading}
          />
        )}

        {approvalHook.confirmationModal.isOpen && approvalHook.confirmationModal.action === "reject" && (
          <RejectConfirmationModal
            isOpen={true}
            onClose={approvalHook.closeConfirmationModal}
            onConfirm={approvalHook.handleFinalConfirmation}
            intervention={approvalHook.confirmationModal.intervention}
            rejectionReason={approvalHook.rejectionReason}
            onRejectionReasonChange={approvalHook.setRejectionReason}
            internalComment={approvalHook.internalComment}
            onInternalCommentChange={approvalHook.setInternalComment}
            isLoading={approvalHook.isLoading}
          />
        )}
      </div>
    </div>
  )
}