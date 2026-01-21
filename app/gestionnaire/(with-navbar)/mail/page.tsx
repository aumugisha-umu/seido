'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MailboxSidebar, LinkedEntities, LinkedEntity, EmailConnection, NotificationReplyGroup } from './components/mailbox-sidebar'
import { EmailList } from './components/email-list'
import { EmailDetail } from './components/email-detail'
import { toast } from 'sonner'
import { extractTextFromHtml } from '@/lib/templates/email-pdf-template'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmailClientService } from '@/lib/services/client/email-client.service'
import { Email } from '@/lib/types/email-integration'
import { LinkedEmail } from '@/lib/types/email-links'
import { MailboxEmail, Building, generateConversationId, extractSenderName } from './components/types'
import { useRealtimeEmailsV2 } from '@/hooks/use-realtime-emails-v2'
import { useEmailPolling } from '@/hooks/use-email-polling'

// Type for entity filter
interface EntityFilter {
  type: string
  id: string
  name: string
}

// Adapter to convert LinkedEmail to Email (for entity filtering)
const adaptLinkedEmailToEmail = (le: LinkedEmail): Email => ({
  id: le.id,
  team_id: '', // Will be filled by RLS anyway
  email_connection_id: null,
  direction: le.direction,
  status: le.status as any,
  deleted_at: null,
  message_id: null,
  in_reply_to: null,
  in_reply_to_header: null, // RFC 5322 header (not available in LinkedEmail)
  references: null,
  from_address: le.from_address,
  to_addresses: [],
  cc_addresses: null,
  bcc_addresses: null,
  subject: le.subject,
  body_text: le.snippet || null,
  body_html: null,
  building_id: null,
  lot_id: null,
  intervention_id: null,
  received_at: le.received_at,
  sent_at: le.sent_at,
  created_at: le.received_at || le.sent_at || new Date().toISOString(),
  attachments: []
})

// Helper to find entity name from linkedEntities
const findEntityName = (type: string, id: string, entities: LinkedEntities): string => {
  const typeMap: Record<string, LinkedEntity[]> = {
    building: entities.buildings,
    lot: entities.lots,
    contact: entities.contacts,
    contract: entities.contracts,
    intervention: entities.interventions,
    company: entities.companies
  }
  const entity = typeMap[type]?.find(e => e.id === id)
  return entity?.name || 'Entité'
}

// Adapter to convert real Email to MailboxEmail (for UI compatibility)
const adaptEmail = (email: Email, buildings: Building[]): MailboxEmail => {
  const building = buildings.find(b => b.id === email.building_id)
  const lot = building?.lots.find(l => l.id === email.lot_id)

  // Generate conversation ID - Gmail-style (RFC 5322 compliant)
  // Priority: References header (first = root) > In-Reply-To > subject fallback > standalone
  const conversationId = generateConversationId(
    email.id,
    email.message_id,
    email.in_reply_to_header,  // Use RFC 5322 In-Reply-To header (not UUID FK)
    email.references,
    email.subject,
    email.from_address,
    email.to_addresses?.[0]
  )

  return {
    id: email.id,
    sender_email: email.from_address,
    sender_name: extractSenderName(email.from_address), // RFC 5322 parsing
    recipient_email: email.to_addresses[0],
    subject: email.subject,
    snippet: email.body_text?.substring(0, 100) || '',
    body_html: email.body_html || email.body_text || '',
    body_text: email.body_text || null,
    received_at: email.received_at || email.sent_at || new Date().toISOString(),
    is_read: email.status === 'read',
    has_attachments: (email.attachments?.length || 0) > 0,
    attachments: email.attachments?.map(a => ({
      id: a.id,
      filename: a.filename,
      file_size: a.size_bytes,
      url: '#', // TODO: Add download URL
      mime_type: a.content_type || 'application/octet-stream'
    })) || [],
    building_id: email.building_id || undefined,
    building_name: building?.name,
    lot_id: email.lot_id || undefined,
    lot_name: lot?.name,
    labels: [], // TODO: Implement labels
    direction: email.direction,
    status: email.status,
    conversation_id: conversationId, // RFC 5322 headers-based (Gmail-style)
    thread_order: 0, // Will be calculated in groupEmailsByConversation
    is_parent: false, // Will be calculated in groupEmailsByConversation
    email_connection_id: email.email_connection_id || undefined
  }
}

export default function EmailPage() {
  const router = useRouter()
  const [currentFolder, setCurrentFolder] = useState('inbox')
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>(undefined)
  const [realEmails, setRealEmails] = useState<Email[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [teamId, setTeamId] = useState<string | undefined>(undefined)

  const [counts, setCounts] = useState({ inbox: 0, processed: 0, sent: 0, drafts: 0, archive: 0 })

  // Linked entities for sidebar
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntities>({
    buildings: [],
    lots: [],
    contacts: [],
    contracts: [],
    interventions: [],
    companies: []
  })

  // Entity filter (when user clicks on entity in sidebar)
  const [entityFilter, setEntityFilter] = useState<EntityFilter | null>(null)

  // Email box source filter (Phase 2: Multiple email boxes)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([])
  const [notificationRepliesCount, setNotificationRepliesCount] = useState(0)

  // Notification replies grouped by intervention (Phase 3)
  const [notificationReplyGroups, setNotificationReplyGroups] = useState<NotificationReplyGroup[]>([])
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null)

  // Collapse state for email list column
  const [isEmailListCollapsed, setIsEmailListCollapsed] = useState(false)

  const [totalEmails, setTotalEmails] = useState(0)
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  // Derived state
  const emails = useMemo(() => realEmails.map(e => adaptEmail(e, buildings)), [realEmails, buildings])
  const selectedEmail = emails.find(e => e.id === selectedEmailId)

  // Debug logging
  useEffect(() => {
    console.log('🔍 Selected Email ID changed:', selectedEmailId)
    console.log('🔍 Selected Email object:', selectedEmail)
    console.log('🔍 Total emails:', emails.length)
    console.log('🔍 [PAGE] teamId state:', teamId)
  }, [selectedEmailId, selectedEmail, emails.length, teamId])

  // Fetch team ID
  useEffect(() => {
    const fetchTeamId = async () => {
      try {
        const response = await fetch('/api/user-teams')
        if (response.ok) {
          const result = await response.json()
          console.log('🔍 [PAGE] /api/user-teams response:', result)
          // API returns { success: true, data: [...teams] }
          if (result.success && result.data && result.data.length > 0) {
            setTeamId(result.data[0].id)
            console.log('🔍 [PAGE] teamId set to:', result.data[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch team ID:', error)
      }
    }
    fetchTeamId()
  }, [])

  // Real-time subscription (v2 - uses centralized RealtimeProvider)
  useRealtimeEmailsV2({
    teamId,
    showToast: true, // Toast handled by the hook
    onNewEmail: (newEmail) => {
      // Add new email to the top of the list if it belongs to the current folder
      if (currentFolder === 'inbox' && newEmail.direction === 'received') {
        setRealEmails(prev => [newEmail, ...prev])
        // Update counts
        setCounts(prev => ({ ...prev, inbox: prev.inbox + 1 }))
        setTotalEmails(prev => prev + 1)
      }
      if (currentFolder === 'sent' && newEmail.direction === 'sent') {
        setRealEmails(prev => [newEmail, ...prev])
        setCounts(prev => ({ ...prev, sent: prev.sent + 1 }))
        setTotalEmails(prev => prev + 1)
      }
    }
  })

  // Soft polling every 60 seconds (safety net for Realtime)
  // Only polls DB counts - does NOT trigger IMAP sync
  const { isPolling, lastPollAt, refresh: manualRefresh, resetKnownEmails } = useEmailPolling({
    interval: 60000, // 1 minute
    enabled: !entityFilter, // Disable when filtering by entity
    onCountsChange: (newCounts) => {
      // Silently update counts (UI indicator that something changed)
      setCounts(prev => ({
        ...prev,
        inbox: newCounts.inbox,
        processed: newCounts.processed,
        sent: newCounts.sent,
        archive: newCounts.archive
      }))
    },
    onNewEmails: (newEmailIds) => {
      // New emails detected that weren't caught by Realtime
      // This is a safety net - fetch the missing emails
      console.log('[EMAIL-POLLING] New emails detected (missed by Realtime):', newEmailIds.length)
      if (newEmailIds.length > 0 && currentFolder === 'inbox') {
        // Soft refresh: fetch latest emails without full reload
        fetchEmails(false)
      }
    }
  })

  // Fetch buildings
  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Map API buildings to Building format
          const mappedBuildings: Building[] = data.buildings.map((b: any) => ({
            id: b.id,
            name: b.name,
            address: b.address,
            emailCount: 0, // TODO: Fetch counts per building if needed
            lots: []
          }))
          setBuildings(mappedBuildings)
        }
      }
    } catch (error) {
      console.error('Failed to fetch buildings:', error)
    }
  }

  // Fetch linked entities for sidebar
  // Uses timestamp param to bypass cache (important after linking)
  const fetchLinkedEntities = async () => {
    try {
      // Use timestamp query param instead of cache: 'no-store' for better compatibility
      const response = await fetch(`/api/email-linked-entities?_t=${Date.now()}`)
      if (!response.ok) {
        console.error('Failed to fetch linked entities - HTTP error:', response.status, response.statusText)
        return
      }
      const data = await response.json()
      if (data.success) {
        setLinkedEntities(data.entities)
      } else {
        console.error('Failed to fetch linked entities - API error:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch linked entities - Network error:', error instanceof Error ? error.message : error)
    }
  }

  // Fetch email connections with unread counts (Phase 2)
  const fetchEmailConnections = async () => {
    try {
      const response = await fetch('/api/emails/connections')
      if (response.ok) {
        const data = await response.json()
        setEmailConnections(data.connections || [])
        setNotificationRepliesCount(data.notificationRepliesCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch email connections:', error)
    }
  }

  // Fetch notification replies grouped by intervention (Phase 3)
  const fetchNotificationReplyGroups = async () => {
    try {
      const response = await fetch('/api/emails/notification-replies')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotificationReplyGroups(data.groups || [])
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification reply groups:', error)
    }
  }

  // Fetch counts
  const fetchCounts = async () => {
    try {
      const data = await EmailClientService.getCounts()
      setCounts(data)
    } catch (error) {
      console.error('Failed to fetch counts:', error)
    }
  }

  // Fetch emails
  // source: 'all' | 'notification_replies' | connection UUID
  const fetchEmails = async (isLoadMore = false, sourceOverride?: string) => {
    setIsLoading(true)
    try {
      const currentOffset = isLoadMore ? offset : 0
      const source = sourceOverride ?? selectedSource
      const data = await EmailClientService.getEmails(currentFolder, undefined, LIMIT, currentOffset, source !== 'all' ? source : undefined)

      if (isLoadMore) {
        setRealEmails(prev => [...prev, ...data.emails])
        setOffset(prev => prev + LIMIT)
      } else {
        setRealEmails(data.emails)
        setOffset(LIMIT)
        // Always select first email on initial load
        if (data.emails.length > 0) {
          setSelectedEmailId(data.emails[0].id)
        } else {
          setSelectedEmailId(undefined)
        }
      }

      setTotalEmails(data.total)

      // Also refresh counts on initial load
      if (!isLoadMore) {
        fetchCounts()
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      toast.error('Échec du chargement des emails')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch - defer non-critical data to prioritize emails display
  useEffect(() => {
    // Critical data first
    fetchBuildings()
    fetchCounts()
    fetchEmailConnections() // Fetch email boxes for sidebar (Phase 2)

    // Defer linked entities to reduce initial load competition
    // They're for sidebar filters, not needed for displaying emails
    const timer = setTimeout(() => {
      fetchLinkedEntities()
      fetchNotificationReplyGroups() // Fetch notification replies by intervention (Phase 3)
    }, 500) // Load after 500ms to let emails load first

    return () => clearTimeout(timer)
  }, [])

  // Fetch emails when folder changes
  useEffect(() => {
    setOffset(0)
    fetchEmails(false)
  }, [currentFolder])

  // Fetch full email data when a filtered email is selected
  // LinkedEmail only contains minimal data (no body_html, no attachments)
  const fetchFullEmail = async (emailId: string): Promise<Email | null> => {
    try {
      const response = await fetch(`/api/emails/${emailId}`)
      const data = await response.json()
      if (data.success && data.email) {
        return data.email as Email
      }
    } catch (error) {
      console.error('Error fetching full email:', error)
    }
    return null
  }

  // When a filtered email is selected, load full data if it's partial
  useEffect(() => {
    if (entityFilter && selectedEmailId) {
      const currentEmail = realEmails.find(e => e.id === selectedEmailId)
      // If body_html is null, this is an adapted LinkedEmail with partial data
      if (currentEmail && currentEmail.body_html === null) {
        fetchFullEmail(selectedEmailId).then(fullEmail => {
          if (fullEmail) {
            // Replace the partial email with the full email in the list
            setRealEmails(prev => prev.map(e =>
              e.id === selectedEmailId ? fullEmail : e
            ))
          }
        })
      }
    }
  }, [selectedEmailId, entityFilter])

  // Auto-select first email when folder changes
  const handleFolderChange = (folder: string) => {
    setEntityFilter(null) // Reset entity filter when changing folder
    setSelectedInterventionId(null) // Reset intervention filter
    setCurrentFolder(folder)
    setSelectedEmailId(undefined) // Will be set by fetchEmails/useEffect
    resetKnownEmails() // Reset polling tracker to avoid false "new emails" detection
  }

  // Handle email source change (Phase 2: Multiple email boxes)
  const handleSourceChange = (source: string) => {
    setSelectedSource(source)
    setEntityFilter(null) // Reset entity filter when changing source
    setSelectedInterventionId(null) // Reset intervention filter
    setSelectedEmailId(undefined)
    setOffset(0)
    fetchEmails(false, source)
    // Also refresh notification reply groups when switching to notification_replies
    if (source === 'notification_replies') {
      fetchNotificationReplyGroups()
    }
  }

  // Handle intervention click (Phase 3: Filter by intervention in notification replies)
  const handleInterventionClick = async (interventionId: string) => {
    setSelectedInterventionId(interventionId)
    setEntityFilter(null)
    setSelectedSource('notification_replies') // Set source to notification replies
    setIsLoading(true)
    setSelectedEmailId(undefined)

    try {
      // Fetch emails linked to this specific intervention that are webhook inbound
      const response = await fetch(`/api/entities/intervention/${interventionId}/emails?limit=${LIMIT}&webhookOnly=true`)
      const data = await response.json()

      if (data.success) {
        const adaptedEmails = data.emails.map(adaptLinkedEmailToEmail)
        setRealEmails(adaptedEmails)
        setTotalEmails(data.pagination.total)
        setOffset(data.emails.length)

        if (adaptedEmails.length > 0) {
          setSelectedEmailId(adaptedEmails[0].id)
        }
      } else {
        toast.error('Erreur lors du chargement des emails')
      }
    } catch (error) {
      console.error('Failed to fetch intervention emails:', error)
      toast.error('Erreur lors du chargement des emails')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (realEmails.length < totalEmails && !isLoading) {
      fetchEmails(true)
    }
  }

  const handleSync = async () => {
    toast.promise(EmailClientService.syncEmails(), {
      loading: 'Synchronisation des emails...',
      success: () => {
        fetchEmails()
        fetchCounts()
        return 'Emails synchronisés'
      },
      error: 'Échec de la synchronisation'
    })
  }

  // Handlers for email actions
  const handleReply = async (replyText: string) => {
    if (!selectedEmail) return

    // For webhook emails (notification replies), use the first available email connection
    let emailConnectionId = selectedEmail.email_connection_id

    if (!emailConnectionId) {
      // Check if team has any email connections
      if (emailConnections.length === 0) {
        toast.error('Configurez une boîte email pour répondre', {
          description: 'Allez dans Paramètres > Emails pour connecter une boîte email.',
          action: {
            label: 'Configurer',
            onClick: () => router.push('/gestionnaire/parametres/emails')
          }
        })
        return
      }

      // Use the first active connection as default
      const activeConnection = emailConnections.find(c => c.is_active)
      if (!activeConnection) {
        toast.error('Aucune boîte email active', {
          description: 'Activez une de vos boîtes email dans les paramètres.'
        })
        return
      }

      emailConnectionId = activeConnection.id
      toast.info(`Réponse via ${activeConnection.email_address}`, {
        description: 'Cette réponse sera envoyée depuis votre boîte email configurée.'
      })
    }

    try {
      await EmailClientService.sendEmail({
        emailConnectionId: emailConnectionId,
        to: selectedEmail.sender_email,
        subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
        body: replyText,
        inReplyToEmailId: selectedEmail.id
      })
      toast.success('Réponse envoyée')
      fetchEmails()
    } catch (error) {
      console.error('Reply error:', error)
      toast.error('Échec de l\'envoi de la réponse')
    }
  }

  const handleArchive = async () => {
    if (!selectedEmailId) return

    // Optimistic update: save state for rollback and remove from UI immediately
    const previousEmails = realEmails
    const emailToArchive = realEmails.find(e => e.id === selectedEmailId)
    setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
    setSelectedEmailId(undefined)

    try {
      await EmailClientService.archiveEmail(selectedEmailId)
      toast.success('Email archivé')
      // Update counts without full refetch
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1),
        archive: prev.archive + 1
      }))
    } catch (error) {
      // Rollback on error
      setRealEmails(previousEmails)
      setSelectedEmailId(emailToArchive?.id)
      toast.error('Échec de l\'archivage')
    }
  }

  const handleDelete = async () => {
    if (!selectedEmailId) return

    // Optimistic update: save state for rollback and remove from UI immediately
    const previousEmails = realEmails
    const emailToDelete = realEmails.find(e => e.id === selectedEmailId)
    setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
    setSelectedEmailId(undefined)

    try {
      await EmailClientService.deleteEmail(selectedEmailId)
      toast.success('Email supprimé')
      // Update counts
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1)
      }))
    } catch (error) {
      // Rollback on error
      setRealEmails(previousEmails)
      setSelectedEmailId(emailToDelete?.id)
      toast.error('Échec de la suppression')
    }
  }

  const handleLinkBuilding = async (buildingId: string, lotId?: string) => {
    if (!selectedEmailId) return
    try {
      await EmailClientService.linkToBuilding(selectedEmailId, buildingId, lotId)
      toast.success('Lié à l\'immeuble')
      fetchEmails()
    } catch (error) {
      toast.error('Échec de la liaison')
    }
  }

  const handleCreateIntervention = async () => {
    if (!selectedEmail) {
      toast.error('Aucun email sélectionné')
      return
    }

    // ✅ OPTIMIZED: Redirect immediately, PDF generation happens in background
    // This eliminates the 5-second wait before redirect

    // 1. Prepare intervention pre-fill data (instant)
    const emailBodyText = selectedEmail.body_text ||
      extractTextFromHtml(selectedEmail.body_html) ||
      ''

    // Truncate description if too long
    const description = emailBodyText.length > 2000
      ? emailBodyText.substring(0, 2000) + '...'
      : emailBodyText

    const prefillData = {
      fromEmail: true,
      emailId: selectedEmail.id,
      title: `[Email] ${selectedEmail.subject || 'Sans objet'}`.substring(0, 200),
      description,
      // ✅ PDF will be fetched in background by the intervention form
      pdfPending: true, // Flag to indicate PDF should be fetched async
      senderEmail: selectedEmail.sender_email,
      senderName: selectedEmail.sender_name,
      receivedAt: selectedEmail.received_at
    }

    // 2. Store in sessionStorage for the intervention creation page
    sessionStorage.setItem('intervention-from-email', JSON.stringify(prefillData))

    // 3. Redirect immediately (no waiting for PDF)
    toast.success('Redirection vers la création d\'intervention')
    router.push('/gestionnaire/interventions/nouvelle-intervention?fromEmail=true')
  }

  const handleSoftDelete = async (emailId: string) => {
    // Optimistic update: save state for rollback and remove from UI immediately
    const previousEmails = realEmails
    const wasSelected = selectedEmailId === emailId
    setRealEmails(prev => prev.filter(e => e.id !== emailId))
    if (wasSelected) setSelectedEmailId(undefined)

    try {
      await EmailClientService.deleteEmail(emailId)
      toast.success('Email deleted')
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1)
      }))
    } catch (error) {
      // Rollback on error
      setRealEmails(previousEmails)
      if (wasSelected) setSelectedEmailId(emailId)
      toast.error('Failed to delete email')
    }
  }

  const handleBlacklist = (emailId: string, senderEmail: string, reason?: string) => {
    toast.success(`${senderEmail} bloqué (action factice)`)
  }

  const handleMarkAsProcessed = async () => {
    if (!selectedEmailId) return
    // Assuming processed means read or archived, or maybe we need a specific flag
    // For now, let's mark as read if not already
    try {
      await EmailClientService.markAsRead(selectedEmailId)
      toast.success('Marqué comme traité')
      fetchEmails()
    } catch (error) {
      toast.error('Échec du marquage')
    }
  }

  const handleEntityClick = async (type: string, entityId: string) => {
    // Find entity name for display
    const entityName = findEntityName(type, entityId, linkedEntities)

    setEntityFilter({ type, id: entityId, name: entityName })
    setIsLoading(true)
    setSelectedEmailId(undefined)

    try {
      const response = await fetch(`/api/entities/${type}/${entityId}/emails?limit=${LIMIT}`)
      const data = await response.json()

      if (data.success) {
        // Adapt LinkedEmail[] to Email[]
        const adaptedEmails = data.emails.map(adaptLinkedEmailToEmail)
        setRealEmails(adaptedEmails)
        setTotalEmails(data.pagination.total)
        setOffset(data.emails.length)

        // Select first email
        if (adaptedEmails.length > 0) {
          setSelectedEmailId(adaptedEmails[0].id)
        }
      } else {
        toast.error('Erreur lors du chargement des emails')
      }
    } catch (error) {
      console.error('Failed to fetch entity emails:', error)
      toast.error('Erreur lors du chargement des emails')
    } finally {
      setIsLoading(false)
    }
  }

  const clearEntityFilter = () => {
    setEntityFilter(null)
    resetKnownEmails() // Reset polling tracker
    fetchEmails(false)
  }

  const handleConversationSelect = (conversationId: string) => {
    // Find all emails in this conversation and select the oldest (parent)
    const conversationEmails = emails
      .filter(e => e.conversation_id === conversationId)
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime())

    if (conversationEmails.length > 0) {
      setSelectedEmailId(conversationEmails[0].id) // Select the oldest (parent)
    }
  }

  const handleCompose = () => {
    toast.info('Modal de rédaction d\'email s\'ouvrira ici (action factice)')
  }

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      {/* Page Header */}
      <div className="mb-4 lg:mb-6 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Emails
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Synchroniser
            </Button>
            <Button onClick={handleCompose} className="w-fit">
              <Plus className="h-4 w-4 mr-2" />
              <span>Rédiger</span>
            </Button>
          </div>
        </div>
      </div>

      {/* White Card with Email Interface - fills remaining height */}
      <div className="bg-card rounded-lg shadow-sm border border-border flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <MailboxSidebar
            currentFolder={currentFolder}
            onFolderChange={handleFolderChange}
            unreadCounts={counts}
            linkedEntities={linkedEntities}
            onEntityClick={handleEntityClick}
            selectedEntity={entityFilter}
            // Phase 2: Multiple email boxes
            emailConnections={emailConnections}
            notificationRepliesCount={notificationRepliesCount}
            selectedSource={selectedSource}
            onSourceChange={handleSourceChange}
            // Phase 3: Notification replies grouped by intervention
            notificationReplyGroups={notificationReplyGroups}
            selectedInterventionId={selectedInterventionId}
            onInterventionClick={handleInterventionClick}
          />

          {/* Email List with optional filter indicator - collapsible */}
          <div className={cn(
            "flex flex-col h-full overflow-hidden flex-shrink-0 transition-all duration-200",
            isEmailListCollapsed ? "w-0 opacity-0" : "w-[400px] opacity-100"
          )}>
            {/* Filter indicator */}
            {entityFilter && !isEmailListCollapsed && (
              <div className="w-full px-3 py-2 bg-primary/5 border-b border-r flex items-center justify-between gap-2 flex-shrink-0">
                <span className="text-sm text-muted-foreground truncate">
                  Filtré par : <span className="font-medium text-foreground">{entityFilter.name}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEntityFilter(null)
                    fetchEmails(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <EmailList
              emails={emails}
              selectedEmailId={selectedEmailId}
              onEmailSelect={setSelectedEmailId}
              onConversationSelect={handleConversationSelect}
              totalEmails={totalEmails}
              onLoadMore={handleLoadMore}
            />
          </div>

          {/* Toggle button for email list collapse/expand */}
          <button
            onClick={() => setIsEmailListCollapsed(!isEmailListCollapsed)}
            className="h-full w-5 flex items-center justify-center hover:bg-muted border-r cursor-pointer group flex-shrink-0"
            aria-label={isEmailListCollapsed ? "Afficher la liste d'emails" : "Masquer la liste d'emails"}
          >
            {isEmailListCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </button>

          {/* Email Detail */}
          {selectedEmail ? (
            <EmailDetail
              key={selectedEmail.id}
              email={selectedEmail}
              allEmails={emails}
              buildings={buildings}
              teamId={teamId}
              onReply={handleReply}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onLinkBuilding={handleLinkBuilding}
              onCreateIntervention={handleCreateIntervention}
              onSoftDelete={handleSoftDelete}
              onBlacklist={handleBlacklist}
              onMarkAsProcessed={handleMarkAsProcessed}
              onLinksUpdated={fetchLinkedEntities}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/50">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">No email selected</p>
                <p className="text-sm">Select an email from the list to view it</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
