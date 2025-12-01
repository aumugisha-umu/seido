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
  onConversationClick?: (participantId: string) => void
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
  onAddQuote?: () => void
  onViewQuote?: (quoteId: string) => void
  onApproveQuote?: (quoteId: string) => void
  onRejectQuote?: (quoteId: string) => void
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
 * Props pour InterventionDetailsCard
 */
export interface InterventionDetailsCardProps {
  title?: string
  description?: string
  instructions?: string
  location?: string
  className?: string
}

/**
 * Props pour InterventionSidebar
 */
export interface InterventionSidebarProps {
  participants: ParticipantsGroup
  currentUserRole: UserRole
  currentStatus: string
  activeConversation?: string | 'group'
  onConversationClick?: (participantId: string | 'group') => void
  className?: string
}
