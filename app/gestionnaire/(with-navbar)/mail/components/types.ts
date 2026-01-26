// Type definitions for the mailbox interface

export type EmailDirection = 'received' | 'sent'
export type EmailStatus = 'unread' | 'read' | 'archived' | 'deleted'

export interface MailboxEmail {
  id: string
  sender_email: string
  sender_name: string
  recipient_email: string
  subject: string
  snippet: string
  body_html: string
  body_text?: string | null
  received_at: string
  is_read: boolean
  has_attachments: boolean
  attachments: EmailAttachment[]
  building_id?: string
  building_name?: string
  lot_id?: string
  lot_name?: string
  labels: string[]
  direction: EmailDirection
  status: EmailStatus
  conversation_id?: string
  thread_order?: number
  is_parent?: boolean
  email_connection_id?: string
  team_id?: string
}

export interface EmailAttachment {
  id: string
  filename: string
  file_size: number
  mime_type: string
  url?: string
}

export interface Building {
  id: string
  name: string
  address: string
  emailCount: number
  lots: Lot[]
}

export interface Lot {
  id: string
  name: string
  tenant_name?: string
}

export interface BlacklistEntry {
  id: string
  sender_email: string
  sender_domain: string | null
  reason: string | null
  blocked_by_user_name: string
  is_current_user: boolean
  created_at: string
}

export interface ConversationGroup {
  parent: MailboxEmail
  children: MailboxEmail[]
  conversationId: string
}

// Helper functions

/**
 * Extracts display name from RFC 5322 email format
 * Handles: "Display Name" <email@domain.com> or email@domain.com
 */
export const extractSenderName = (fromAddress: string): string => {
  if (!fromAddress) return 'Inconnu'

  // Pattern: "Display Name" <email> or Display Name <email>
  const namedMatch = fromAddress.match(/^"?([^"<]+?)"?\s*<[^>]+>/)
  if (namedMatch && namedMatch[1]) {
    return namedMatch[1].trim()
  }

  // Pattern: <email> only - extract local part
  const emailOnlyMatch = fromAddress.match(/<([^@>]+)@/)
  if (emailOnlyMatch && emailOnlyMatch[1]) {
    return emailOnlyMatch[1]
  }

  // Fallback: email@domain - extract local part
  const localPart = fromAddress.split('@')[0]
  return localPart.replace(/[<"]/g, '').trim() || 'Inconnu'
}

/**
 * Normalizes email subject for conversation grouping (Gmail-style)
 * Removes ALL reply/forward prefixes iteratively and normalizes whitespace
 */
export const normalizeSubject = (subject: string): string => {
  if (!subject) return ''

  let normalized = subject.trim()

  // Prefixes to remove (multilingual, case-insensitive)
  // Order matters - longer prefixes first to avoid partial matches
  const prefixes = [
    /^(référence|reference):\s*/i,
    /^(réf|rép|antw):\s*/i,
    /^(re|fwd|fw|tr|aw|sv|vs|r):\s*/i,
  ]

  // Remove all prefixes iteratively until none remain
  let changed = true
  while (changed) {
    changed = false
    for (const prefix of prefixes) {
      if (prefix.test(normalized)) {
        normalized = normalized.replace(prefix, '')
        changed = true
        break // Restart the loop after each removal
      }
    }
  }

  // Also remove numbering like [1], [2], (1), (2) at the start
  normalized = normalized.replace(/^[\[\(]\d+[\]\)]\s*/, '')

  return normalized
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim()
    .toLowerCase()
}

/**
 * Normalizes a Message-ID for consistent comparison
 * Removes angle brackets < > and trims whitespace
 * RFC 5322 Message-IDs can have varied formats:
 * - <xxx@domain.com> (with brackets)
 * - xxx@domain.com (without brackets)
 */
export const normalizeMessageId = (messageId: string | null | undefined): string | null => {
  if (!messageId) return null
  return messageId
    .trim()
    .replace(/^</, '')   // Remove leading <
    .replace(/>$/, '')   // Remove trailing >
    .toLowerCase()
}

/**
 * Generates conversation ID - Gmail-style approach (RFC 5322 compliant)
 *
 * Priority:
 * 1. First Message-ID in References header (conversation root)
 * 2. In-Reply-To header (parent message)
 * 3. Fallback: subject + participants (only if subject has Re:/Fwd: prefix)
 * 4. Standalone email (no grouping)
 *
 * All Message-IDs are normalized (no angle brackets, lowercase) for consistent matching.
 * This matches Gmail's behavior while supporting legacy emails without headers.
 */
export const generateConversationId = (
  emailId: string,
  messageId: string | null,
  inReplyToHeader: string | null,  // RFC 5322 In-Reply-To header (raw Message-ID)
  references: string | null,
  subject: string,
  senderEmail: string,
  recipientEmail?: string
): string => {
  // Priority 1: Use first Message-ID from References header (conversation root)
  // Gmail always uses the first ID in References as the thread root
  if (references) {
    const refs = references.trim().split(/\s+/)
    if (refs.length > 0 && refs[0]) {
      const normalizedRoot = normalizeMessageId(refs[0])
      if (normalizedRoot) return normalizedRoot
    }
  }

  // Priority 2: Use In-Reply-To header (parent message)
  // If no References but has In-Reply-To, use it as conversation ID
  if (inReplyToHeader) {
    const normalizedParent = normalizeMessageId(inReplyToHeader)
    if (normalizedParent) return normalizedParent
  }

  // Priority 3: Fallback to subject + participants for emails without headers
  // Only group if subject has reply/forward prefix (explicit threading intent)
  const hasReplyPrefix = /^(re|fwd|fw|tr):/i.test(subject.trim())

  if (hasReplyPrefix) {
    const normalizedSubject = normalizeSubject(subject)
    const participants = new Set<string>()
    if (senderEmail) participants.add(senderEmail.toLowerCase().trim())
    if (recipientEmail) participants.add(recipientEmail.toLowerCase().trim())
    const sortedParticipants = Array.from(participants).sort().join(',')
    return `${normalizedSubject}::${sortedParticipants}`
  }

  // Priority 4: Standalone email - use its own normalized message_id or id
  return normalizeMessageId(messageId) || emailId
}

export const groupEmailsByConversation = (emails: MailboxEmail[]): (ConversationGroup | MailboxEmail)[] => {
  const conversationMap = new Map<string, MailboxEmail[]>()

  // Group emails by conversation_id (normalized subject)
  for (const email of emails) {
    const convId = email.conversation_id || email.id
    if (!conversationMap.has(convId)) {
      conversationMap.set(convId, [])
    }
    conversationMap.get(convId)!.push(email)
  }

  const result: (ConversationGroup | MailboxEmail)[] = []

  for (const [convId, convEmails] of conversationMap) {
    // Sort by date (oldest → newest)
    convEmails.sort((a, b) =>
      new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
    )

    if (convEmails.length === 1) {
      // Single email - return directly (no group)
      result.push(convEmails[0])
    } else {
      // Conversation: oldest email is the parent
      const [parent, ...children] = convEmails

      result.push({
        conversationId: convId,
        parent: { ...parent, is_parent: true },
        children: children.map((e, i) => ({ ...e, is_parent: false, thread_order: i + 1 }))
      })
    }
  }

  // Sort by most recent email (latest activity in each group or single email)
  return result.sort((a, b) => {
    const getLatest = (item: ConversationGroup | MailboxEmail): string => {
      if ('children' in item && item.children.length > 0) {
        return item.children[item.children.length - 1].received_at
      }
      return 'parent' in item ? item.parent.received_at : item.received_at
    }
    return new Date(getLatest(b)).getTime() - new Date(getLatest(a)).getTime()
  })
}

export const getConversationEmails = (conversationId: string, emails: MailboxEmail[]): MailboxEmail[] => {
  return emails
    .filter(e => e.conversation_id === conversationId)
    .sort((a, b) => {
      if (a.thread_order && b.thread_order) {
        return b.thread_order - a.thread_order // Reverse order (latest first)
      }
      return new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    })
}

