export type MessageChannel = 'whatsapp' | 'sms'

export type IdentificationMethod =
  | 'phone_match'
  | 'address_match'
  | 'agency_match'
  | 'disambiguation'
  | 'orphan'

export interface IncomingWhatsAppMessage {
  from: string
  to: string
  body: string
  numMedia: number
  mediaUrl: string | null
  mediaContentType: string | null
  contactName: string | null
  teamId: string | null
  phoneNumberId: string | null
  phoneNumber: string
  customInstructions: string | null
  identifiedUserId?: string | null
  identifiedVia: IdentificationMethod
  candidateTeams?: Array<{ teamId: string; userId: string }>
  channel: MessageChannel
}

export interface SessionExtractedData {
  caller_name?: string
  address?: string
  problem_description?: string
  urgency?: 'basse' | 'normale' | 'haute' | 'urgente'
  additional_notes?: string
  media_urls?: string[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  media_type?: 'text' | 'image' | 'audio' | 'document'
}

export interface ClaudeResponse {
  text: string
  conversation_complete: boolean
  extracted_data?: Partial<SessionExtractedData>
}

// ============================================================================
// Routing state machine (unknown contact flow)
// ============================================================================

export type RoutingState =
  | 'awaiting_address'
  | 'resolving_address'
  | 'awaiting_agency'
  | 'awaiting_disambiguation'
  | 'resolving_disambiguation'
  | 'resolved'
  | 'orphan'

export interface RoutingMetadata {
  routing_state: RoutingState
  original_message?: string
  candidate_teams?: Array<{ teamId: string; userId: string }>
  disambiguation_options?: Array<{ teamId: string; label: string }>
}
