'use client'

/**
 * Mail Client Component
 * Handles all interactive functionality for email page
 * Server Component fetches initial data, this component handles:
 * - Realtime updates
 * - Email polling
 * - All email actions (mark read, archive, delete, link, etc.)
 * - Folder/source switching
 * - Pagination
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
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

// ============================================================================
// TYPES
// ============================================================================

interface EntityFilter {
  type: string
  id: string
  name: string
}

interface MailClientProps {
  teamId: string
  initialCounts: { inbox: number; processed: number; sent: number; drafts: number; archive: number }
  initialBuildings: Building[]
  initialEmailConnections: EmailConnection[]
  initialNotificationRepliesCount: number
  initialLinkedEntities: LinkedEntities
  initialNotificationReplyGroups: NotificationReplyGroup[]
  initialEmails: Email[]
  initialTotalEmails: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const adaptLinkedEmailToEmail = (le: LinkedEmail): Email => ({
  id: le.id,
  team_id: '',
  email_connection_id: null,
  direction: le.direction,
  status: le.status as any,
  deleted_at: null,
  message_id: null,
  in_reply_to: null,
  in_reply_to_header: null,
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

const adaptEmail = (email: Email, buildings: Building[]): MailboxEmail => {
  const building = buildings.find(b => b.id === email.building_id)
  const lot = building?.lots.find(l => l.id === email.lot_id)

  const conversationId = generateConversationId(
    email.id,
    email.message_id,
    email.in_reply_to_header,
    email.references,
    email.subject,
    email.from_address,
    email.to_addresses?.[0]
  )

  return {
    id: email.id,
    sender_email: email.from_address,
    sender_name: extractSenderName(email.from_address),
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
      url: '#',
      mime_type: a.content_type || 'application/octet-stream'
    })) || [],
    building_id: email.building_id || undefined,
    building_name: building?.name,
    lot_id: email.lot_id || undefined,
    lot_name: lot?.name,
    labels: [],
    direction: email.direction,
    status: email.status,
    conversation_id: conversationId,
    thread_order: 0,
    is_parent: false,
    email_connection_id: email.email_connection_id || undefined
  }
}

// ============================================================================
// MAIN CLIENT COMPONENT
// ============================================================================

export function MailClient({
  teamId,
  initialCounts,
  initialBuildings,
  initialEmailConnections,
  initialNotificationRepliesCount,
  initialLinkedEntities,
  initialNotificationReplyGroups,
  initialEmails,
  initialTotalEmails
}: MailClientProps) {
  const router = useRouter()

  // Core state (initialized with SSR data)
  const [currentFolder, setCurrentFolder] = useState('inbox')
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>(
    initialEmails.length > 0 ? initialEmails[0].id : undefined
  )
  const [realEmails, setRealEmails] = useState<Email[]>(initialEmails)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [isLoading, setIsLoading] = useState(false)
  const [counts, setCounts] = useState(initialCounts)

  // Linked entities for sidebar
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntities>(initialLinkedEntities)
  const [entityFilter, setEntityFilter] = useState<EntityFilter | null>(null)

  // Email box source filter
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>(initialEmailConnections)
  const [notificationRepliesCount, setNotificationRepliesCount] = useState(initialNotificationRepliesCount)

  // Notification replies grouped by intervention
  const [notificationReplyGroups, setNotificationReplyGroups] = useState<NotificationReplyGroup[]>(initialNotificationReplyGroups)
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null)

  // Collapse state for email list column
  const [isEmailListCollapsed, setIsEmailListCollapsed] = useState(false)

  // Pagination
  const [totalEmails, setTotalEmails] = useState(initialTotalEmails)
  const [offset, setOffset] = useState(50)
  const LIMIT = 50

  // Derived state
  const emails = useMemo(() => realEmails.map(e => adaptEmail(e, buildings)), [realEmails, buildings])
  const selectedEmail = emails.find(e => e.id === selectedEmailId)

  // ============================================================================
  // REALTIME & POLLING
  // ============================================================================

  useRealtimeEmailsV2({
    teamId,
    showToast: true,
    onNewEmail: (newEmail) => {
      if (currentFolder === 'inbox' && newEmail.direction === 'received') {
        setRealEmails(prev => [newEmail, ...prev])
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

  const { refresh: manualRefresh, resetKnownEmails } = useEmailPolling({
    interval: 60000,
    enabled: !entityFilter,
    onCountsChange: (newCounts) => {
      setCounts(prev => ({
        ...prev,
        inbox: newCounts.inbox,
        processed: newCounts.processed,
        sent: newCounts.sent,
        archive: newCounts.archive
      }))
    },
    onNewEmails: (newEmailIds) => {
      if (newEmailIds.length > 0 && currentFolder === 'inbox') {
        fetchEmails(false)
      }
    }
  })

  // ============================================================================
  // FETCH FUNCTIONS
  // ============================================================================

  const fetchLinkedEntities = useCallback(async () => {
    try {
      const response = await fetch(`/api/email-linked-entities?_t=${Date.now()}`)
      if (!response.ok) return
      const data = await response.json()
      if (data.success) {
        setLinkedEntities(data.entities)
      }
    } catch (error) {
      console.error('Failed to fetch linked entities:', error)
    }
  }, [])

  const fetchEmailConnections = useCallback(async () => {
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
  }, [])

  const fetchCounts = useCallback(async () => {
    try {
      const data = await EmailClientService.getCounts()
      setCounts(data)
    } catch (error) {
      console.error('Failed to fetch counts:', error)
    }
  }, [])

  const fetchEmails = useCallback(async (isLoadMore = false, sourceOverride?: string) => {
    setIsLoading(true)
    try {
      const currentOffset = isLoadMore ? offset : 0
      const source = sourceOverride ?? selectedSource
      const data = await EmailClientService.getEmails(
        currentFolder,
        undefined,
        LIMIT,
        currentOffset,
        source !== 'all' ? source : undefined
      )

      if (isLoadMore) {
        setRealEmails(prev => [...prev, ...data.emails])
        setOffset(prev => prev + LIMIT)
      } else {
        setRealEmails(data.emails)
        setOffset(LIMIT)
        if (data.emails.length > 0) {
          setSelectedEmailId(data.emails[0].id)
        } else {
          setSelectedEmailId(undefined)
        }
      }

      setTotalEmails(data.total)

      if (!isLoadMore) {
        fetchCounts()
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      toast.error('Échec du chargement des emails')
    } finally {
      setIsLoading(false)
    }
  }, [offset, selectedSource, currentFolder, fetchCounts])

  const fetchFullEmail = useCallback(async (emailId: string): Promise<Email | null> => {
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
  }, [])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Fetch emails when folder changes
  useEffect(() => {
    // Skip initial render since we have SSR data
    if (currentFolder === 'inbox' && realEmails.length > 0 && offset === 50) {
      return
    }
    setOffset(0)
    fetchEmails(false)
  }, [currentFolder])

  // Load full email data when selecting a filtered email
  useEffect(() => {
    if (entityFilter && selectedEmailId) {
      const currentEmail = realEmails.find(e => e.id === selectedEmailId)
      if (currentEmail && currentEmail.body_html === null) {
        fetchFullEmail(selectedEmailId).then(fullEmail => {
          if (fullEmail) {
            setRealEmails(prev => prev.map(e =>
              e.id === selectedEmailId ? fullEmail : e
            ))
          }
        })
      }
    }
  }, [selectedEmailId, entityFilter, fetchFullEmail, realEmails])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFolderChange = useCallback((folder: string) => {
    setCurrentFolder(folder)
    setEntityFilter(null)
    setSelectedInterventionId(null)
    setSelectedSource('all')
  }, [])

  const handleSourceChange = useCallback((source: string) => {
    setSelectedSource(source)
    setEntityFilter(null)
    setSelectedInterventionId(null)
    setOffset(0)
    fetchEmails(false, source)
  }, [fetchEmails])

  const handleEntityClick = useCallback(async (type: string, id: string) => {
    try {
      const response = await fetch(`/api/email-links?${type}_id=${id}`)
      if (!response.ok) {
        toast.error('Impossible de charger les emails liés')
        return
      }
      const data = await response.json()
      if (data.success) {
        const adaptedEmails = data.emails.map((le: LinkedEmail) => adaptLinkedEmailToEmail(le))
        setRealEmails(adaptedEmails)
        setEntityFilter({
          type,
          id,
          name: findEntityName(type, id, linkedEntities)
        })
        setTotalEmails(data.emails.length)
        if (adaptedEmails.length > 0) {
          setSelectedEmailId(adaptedEmails[0].id)
        }
      }
    } catch (error) {
      console.error('Error filtering by entity:', error)
      toast.error('Erreur lors du filtrage')
    }
  }, [linkedEntities])

  const handleInterventionClick = useCallback(async (interventionId: string | null) => {
    if (interventionId === null) {
      setSelectedInterventionId(null)
      setSelectedSource('notification_replies')
      setEntityFilter(null)
      setOffset(0)
      fetchEmails(false, 'notification_replies')
      return
    }

    setSelectedInterventionId(interventionId)
    try {
      const response = await fetch(`/api/email-links?intervention_id=${interventionId}`)
      if (!response.ok) {
        toast.error('Impossible de charger les emails liés')
        return
      }
      const data = await response.json()
      if (data.success) {
        const adaptedEmails = data.emails.map((le: LinkedEmail) => adaptLinkedEmailToEmail(le))
        setRealEmails(adaptedEmails)
        setEntityFilter({
          type: 'intervention',
          id: interventionId,
          name: findEntityName('intervention', interventionId, linkedEntities)
        })
        setTotalEmails(data.emails.length)
        if (adaptedEmails.length > 0) {
          setSelectedEmailId(adaptedEmails[0].id)
        }
      }
    } catch (error) {
      console.error('Error filtering by intervention:', error)
      toast.error('Erreur lors du filtrage')
    }
  }, [linkedEntities, fetchEmails])

  const handleLoadMore = useCallback(() => {
    if (!isLoading && realEmails.length < totalEmails) {
      fetchEmails(true)
    }
  }, [isLoading, realEmails.length, totalEmails, fetchEmails])

  const handleSync = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/emails/sync', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Sync failed')
      }
      const result = await response.json()
      if (result.success) {
        toast.success(`${result.newEmails || 0} nouveaux emails synchronisés`)
        resetKnownEmails()
        fetchEmails(false)
        fetchLinkedEntities()
      }
    } catch (error) {
      toast.error('Échec de la synchronisation')
    } finally {
      setIsLoading(false)
    }
  }, [resetKnownEmails, fetchEmails, fetchLinkedEntities])

  const handleMarkAsRead = useCallback(async (emailId: string) => {
    try {
      await EmailClientService.markAsRead(emailId)
      setRealEmails(prev => prev.map(e =>
        e.id === emailId ? { ...e, status: 'read' as const } : e
      ))
    } catch (error) {
      toast.error('Échec du marquage')
    }
  }, [])

  const handleReply = useCallback((email: MailboxEmail) => {
    toast.info('Ouverture du modal de réponse (action factice)')
  }, [])

  const handleArchive = useCallback(async () => {
    if (!selectedEmailId) return

    const previousEmails = realEmails
    const emailToArchive = realEmails.find(e => e.id === selectedEmailId)
    setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
    setSelectedEmailId(undefined)

    try {
      await EmailClientService.archiveEmail(selectedEmailId)
      toast.success('Email archivé')
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1),
        archive: prev.archive + 1
      }))
    } catch (error) {
      setRealEmails(previousEmails)
      setSelectedEmailId(emailToArchive?.id)
      toast.error('Échec de l\'archivage')
    }
  }, [selectedEmailId, realEmails])

  const handleDelete = useCallback(async () => {
    if (!selectedEmailId) return

    const previousEmails = realEmails
    const emailToDelete = realEmails.find(e => e.id === selectedEmailId)
    setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
    setSelectedEmailId(undefined)

    try {
      await EmailClientService.deleteEmail(selectedEmailId)
      toast.success('Email supprimé')
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1)
      }))
    } catch (error) {
      setRealEmails(previousEmails)
      setSelectedEmailId(emailToDelete?.id)
      toast.error('Échec de la suppression')
    }
  }, [selectedEmailId, realEmails])

  const handleLinkBuilding = useCallback(async (buildingId: string, lotId?: string) => {
    if (!selectedEmailId) return
    try {
      await EmailClientService.linkToBuilding(selectedEmailId, buildingId, lotId)
      toast.success('Lié à l\'immeuble')
      fetchEmails(false)
    } catch (error) {
      toast.error('Échec de la liaison')
    }
  }, [selectedEmailId, fetchEmails])

  const handleCreateIntervention = useCallback(async () => {
    if (!selectedEmail) {
      toast.error('Aucun email sélectionné')
      return
    }

    const emailBodyText = selectedEmail.body_text ||
      extractTextFromHtml(selectedEmail.body_html) ||
      ''

    const description = emailBodyText.length > 2000
      ? emailBodyText.substring(0, 2000) + '...'
      : emailBodyText

    const prefillData = {
      fromEmail: true,
      emailId: selectedEmail.id,
      title: `[Email] ${selectedEmail.subject || 'Sans objet'}`.substring(0, 200),
      description,
      pdfPending: true,
      senderEmail: selectedEmail.sender_email,
      senderName: selectedEmail.sender_name,
      receivedAt: selectedEmail.received_at
    }

    sessionStorage.setItem('intervention-from-email', JSON.stringify(prefillData))
    toast.success('Redirection vers la création d\'intervention')
    router.push('/gestionnaire/interventions/nouvelle-intervention?fromEmail=true')
  }, [selectedEmail, router])

  const handleSoftDelete = useCallback(async (emailId: string) => {
    const previousEmails = realEmails
    const wasSelected = selectedEmailId === emailId
    setRealEmails(prev => prev.filter(e => e.id !== emailId))
    if (wasSelected) setSelectedEmailId(undefined)

    try {
      await EmailClientService.deleteEmail(emailId)
      toast.success('Email supprimé')
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1)
      }))
    } catch (error) {
      setRealEmails(previousEmails)
      if (wasSelected) setSelectedEmailId(emailId)
      toast.error('Échec de la suppression')
    }
  }, [realEmails, selectedEmailId])

  const handleBlacklist = useCallback(async (address: string) => {
    try {
      await fetch('/api/emails/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, action: 'add' })
      })
      toast.success(`${address} ajouté à la liste noire`)
      fetchEmails(false)
    } catch (error) {
      toast.error('Échec de l\'ajout à la liste noire')
    }
  }, [fetchEmails])

  const handleMarkAsProcessed = useCallback(async () => {
    if (!selectedEmailId) return
    try {
      await EmailClientService.markAsProcessed(selectedEmailId)
      setRealEmails(prev => prev.map(e =>
        e.id === selectedEmailId ? { ...e, status: 'processed' as const } : e
      ))
      toast.success('Email marqué comme traité')
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1),
        processed: prev.processed + 1
      }))
    } catch (error) {
      toast.error('Échec du marquage')
    }
  }, [selectedEmailId])

  const handleConversationSelect = useCallback((conversationId: string) => {
    const conversationEmails = emails
      .filter(e => e.conversation_id === conversationId)
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime())

    if (conversationEmails.length > 0) {
      setSelectedEmailId(conversationEmails[0].id)
    }
  }, [emails])

  const handleCompose = useCallback(() => {
    toast.info('Modal de rédaction d\'email s\'ouvrira ici (action factice)')
  }, [])

  // ============================================================================
  // RENDER
  // ============================================================================

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

      {/* White Card with Email Interface */}
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
            emailConnections={emailConnections}
            notificationRepliesCount={notificationRepliesCount}
            selectedSource={selectedSource}
            onSourceChange={handleSourceChange}
            notificationReplyGroups={notificationReplyGroups}
            selectedInterventionId={selectedInterventionId}
            onInterventionClick={handleInterventionClick}
          />

          {/* Email List - collapsible */}
          <div className={cn(
            "flex flex-col h-full overflow-hidden flex-shrink-0 transition-all duration-200",
            isEmailListCollapsed ? "w-0 opacity-0" : "w-[400px] opacity-100"
          )}>
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

          {/* Toggle button */}
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
