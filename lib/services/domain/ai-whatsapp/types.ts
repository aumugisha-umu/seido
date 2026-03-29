export type MessageChannel = 'whatsapp' | 'sms'

/** All AI source values that generate triage items */
export const AI_SOURCES = ['whatsapp_ai', 'sms_ai', 'phone_ai'] as const
export type AISource = (typeof AI_SOURCES)[number]

export type IdentificationMethod =
  | 'phone_match'
  | 'address_match'
  | 'agency_match'
  | 'disambiguation'
  | 'orphan'
  | 'voice_call'
  | 'team_selection'
  | 'auto'

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
  mappingUserRole?: string | null
}

export interface SessionExtractedData {
  caller_name?: string
  address?: string
  problem_description?: string
  urgency?: 'basse' | 'normale' | 'haute' | 'urgente'
  additional_notes?: string
  media_urls?: string[]
  // Pre-identified property (from property selection flow)
  lot_id?: string
  building_id?: string
  pre_identified?: boolean
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
  | 'awaiting_property_selection'
  | 'awaiting_intervention_selection'
  | 'awaiting_team_selection'
  | 'awaiting_team_agency'
  | 'resolved'
  | 'orphan'

export interface RoutingMetadata {
  routing_state: RoutingState
  original_message?: string
  candidate_teams?: Array<{ teamId: string; userId: string }>
  disambiguation_options?: Array<{ teamId: string; label: string }>
  // Property selection (tenants/owners)
  property_options?: Array<{ lotId?: string; buildingId?: string; label: string }>
  property_retry_count?: number
  // Intervention selection (providers)
  intervention_options?: Array<{ interventionId: string; label: string; buildingId?: string; lotId?: string }>
  intervention_retry_count?: number
}
