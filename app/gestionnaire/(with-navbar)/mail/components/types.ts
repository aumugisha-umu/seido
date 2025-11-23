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

export const groupEmailsByConversation = (emails: MailboxEmail[]): (ConversationGroup | MailboxEmail)[] => {
  const conversationMap = new Map<string, ConversationGroup>()
  const standaloneEmails: MailboxEmail[] = []

  // First, group emails by conversation_id
  for (const email of emails) {
    if (email.conversation_id) {
      if (!conversationMap.has(email.conversation_id)) {
        // Create new conversation group
        conversationMap.set(email.conversation_id, {
          parent: email.is_parent ? email : email, // Will be replaced if we find a real parent
          children: [],
          conversationId: email.conversation_id
        })
      }
      const group = conversationMap.get(email.conversation_id)!
      if (email.is_parent) {
        group.parent = email
      } else {
        group.children.push(email)
      }
    } else {
      standaloneEmails.push(email)
    }
  }

  // Convert conversations to array
  const conversations: ConversationGroup[] = []
  conversationMap.forEach((group) => {
    // Sort children by thread_order or received_at
    group.children.sort((a, b) => {
      if (a.thread_order && b.thread_order) {
        return a.thread_order - b.thread_order
      }
      return new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
    })
    conversations.push(group)
  })

  // Combine and sort by most recent activity
  const allItems: (ConversationGroup | MailboxEmail)[] = [...conversations, ...standaloneEmails]

  // Sort by most recent email
  allItems.sort((a, b) => {
    const aDate = 'parent' in a ? a.parent.received_at : a.received_at
    const bDate = 'parent' in b ? b.parent.received_at : b.received_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  return allItems
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

