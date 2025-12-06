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

// Composants partagés pour le nouveau design
import {
  // Types
  Participant,
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

// Modal pour choisir un créneau
import { ChooseTimeSlotModal } from '@/components/intervention/modals/choose-time-slot-modal'

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
import { Building2, MapPin, User, Calendar, AlertCircle, Edit, XCircle, MoreVertical, UserCheck } from 'lucide-react'

// Hooks
import { useAuth } from '@/hooks/use-auth'
import { useInterventionPlanning } from '@/hooks/use-intervention-planning'
import { useTeamStatus } from '@/hooks/use-team-status'
import { useToast } from '@/hooks/use-toast'

// Contact selector
import { ContactSelector, type ContactSelectorRef } from '@/components/contact-selector'

// Actions
import { assignUserAction, unassignUserAction } from '@/app/actions/intervention-actions'

// Modals
import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'
import { CancelSlotModal } from '@/components/intervention/modals/cancel-slot-modal'
import { RejectSlotModal } from '@/components/intervention/modals/reject-slot-modal'
import { CancelQuoteRequestModal } from '@/components/intervention/modals/cancel-quote-request-modal'
import { CancelQuoteConfirmModal } from '@/components/intervention/modals/cancel-quote-confirm-modal'
import { FinalizationModalLive } from '@/components/intervention/finalization-modal-live'

import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
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
  serverUserId
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
  const [requireQuote, setRequireQuote] = useState(intervention.status === 'demande_de_devis')
  const [showFinalizationModal, setShowFinalizationModal] = useState(false)

  // États pour le nouveau design PreviewHybrid
  const [activeConversation, setActiveConversation] = useState<'group' | string>('group')
  const [selectedSlotIdForChoice, setSelectedSlotIdForChoice] = useState<string | null>(null)
  const [isChooseModalOpen, setIsChooseModalOpen] = useState(false)

  // Helpers for button visibility based on intervention status
  const canModifyOrCancel = !['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee'].includes(intervention.status)
  const canFinalize = ['planifiee', 'cloturee_par_prestataire', 'cloturee_par_locataire'].includes(intervention.status)

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
      }))
    }))
    , [timeSlots])

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

  // Récupérer le slot complet pour la modale de choix
  const selectedFullSlotForChoice = selectedSlotIdForChoice
    ? timeSlots.find(s => s.id === selectedSlotIdForChoice)
    : null

  // Date planifiée (si un créneau est sélectionné)
  const scheduledDate = timeSlots.find(s => s.status === 'selected')?.slot_date || null

  // Statut du planning
  const planningStatus = scheduledDate ? 'scheduled' : 'pending'

  // Statut des devis
  const quotesStatus = transformedQuotes.some(q => q.status === 'approved')
    ? 'approved'
    : transformedQuotes.length > 0
      ? 'received'
      : 'pending'

  // Montant du devis validé
  const selectedQuoteAmount = transformedQuotes.find(q => q.status === 'approved')?.amount

  // Messages mock (à remplacer par de vraies données si disponibles)
  const mockMessages: Message[] = useMemo(() => [], [])

  // Initialize planning hook with quote request data
  const planning = useInterventionPlanning(
    requireQuote,
    providers.map(p => p.id),
    intervention.instructions || ''
  )

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
        description: 'La demande de devis a été annulée avec succès'
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
        description: 'La demande de devis a été annulée'
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
      reference: intervention.reference,
      created_at: intervention.created_at,
      created_by: intervention.creator?.name || 'Utilisateur',
      location: intervention.specific_location,
      lot: intervention.lot ? {
        reference: intervention.lot.reference || '',
        building: intervention.lot.building ? {
          name: intervention.lot.building.name || ''
        } : undefined
      } : undefined,
      building: intervention.building ? {
        name: intervention.building.name || ''
      } : undefined
    }

    // Determine planning mode based on existing time slots
    if (timeSlots.length === 0) {
      // No slots + status "planification" = "organize" (flexible) mode was selected
      // Pre-select "organize" option for edit mode
      planning.setProgrammingOption('organize')
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

  // Handler pour approuver un devis
  const handleApproveQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/intervention/${intervention.id}/quotes/${quoteId}/approve`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success || response.ok) {
        toast({
          title: 'Devis approuvé',
          description: 'Le devis a été approuvé avec succès'
        })
        handleRefresh()
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de l\'approbation du devis',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error approving quote:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'approbation du devis',
        variant: 'destructive'
      })
    }
  }

  // Handler pour rejeter un devis
  const handleRejectQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/intervention/${intervention.id}/quotes/${quoteId}/reject`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success || response.ok) {
        toast({
          title: 'Devis rejeté',
          description: 'Le devis a été rejeté'
        })
        handleRefresh()
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors du rejet du devis',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error rejecting quote:', error)
      toast({
        title: 'Erreur',
        description: 'Erreur lors du rejet du devis',
        variant: 'destructive'
      })
    }
  }

  // ============================================================================
  // Callbacks pour le nouveau design PreviewHybrid
  // ============================================================================

  // Callbacks pour les conversations
  const handleConversationClick = (participantId: string) => {
    setActiveConversation(participantId)
    setActiveTab('conversations')
  }

  const handleGroupConversationClick = () => {
    setActiveConversation('group')
    setActiveTab('conversations')
  }

  // Handler pour ouvrir la modale de choix de créneau
  const handleChooseSlot = (slotId: string) => {
    const slotExists = timeSlots.some(s => s.id === slotId)
    if (slotExists) {
      setSelectedSlotIdForChoice(slotId)
      setIsChooseModalOpen(true)
    }
  }

  // Handler pour fermer la modale et rafraîchir
  const handleChooseModalSuccess = () => {
    setIsChooseModalOpen(false)
    setSelectedSlotIdForChoice(null)
    handleRefresh()
  }

  // Prepare header data
  const getStatusBadge = (): DetailPageHeaderBadge => {
    const statusMap: Record<string, { label: string; color: string; dotColor: string }> = {
      demande: { label: 'Demande', color: 'bg-blue-100 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
      rejetee: { label: 'Rejetée', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
      approuvee: { label: 'Approuvée', color: 'bg-green-100 text-green-800 border-green-200', dotColor: 'bg-green-500' },
      demande_de_devis: { label: 'Devis demandé', color: 'bg-purple-100 text-purple-800 border-purple-200', dotColor: 'bg-purple-500' },
      planification: { label: 'Planification', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dotColor: 'bg-yellow-500' },
      planifiee: { label: 'Planifiée', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', dotColor: 'bg-indigo-500' },
      en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
      cloturee_par_prestataire: { label: 'Clôturée (prestataire)', color: 'bg-green-100 text-green-800 border-green-200', dotColor: 'bg-green-500' },
      cloturee_par_locataire: { label: 'Clôturée (locataire)', color: 'bg-green-100 text-green-800 border-green-200', dotColor: 'bg-green-500' },
      cloturee_par_gestionnaire: { label: 'Clôturée', color: 'bg-gray-100 text-gray-800 border-gray-200', dotColor: 'bg-gray-500' },
      annulee: { label: 'Annulée', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
    }
    const status = statusMap[intervention.status] || statusMap.demande
    return { ...status, icon: AlertCircle }
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

  const headerBadges: DetailPageHeaderBadge[] = [getStatusBadge(), getUrgencyBadge()].filter(Boolean) as DetailPageHeaderBadge[]

  const headerMetadata: DetailPageHeaderMetadata[] = [
    intervention.building && {
      icon: Building2,
      text: intervention.building.name || 'Immeuble'
    },
    intervention.lot && {
      icon: MapPin,
      text: intervention.lot.reference || 'Lot'
    },
    intervention.creator && {
      icon: User,
      text: intervention.creator.name
    },
    intervention.created_at && {
      icon: Calendar,
      text: new Date(intervention.created_at).toLocaleDateString('fr-FR')
    }
  ].filter(Boolean) as DetailPageHeaderMetadata[]

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
        return true

      case 'demande_de_devis':
        return quotes?.some(q => q.status === 'pending' || q.status === 'sent') ?? false

      default:
        return false
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Unified Detail Page Header */}
      <DetailPageHeader
        onBack={() => router.push('/gestionnaire/interventions')}
        backButtonText="Retour aux interventions"
        title={intervention.title}
        badges={headerBadges}
        metadata={headerMetadata}
        actionButtons={
          <>
            {/* Desktop Layout (≥1024px) : Badge inline + Boutons complets avec tooltips */}
            <div className="hidden lg:flex lg:items-center lg:gap-2 transition-all duration-200">
              {shouldShowActionBadge(intervention.status, quotes) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-xs font-medium text-amber-900 whitespace-nowrap">
                    Action en attente
                  </span>
                </div>
              )}

              {/* Bouton Modifier avec tooltip - conditionnel */}
              {canModifyOrCancel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleOpenProgrammingModalWithData}
                        className="gap-2 min-h-[36px]"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Modifier</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Proposer de nouveaux créneaux ou modifier le rendez-vous</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Bouton Finaliser avec tooltip - conditionnel */}
              {canFinalize && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowFinalizationModal(true)}
                        className="gap-2 min-h-[36px] bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Finaliser</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Valider et clôturer définitivement l'intervention</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Bouton Annuler avec tooltip - conditionnel */}
              {canModifyOrCancel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          // TODO: Open cancel modal
                          console.log('Annuler intervention')
                        }}
                        className="gap-2 min-h-[36px]"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Annuler</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Annuler cette intervention définitivement</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Tablet Layout (768-1023px) : Badge compact + Labels raccourcis */}
            <div className="hidden md:flex lg:hidden items-center gap-2 transition-all duration-200">
              {shouldShowActionBadge(intervention.status, quotes) && (
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span className="sr-only">Action en attente</span>
                </div>
              )}

              {/* Bouton Modifier - conditionnel */}
              {canModifyOrCancel && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenProgrammingModalWithData}
                  className="gap-1.5 min-h-[36px]"
                >
                  <Edit className="w-4 h-4" />
                  <span>Modifier</span>
                </Button>
              )}

              {/* Bouton Finaliser - conditionnel */}
              {canFinalize && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowFinalizationModal(true)}
                  className="gap-1.5 min-h-[36px] bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Finaliser</span>
                </Button>
              )}

              {/* Bouton Annuler - conditionnel */}
              {canModifyOrCancel && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    // TODO: Open cancel modal
                    console.log('Annuler intervention')
                  }}
                  className="gap-1.5 min-h-[36px]"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Annuler</span>
                </Button>
              )}
            </div>

            {/* Mobile Layout (<768px) : Dropdown menu avec point indicateur */}
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

                  {/* Action Modifier - conditionnelle */}
                  {canModifyOrCancel && (
                    <DropdownMenuItem onSelect={handleOpenProgrammingModalWithData}>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}

                  {/* Action Finaliser - conditionnelle */}
                  {canFinalize && (
                    <DropdownMenuItem onSelect={() => setShowFinalizationModal(true)}>
                      <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                      Finaliser l'intervention
                    </DropdownMenuItem>
                  )}

                  {canModifyOrCancel && <DropdownMenuSeparator />}

                  {/* Action Annuler - conditionnelle */}
                  {canModifyOrCancel && (
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onSelect={() => {
                        // TODO: Open cancel modal
                        console.log('Annuler intervention')
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Annuler l'intervention
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        }
      />

      <div className="layout-padding flex-1 min-h-0 bg-muted flex flex-col overflow-hidden">

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
          onManagerToggle={() => { }}
          onOpenManagerModal={handleOpenManagerModal}
          providers={providers}
          selectedProviders={providers.map(p => p.id)}
          onProviderToggle={() => { }}
          onOpenProviderModal={handleOpenProviderModal}
          tenants={tenants}
          selectedTenants={tenants.map(t => t.id)}
          onTenantToggle={() => { }}
          onConfirm={planning.handleProgrammingConfirm}
          isFormValid={planning.isProgrammingFormValid()}
          quoteRequests={quotes}
          onViewProvider={(providerId) => {
            // Close modal and switch to Devis tab to view provider details
            planning.closeProgrammingModal()
            // TODO: Could add logic to highlight the specific provider in quotes tab
          }}
          onCancelQuoteRequest={handleCancelQuoteRequest}
          requireQuote={requireQuote}
          onRequireQuoteChange={handleToggleQuoteRequest}
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
              userRole="manager"
            >
              {/* TAB: GENERAL */}
              <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
                <ContentWrapper>
                  {/* Détails de l'intervention */}
                  <div className="flex-shrink-0">
                    <InterventionDetailsCard
                      title={intervention.title}
                      description={intervention.description || undefined}
                      instructions={intervention.instructions || undefined}
                      planning={{
                        scheduledDate,
                        status: planningStatus,
                        quotesCount: transformedQuotes.length,
                        quotesStatus,
                        selectedQuoteAmount
                      }}
                    />
                  </div>

                  {/* Documents + Commentaires */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 flex-1 min-h-0 overflow-hidden">
                    <DocumentsCard
                      documents={transformedDocuments}
                      userRole="manager"
                      onUpload={() => console.log('Upload document')}
                      onView={(id) => console.log('View document:', id)}
                      onDownload={(id) => console.log('Download document:', id)}
                      className="overflow-hidden"
                    />

                    <CommentsCard
                      comments={transformedComments}
                      onAddComment={(content) => console.log('Add comment:', content)}
                      className="overflow-hidden"
                    />
                  </div>
                </ContentWrapper>
              </TabsContent>

              {/* TAB: CONVERSATIONS */}
              <TabsContent value="conversations" className="mt-0 flex-1 flex flex-col overflow-hidden h-full">
                <ConversationCard
                  messages={mockMessages}
                  currentUserId={serverUserId}
                  currentUserRole="manager"
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
                  {/* Devis */}
                  {requireQuote && (
                    <QuotesCard
                      quotes={transformedQuotes}
                      userRole="manager"
                      showActions={true}
                      onAddQuote={() => console.log('Add quote')}
                      onApproveQuote={handleApproveQuote}
                      onRejectQuote={handleRejectQuote}
                      className="flex-1 min-h-0"
                    />
                  )}

                  {/* Planning */}
                  <PlanningCard
                    timeSlots={transformedTimeSlots}
                    scheduledDate={scheduledDate || undefined}
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
                    className="flex-1 min-h-0"
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
      </div>
    </div>
  )
}