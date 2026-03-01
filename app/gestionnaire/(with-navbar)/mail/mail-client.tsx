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

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MailboxSidebar, LinkedEntities, LinkedEntity, EmailConnection } from './components/mailbox-sidebar'
import { EmailList } from './components/email-list'
import { EmailDetail } from './components/email-detail'
import { toast } from 'sonner'
import { extractTextFromHtml } from '@/lib/templates/email-pdf-template'
import { Button } from '@/components/ui/button'
import { PageActions } from "@/components/page-actions"
import { Plus, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmailClientService } from '@/lib/services/client/email-client.service'
import { Email } from '@/lib/types/email-integration'
import { LinkedEmail, EmailLinkWithDetails } from '@/lib/types/email-links'
import { MailboxEmail, Building, Lot, generateConversationId, extractSenderName, extractEmailAddress } from './components/types'
import { ComposeEmailModal } from './components/compose-email-modal'
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
  initialLinkedEntities: LinkedEntities
  initialEmails: Email[]
  initialTotalEmails: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const adaptLinkedEmailToEmail = (le: LinkedEmail): Email => ({
  id: le.id,
  team_id: '',
  email_connection_id: le.email_connection_id ?? null,
  direction: le.direction,
  status: le.status as any,
  deleted_at: null,
  message_id: le.message_id ?? null,
  in_reply_to: null,
  in_reply_to_header: le.in_reply_to_header ?? null,
  references: le.references ?? null,
  from_address: le.from_address,
  to_addresses: le.to_addresses ?? [],
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

const adaptEmail = (email: Email, buildingMap: Map<string, Building>, lotMap: Map<string, { lot: Lot; buildingName?: string }>): MailboxEmail => {
  const building = email.building_id ? buildingMap.get(email.building_id) : undefined
  const lotEntry = email.lot_id ? lotMap.get(email.lot_id) : undefined

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
    sender_email: extractEmailAddress(email.from_address),
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
    lot_name: lotEntry?.lot.name,
    labels: [],
    direction: email.direction,
    status: email.status,
    conversation_id: conversationId,
    thread_order: 0,
    is_parent: false,
    email_connection_id: email.email_connection_id || undefined,
    cc_addresses: email.cc_addresses || null
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
  initialLinkedEntities,
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

  // Collapse state for email list column
  const [isEmailListCollapsed, setIsEmailListCollapsed] = useState(false)

  // Compose modal
  const [composeOpen, setComposeOpen] = useState(false)

  // Email links cache (shared across EmailDetail instances to survive key-based remounts)
  const emailLinksCache = useRef<Map<string, EmailLinkWithDetails[]>>(new Map())

  // Pagination
  const [totalEmails, setTotalEmails] = useState(initialTotalEmails)
  const [offset, setOffset] = useState(50)
  const LIMIT = 50
  const CACHE_TTL = 60_000 // 60 seconds

  // Folder cache: stale-while-revalidate pattern
  // Stores emails + total per folder:source key, with timestamp for TTL
  const folderCacheRef = useRef<Map<string, { emails: Email[]; total: number; timestamp: number }>>(
    new Map([['inbox:all', { emails: initialEmails, total: initialTotalEmails, timestamp: Date.now() }]])
  )

  // AbortController: cancel in-flight requests on rapid folder switching
  const abortControllerRef = useRef<AbortController | null>(null)

  // Stable refs for values used inside memoized callbacks (avoids re-creating callbacks on state change)
  const currentFolderRef = useRef(currentFolder)
  currentFolderRef.current = currentFolder
  const fetchEmailsRef = useRef<(isLoadMore?: boolean, sourceOverride?: string) => Promise<void>>(null as any)

  // Pre-built Maps for O(1) lookup in adaptEmail (replaces O(n) Array.find per email)
  const { buildingMap, lotMap } = useMemo(() => {
    const bMap = new Map<string, Building>()
    const lMap = new Map<string, { lot: Lot; buildingName?: string }>()
    for (const b of buildings) {
      bMap.set(b.id, b)
      for (const l of b.lots) {
        lMap.set(l.id, { lot: l, buildingName: b.name })
      }
    }
    return { buildingMap: bMap, lotMap: lMap }
  }, [buildings])

  // Derived state
  const emails = useMemo(() => realEmails.map(e => adaptEmail(e, buildingMap, lotMap)), [realEmails, buildingMap, lotMap])
  const selectedEmail = emails.find(e => e.id === selectedEmailId)

  // ============================================================================
  // REALTIME & POLLING (memoized callbacks to prevent subscription churn)
  // ============================================================================

  // Invalidate cache for a specific folder or all folders
  // Declared here (before memoized callbacks) to avoid TDZ issues
  const invalidateCache = useCallback((folder?: string) => {
    if (folder) {
      // Invalidate all source variants for this folder
      for (const key of folderCacheRef.current.keys()) {
        if (key.startsWith(`${folder}:`)) {
          folderCacheRef.current.delete(key)
        }
      }
    } else {
      folderCacheRef.current.clear()
    }
  }, [])

  // Stable callback: new email from realtime subscription
  // Uses refs for currentFolder to avoid re-subscribing on folder change
  const handleRealtimeNewEmail = useCallback((newEmail: Email) => {
    // Invalidate cache for the folder receiving the new email
    if (newEmail.direction === 'received') invalidateCache('inbox')
    if (newEmail.direction === 'sent') invalidateCache('sent')

    const folder = currentFolderRef.current
    if (folder === 'inbox' && newEmail.direction === 'received') {
      setRealEmails(prev => [newEmail, ...prev])
      setCounts(prev => ({ ...prev, inbox: prev.inbox + 1 }))
      setTotalEmails(prev => prev + 1)
    }
    if (folder === 'sent' && newEmail.direction === 'sent') {
      setRealEmails(prev => [newEmail, ...prev])
      setCounts(prev => ({ ...prev, sent: prev.sent + 1 }))
      setTotalEmails(prev => prev + 1)
    }
  }, [invalidateCache])

  // Stable callback: counts changed from polling
  // Only uses state setters (stable by React guarantee)
  const handleCountsChange = useCallback((newCounts: { inbox: number; processed: number; sent: number; archive: number; drafts: number }) => {
    setCounts(prev => ({
      ...prev,
      inbox: newCounts.inbox,
      processed: newCounts.processed,
      sent: newCounts.sent,
      archive: newCounts.archive
    }))
  }, [])

  // Stable callback: new emails detected by polling
  // Uses refs for currentFolder and fetchEmails to stay stable
  const handlePollingNewEmails = useCallback((newEmailIds: string[]) => {
    if (newEmailIds.length > 0 && currentFolderRef.current === 'inbox') {
      fetchEmailsRef.current?.(false)
    }
  }, [])

  useRealtimeEmailsV2({
    teamId,
    showToast: true,
    onNewEmail: handleRealtimeNewEmail
  })

  const { refresh: manualRefresh, resetKnownEmails } = useEmailPolling({
    interval: 60000,
    enabled: !entityFilter,
    onCountsChange: handleCountsChange,
    onNewEmails: handlePollingNewEmails
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
    const source = sourceOverride ?? selectedSource
    const cacheKey = `${currentFolder}:${source}`

    // Stale-while-revalidate: show cached data instantly, then refresh in background
    if (!isLoadMore) {
      const cached = folderCacheRef.current.get(cacheKey)
      const isFresh = cached && (Date.now() - cached.timestamp < CACHE_TTL)

      if (cached) {
        // Instantly display cached data (< 1ms)
        setRealEmails(cached.emails)
        setTotalEmails(cached.total)
        setOffset(LIMIT)
        if (cached.emails.length > 0) {
          setSelectedEmailId(cached.emails[0].id)
        } else {
          setSelectedEmailId(undefined)
        }

        // If cache is fresh, skip network request entirely
        if (isFresh) return
        // If stale, continue to background refresh (no loading spinner)
      }
    }

    // Cancel previous in-flight request (rapid folder switching protection)
    if (!isLoadMore) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()
    }
    const signal = abortControllerRef.current?.signal

    // Only show loading spinner if no cache hit (cold fetch)
    const hasCacheHit = !isLoadMore && folderCacheRef.current.has(cacheKey)
    if (!hasCacheHit) setIsLoading(true)

    try {
      const currentOffset = isLoadMore ? offset : 0
      const data = await EmailClientService.getEmails(
        currentFolder,
        undefined,
        LIMIT,
        currentOffset,
        source !== 'all' ? source : undefined,
        signal
      )

      if (isLoadMore) {
        setRealEmails(prev => [...prev, ...data.emails])
        setOffset(prev => prev + LIMIT)
      } else {
        setRealEmails(data.emails)
        setOffset(LIMIT)
        if (data.emails.length > 0) {
          setSelectedEmailId(prev => {
            // Keep current selection if it exists in new data (avoid jarring jumps on background refresh)
            if (prev && data.emails.some(e => e.id === prev)) return prev
            return data.emails[0].id
          })
        } else {
          setSelectedEmailId(undefined)
        }

        // Update cache with fresh data
        folderCacheRef.current.set(cacheKey, {
          emails: data.emails,
          total: data.total,
          timestamp: Date.now()
        })
      }

      setTotalEmails(data.total)

      // Update current folder count from response total (avoids redundant fetchCounts API call)
      if (!isLoadMore) {
        setCounts(prev => {
          const folderKey = currentFolder === 'inbox' ? 'inbox'
            : currentFolder === 'processed' ? 'processed'
            : currentFolder === 'sent' ? 'sent'
            : currentFolder === 'archive' ? 'archive'
            : null
          if (folderKey) return { ...prev, [folderKey]: data.total }
          return prev
        })
      }
    } catch (error) {
      // Silently ignore aborted requests (user switched folder before response arrived)
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Failed to fetch emails:', error)
      if (!hasCacheHit) toast.error('Échec du chargement des emails')
    } finally {
      setIsLoading(false)
    }
  }, [offset, selectedSource, currentFolder])

  // Keep ref in sync so memoized callbacks always call the latest version
  fetchEmailsRef.current = fetchEmails

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
    setSelectedSource('all')
  }, [])

  const handleSourceChange = useCallback((source: string) => {
    setSelectedSource(source)
    setEntityFilter(null)
    setOffset(0)
    fetchEmails(false, source)
  }, [fetchEmails])

  const handleEntityClick = useCallback(async (type: string, id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/entities/${type}/${id}/emails`)
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
    } finally {
      setIsLoading(false)
    }
  }, [linkedEntities])

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
        invalidateCache()
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

  // Reply is handled directly inside EmailDetail (calls EmailClientService.sendEmail)

  const handleArchive = useCallback(async () => {
    if (!selectedEmailId) return

    const previousEmails = realEmails
    const emailToArchive = realEmails.find(e => e.id === selectedEmailId)
    setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
    setSelectedEmailId(undefined)

    try {
      await EmailClientService.archiveEmail(selectedEmailId)
      toast.success('Email archivé')
      invalidateCache('inbox')
      invalidateCache('archive')
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
      invalidateCache(currentFolder)
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1)
      }))
    } catch (error) {
      setRealEmails(previousEmails)
      setSelectedEmailId(emailToDelete?.id)
      toast.error('Échec de la suppression')
    }
  }, [selectedEmailId, realEmails, currentFolder, invalidateCache])

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
      invalidateCache(currentFolder)
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1)
      }))
    } catch (error) {
      setRealEmails(previousEmails)
      if (wasSelected) setSelectedEmailId(emailId)
      toast.error('Échec de la suppression')
    }
  }, [realEmails, selectedEmailId, currentFolder, invalidateCache])

  const handleBlacklist = useCallback(async (emailId: string, senderEmail: string, reason?: string, archiveExisting?: boolean) => {
    // Optimistic: remove the current email from the UI
    const previousEmails = realEmails
    setRealEmails(prev => prev.filter(e => e.id !== emailId))
    if (selectedEmailId === emailId) setSelectedEmailId(undefined)

    try {
      const response = await fetch('/api/emails/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail, reason, archiveExisting })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Blacklist failed')
      }
      const result = await response.json()

      if (archiveExisting) {
        // Remove all emails from this sender in the UI (compare extracted clean emails)
        const cleanSender = senderEmail.toLowerCase()
        setRealEmails(prev => prev.filter(e => extractEmailAddress(e.from_address).toLowerCase() !== cleanSender))
        if (result.archivedCount > 0) {
          setCounts(prev => ({
            ...prev,
            inbox: Math.max(0, prev.inbox - result.archivedCount),
            archive: prev.archive + result.archivedCount
          }))
        }
      } else {
        // Just update counts for the single deleted email
        setCounts(prev => ({
          ...prev,
          inbox: Math.max(0, prev.inbox - 1)
        }))
      }

      // Also soft-delete the triggering email
      await EmailClientService.deleteEmail(emailId).catch(() => {})
      invalidateCache('inbox')
      invalidateCache('archive')
    } catch (error) {
      // Rollback on failure
      setRealEmails(previousEmails)
      toast.error('Echec de l\'ajout a la liste noire')
    }
  }, [realEmails, selectedEmailId])

  const handleMarkAsProcessed = useCallback(async () => {
    if (!selectedEmailId) return
    try {
      await EmailClientService.markAsProcessed(selectedEmailId)
      setRealEmails(prev => prev.map(e =>
        e.id === selectedEmailId ? { ...e, status: 'read' as const } : e
      ))
      toast.success('Email marqué comme traité')
      invalidateCache('inbox')
      invalidateCache('processed')
      setCounts(prev => ({
        ...prev,
        inbox: Math.max(0, prev.inbox - 1),
        processed: prev.processed + 1
      }))
    } catch (error) {
      toast.error('Échec du marquage')
    }
  }, [selectedEmailId, invalidateCache])

  const handleMarkAsUnprocessed = useCallback(async () => {
    if (!selectedEmailId) return
    try {
      await EmailClientService.markAsUnprocessed(selectedEmailId)
      setRealEmails(prev => prev.map(e =>
        e.id === selectedEmailId ? { ...e, status: 'unread' as const } : e
      ))
      toast.success('Email marqué comme non traité')
      invalidateCache('inbox')
      invalidateCache('processed')
      setCounts(prev => ({
        ...prev,
        inbox: prev.inbox + 1,
        processed: Math.max(0, prev.processed - 1)
      }))
    } catch (error) {
      toast.error('Échec du marquage')
    }
  }, [selectedEmailId, invalidateCache])

  const handleConversationSelect = useCallback((conversationId: string) => {
    const conversationEmails = emails
      .filter(e => e.conversation_id === conversationId)
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime())

    if (conversationEmails.length > 0) {
      setSelectedEmailId(conversationEmails[conversationEmails.length - 1].id)
    }
  }, [emails])

  const handleReplySent = useCallback(async (sentEmailId: string) => {
    // Fetch the newly sent email and add it to local state for instant thread update
    const sentEmail = await fetchFullEmail(sentEmailId)
    if (sentEmail) {
      setRealEmails(prev => [...prev, sentEmail])
    }
    // Update sent count
    setCounts(prev => ({ ...prev, sent: prev.sent + 1 }))
  }, [fetchFullEmail])

  const handleCompose = useCallback(() => {
    setComposeOpen(true)
  }, [])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <PageActions>
        <Button variant="outline" onClick={handleSync} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Synchroniser
        </Button>
        <Button onClick={handleCompose} className="w-fit">
          <Plus className="h-4 w-4 mr-2" /><span>Rédiger</span>
        </Button>
      </PageActions>

      {/* White Card with Email Interface */}
      <div className="bg-card rounded-lg shadow-sm border border-border flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full min-w-0">
          {/* Sidebar */}
          <MailboxSidebar
            currentFolder={currentFolder}
            onFolderChange={handleFolderChange}
            unreadCounts={counts}
            linkedEntities={linkedEntities}
            onEntityClick={handleEntityClick}
            selectedEntity={entityFilter}
            emailConnections={emailConnections}
            selectedSource={selectedSource}
            onSourceChange={handleSourceChange}
          />

          {/* Email List - collapsible */}
          <div className={cn(
            "flex flex-col h-full overflow-hidden flex-shrink-0 transition-all duration-200",
            isEmailListCollapsed ? "w-0 opacity-0" : "w-[400px] opacity-100"
          )}>
            {entityFilter && !isEmailListCollapsed && (
              <div className="w-full px-3 py-2 bg-primary/5 border-b flex items-center justify-between gap-2 flex-shrink-0">
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

          {/* Toggle button — subtle handle for panel collapse */}
          <button
            onClick={() => setIsEmailListCollapsed(!isEmailListCollapsed)}
            className="h-full w-6 flex items-center justify-center bg-muted/30 hover:bg-muted/70 active:bg-muted border-l cursor-pointer group flex-shrink-0 transition-colors"
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
              emailLinksCache={emailLinksCache}

              onArchive={handleArchive}
              onDelete={handleDelete}
              onLinkBuilding={handleLinkBuilding}
              onCreateIntervention={handleCreateIntervention}
              onSoftDelete={handleSoftDelete}
              onBlacklist={handleBlacklist}
              onMarkAsProcessed={handleMarkAsProcessed}
              onMarkAsUnprocessed={handleMarkAsUnprocessed}
              onLinksUpdated={fetchLinkedEntities}
              onReplySent={handleReplySent}
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

      {/* Compose Modal */}
      <ComposeEmailModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        emailConnections={emailConnections}
        onEmailSent={handleReplySent}
      />
    </div>
  )
}
