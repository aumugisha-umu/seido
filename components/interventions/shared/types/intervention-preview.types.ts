/**
 * Types pour les composants de prévisualisation d'intervention
 * Utilisés par PreviewHybridManager, PreviewHybridProvider, PreviewHybridTenant
 */

// ============================================================================
// Types de base
// ============================================================================

/**
 * Rôle utilisateur dans le système d'intervention
 */
export type UserRole = 'manager' | 'provider' | 'tenant'

/**
 * Mapping des rôles vers les labels français
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  manager: 'Gestionnaire',
  provider: 'Prestataire',
  tenant: 'Locataire'
}

/**
 * Mapping des rôles vers les couleurs Tailwind
 */
export const USER_ROLE_COLORS: Record<UserRole, {
  bg: string
  text: string
  border: string
  avatar: string
}> = {
  manager: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    avatar: 'bg-blue-100 text-blue-700'
  },
  provider: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    avatar: 'bg-amber-100 text-amber-700'
  },
  tenant: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    avatar: 'bg-green-100 text-green-700'
  }
}

// ============================================================================
// Entités
// ============================================================================

/**
 * Participant à une intervention
 */
export interface Participant {
  id: string
  name: string
  email?: string
  phone?: string
  role: UserRole
}

/**
 * Statut d'un devis
 */
export type QuoteStatus = 'pending' | 'sent' | 'approved' | 'rejected'

/**
 * Devis pour une intervention
 */
export interface Quote {
  id: string
  amount: number
  status: QuoteStatus
  provider_name?: string
  provider_id?: string
  created_at?: string
  description?: string
}

/**
 * Statut d'une réponse à un créneau
 */
export type TimeSlotResponseStatus = 'accepted' | 'rejected' | 'pending'

/**
 * Réponse d'un utilisateur à un créneau proposé
 */
export interface TimeSlotResponse {
  id: string
  user_id: string
  response: TimeSlotResponseStatus
  user?: {
    name: string
    role: string
  }
}

/**
 * Créneau horaire pour une intervention
 */
export interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  status: string
  proposed_by?: string
  proposed_by_user?: {
    name: string
  }
  responses?: TimeSlotResponse[]
}

/**
 * Message dans une conversation
 */
export interface Message {
  id: string
  content: string
  author: string
  role: UserRole
  date: string
  isMe?: boolean
}

/**
 * Commentaire interne (visible uniquement par les gestionnaires)
 */
export interface Comment {
  id: string
  author: string
  content: string
  date: string
  role?: string
}

/**
 * Document attaché à une intervention
 */
export interface InterventionDocument {
  id: string
  name: string
  type: string
  size?: string
  date?: string
  author?: string
  url?: string
}

// ============================================================================
// Props des composants
// ============================================================================

/**
 * Données de l'intervention pour la prévisualisation
 */
export interface InterventionData {
  id: string
  title: string
  description: string
  instructions?: string
  status: string
  location?: string
  reference?: string
  type?: string
  urgency?: string
}

/**
 * Participants groupés par rôle
 */
export interface ParticipantsGroup {
  managers: Participant[]
  providers: Participant[]
  tenants: Participant[]
}

/**
 * Props principales pour les composants PreviewHybrid
 */
export interface InterventionPreviewProps {
  // Données
  intervention?: InterventionData
  participants: ParticipantsGroup
  quotes?: Quote[]
  timeSlots?: TimeSlot[]
  messages?: Message[]
  comments?: Comment[]
  documents?: InterventionDocument[]
  scheduledDate?: string

  // Configuration utilisateur
  currentUserRole: UserRole
  currentUserId: string

  // Callbacks - Devis
  onAddQuote?: () => void
  onViewQuote?: (quoteId: string) => void
  onApproveQuote?: (quoteId: string) => void
  onRejectQuote?: (quoteId: string) => void

  // Callbacks - Planning
  onAddTimeSlot?: () => void
  onSelectTimeSlot?: (slotId: string) => void
  onApproveTimeSlot?: (slotId: string) => void
  onRejectTimeSlot?: (slotId: string) => void
  onEditTimeSlot?: (slotId: string) => void

  // Callbacks - Conversations
  onConversationClick?: (participantId: string | 'group') => void
  onSendMessage?: (content: string, threadId?: string) => void

  // Callbacks - Documents
  onUploadDocument?: (file: File) => void
  onViewDocument?: (documentId: string) => void
  onDownloadDocument?: (documentId: string) => void
  onDeleteDocument?: (documentId: string) => void

  // Callbacks - Commentaires
  onAddComment?: (content: string) => void

  // Callbacks - Actions générales
  onEditParticipants?: () => void
  onEditIntervention?: () => void

  // États
  isLoading?: boolean
}

// ============================================================================
// Props des sous-composants
// ============================================================================

/**
 * Props pour ParticipantsList
 */
export interface ParticipantsListProps {
  participants: ParticipantsGroup
  currentUserRole: UserRole
  /** ID de l'utilisateur connecté (pour masquer son icône de conversation) */
  currentUserId?: string
  /** Callback pour conversation individuelle avec un participant */
  onConversationClick?: (participantId: string) => void
  /** Callback pour conversation de groupe */
  onGroupConversationClick?: () => void
  activeConversation?: string | 'group'
  showConversationButtons?: boolean
  className?: string
}

/**
 * Props pour QuotesCard
 */
export interface QuotesCardProps {
  quotes: Quote[]
  userRole: UserRole
  /** Afficher les boutons d'action (Valider/Refuser) - par défaut true pour les managers */
  showActions?: boolean
  onAddQuote?: () => void
  onViewQuote?: (quoteId: string) => void
  onApproveQuote?: (quoteId: string) => void
  onRejectQuote?: (quoteId: string) => void
  /** Annuler une demande de devis (statut pending) */
  onCancelQuote?: (quoteId: string) => void
  isLoading?: boolean
  className?: string
}

/**
 * Props pour PlanningCard
 */
export interface PlanningCardProps {
  timeSlots: TimeSlot[]
  scheduledDate?: string
  userRole: UserRole
  currentUserId: string
  onAddSlot?: () => void
  onSelectSlot?: (slotId: string) => void
  onApproveSlot?: (slotId: string) => void
  onRejectSlot?: (slotId: string) => void
  onEditSlot?: (slotId: string) => void
  onCancelSlot?: (slotId: string) => void
  onChooseSlot?: (slotId: string) => void
  /** Callback pour ouvrir la modale de réponse */
  onOpenResponseModal?: (slotId: string) => void
  isLoading?: boolean
  className?: string
}

/**
 * Props pour ConversationCard
 */
export interface ConversationCardProps {
  messages: Message[]
  currentUserId: string
  currentUserRole: UserRole
  conversationType: 'group' | 'individual'
  participantName?: string
  onSendMessage: (content: string) => void
  isLoading?: boolean
  className?: string
}

/**
 * Props pour DocumentsCard
 */
export interface DocumentsCardProps {
  documents: InterventionDocument[]
  userRole: UserRole
  onUpload?: () => void
  onView?: (documentId: string) => void
  onDownload?: (documentId: string) => void
  onDelete?: (documentId: string) => void
  isLoading?: boolean
  className?: string
}

/**
 * Props pour CommentsCard
 */
export interface CommentsCardProps {
  comments: Comment[]
  onAddComment?: (content: string) => void
  isLoading?: boolean
  className?: string
}

/**
 * Détails de localisation pour une intervention
 */
export interface LocationDetails {
  /** Nom de l'immeuble */
  buildingName?: string | null
  /** Référence du lot */
  lotReference?: string | null
  /** Adresse complète (rue, code postal, ville) */
  fullAddress?: string | null
}

/**
 * Props pour InterventionDetailsCard
 */
export interface InterventionDetailsCardProps {
  title?: string
  description?: string
  instructions?: string
  location?: string
  /** Détails de localisation (immeuble, lot, adresse) - affiché en entier */
  locationDetails?: LocationDetails
  /** Infos de planification (optionnel) */
  planning?: {
    /** Date planifiée */
    scheduledDate?: string | null
    /** Heure de début du créneau confirmé */
    scheduledStartTime?: string | null
    /** Heure de fin du créneau confirmé */
    scheduledEndTime?: string | null
    /** Statut du planning: pending (rien), proposed (créneaux proposés), scheduled (confirmé), completed */
    status: 'pending' | 'proposed' | 'scheduled' | 'completed'
    /** Nombre de créneaux proposés (pour status='proposed') */
    proposedSlotsCount?: number
    /** Nombre total de devis (tous statuts confondus) */
    quotesCount?: number
    /** Nombre de demandes de devis en attente (statut pending) */
    requestedQuotesCount?: number
    /** Nombre de devis reçus (statut sent) */
    receivedQuotesCount?: number
    /** Statut des devis */
    quotesStatus: 'pending' | 'received' | 'approved'
    /** Montant du devis validé */
    selectedQuoteAmount?: number | null
    /** Statistiques de réponses aux créneaux (pour afficher X/Y dans la vue générale) */
    responseStats?: {
      /** Nombre de réponses reçues (max parmi tous les créneaux) */
      maxResponsesReceived: number
      /** Nombre total de participants attendus */
      totalExpectedResponses: number
      /** Détail par créneau pour le hover */
      slotDetails: Array<{
        slotDate: string
        startTime: string
        endTime: string
        accepted: number
        rejected: number
        pending: number
      }>
    }
  }
  /** Nom du créateur de l'intervention */
  createdBy?: string | null
  /** Date de création (ISO string) */
  createdAt?: string | null
  /** Callback pour naviguer vers l'onglet Planning */
  onNavigateToPlanning?: () => void
  className?: string
}

/**
 * Événement de timeline (pour afficher date/heure et auteur)
 */
export interface TimelineEventData {
  /** Statut de l'intervention à ce moment */
  status: string
  /** Date et heure de l'action (ISO string) */
  date: string
  /** Nom de la personne qui a effectué l'action */
  author?: string
  /** Rôle de la personne (optionnel) */
  authorRole?: 'manager' | 'provider' | 'tenant'
}

/**
 * Mode d'assignation des prestataires
 */
export type AssignmentMode = 'single' | 'group' | 'separate'

/**
 * Props pour InterventionSidebar
 */
export interface InterventionSidebarProps {
  participants: ParticipantsGroup
  currentUserRole: UserRole
  /** ID de l'utilisateur connecté (pour masquer son icône de conversation) */
  currentUserId?: string
  currentStatus: string
  /** Historique des événements de la timeline (date, heure, auteur) */
  timelineEvents?: TimelineEventData[]
  activeConversation?: string | 'group'
  /** Callback pour conversation individuelle */
  onConversationClick?: (participantId: string) => void
  /** Callback pour conversation de groupe */
  onGroupConversationClick?: () => void
  /** Callback quand on clique sur un participant (navigation vers tab Contacts) */
  onParticipantClick?: () => void
  /** Afficher les boutons de conversation */
  showConversationButtons?: boolean
  /** Mode d'assignation (single/group/separate) */
  assignmentMode?: AssignmentMode
  /** Compteurs de messages non lus par type de thread */
  unreadCounts?: Record<string, number>
  className?: string
}
