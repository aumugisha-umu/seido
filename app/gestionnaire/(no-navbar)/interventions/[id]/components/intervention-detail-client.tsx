'use client'

/**
 * Gestionnaire Intervention Detail Client Component
 * Manages tabs and interactive elements for intervention details
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Tab components
import { OverviewTab } from './overview-tab'
import { ChatTab } from './chat-tab'
import { DocumentsTab } from './documents-tab'
import { ActivityTab } from './activity-tab'

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
import { Building2, MapPin, User, Calendar, AlertCircle, Edit, XCircle, MoreVertical } from 'lucide-react'

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

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

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
  activityLogs: ActivityLog[]
  comments: Comment[]
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
  activityLogs,
  comments
}: InterventionDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { currentUserTeam } = useTeamStatus()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
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
    <>
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

              {/* Bouton Modifier avec tooltip */}
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

              {/* Bouton Annuler avec tooltip */}
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
            </div>

            {/* Tablet Layout (768-1023px) : Badge compact + Labels raccourcis */}
            <div className="hidden md:flex lg:hidden items-center gap-2 transition-all duration-200">
              {shouldShowActionBadge(intervention.status, quotes) && (
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span className="sr-only">Action en attente</span>
                </div>
              )}

              <Button
                variant="default"
                size="sm"
                onClick={handleOpenProgrammingModalWithData}
                className="gap-1.5 min-h-[36px]"
              >
                <Edit className="w-4 h-4" />
                <span>Modifier</span>
              </Button>

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

                  {/* Action Modifier */}
                  <DropdownMenuItem onSelect={handleOpenProgrammingModalWithData}>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Action Annuler */}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        }
      />

      <div className="layout-padding h-full bg-slate-50 flex flex-col overflow-hidden">

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
        onOpenManagerModal={handleOpenManagerModal}
        providers={providers}
        selectedProviders={providers.map(p => p.id)}
        onProviderToggle={() => {}}
        onOpenProviderModal={handleOpenProviderModal}
        tenants={tenants}
        selectedTenants={tenants.map(t => t.id)}
        onTenantToggle={() => {}}
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

      {/* Tabs Navigation */}
      <div className="content-max-width mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="chat" className="relative">
              Discussion
              {getBadgeCount('chat') && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 z-50">
                  {getBadgeCount('chat')}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="relative">
              Documents
              {getBadgeCount('documents') && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 z-50">
                  {getBadgeCount('documents')}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activité
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content Card */}
      <Card className="flex-1 flex flex-col content-max-width mx-auto w-full p-6 min-h-0 overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col min-h-0 pb-6">
              <TabsContent value="overview" className="mt-0 flex-1 flex flex-col min-h-0 space-y-6">
                <OverviewTab
                  intervention={intervention}
                  assignments={assignments}
                  quotes={quotes}
                  timeSlots={timeSlots}
                  comments={comments}
                  currentUserId={user?.id || ''}
                  currentUserRole={(user?.role as 'admin' | 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire') || 'locataire'}
                  onRefresh={handleRefresh}
                  onOpenProgrammingModal={handleOpenProgrammingModalWithData}
                  onCancelSlot={(slot) => planning.openCancelSlotModal(slot, intervention.id)}
                  onEditParticipants={handleOpenProgrammingModalWithData}
                  onEditQuotes={handleOpenProgrammingModalWithData}
                />
              </TabsContent>

              <TabsContent value="chat" className="mt-0 flex-1 flex flex-col min-h-0 space-y-6">
                <ChatTab
                  interventionId={intervention.id}
                  threads={threads}
                  initialMessagesByThread={initialMessagesByThread}
                  initialParticipantsByThread={initialParticipantsByThread}
                  currentUserId={user?.id || ''}
                  userRole={user?.role || 'gestionnaire'}
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-0 flex-1 flex flex-col min-h-0 space-y-6">
                <DocumentsTab
                  interventionId={intervention.id}
                  documents={documents}
                  canManage={true}
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-0 flex-1 flex flex-col min-h-0 space-y-6">
                <ActivityTab
                  intervention={intervention}
                  activityLogs={activityLogs}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

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
    </>
  )
}