export interface IncomingWhatsAppMessage {
  from: string
  to: string
  body: string
  numMedia: number
  mediaUrl: string | null
  mediaContentType: string | null
  contactName: string | null
  teamId: string
  phoneNumberId: string
  phoneNumber: string
  customInstructions: string | null
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
