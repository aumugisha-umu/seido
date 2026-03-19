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
import { Plus, RefreshCw, X, ChevronLeft, ChevronRight, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmailClientService } from '@/lib/services/client/email-client.service'
import { Email } from '@/lib/types/email-integration'
import { LinkedEmail, EmailLinkWithDetails } from '@/lib/types/email-links'
import { MailboxEmail, Building, Lot, generateConversationId, extractSenderName, extractEmailAddress } from './components/types'
import { useFABActions } from "@/components/ui/fab"
import { EmailConnectionPrompt } from '@/components/email/email-connection-prompt'
import { useComposeEmail } from '@/contexts/compose-email-context'
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
  initialSourceCounts?: Record<string, number>
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
  status: le.status as Email['status'],
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
// COUNT ADJUSTMENT HELPER
// ============================================================================

type CountAction = 'archive' | 'delete' | 'softDelete' | 'markProcessed' | 'markUnprocessed' | 'replySent'
type FolderKey = 'inbox' | 'processed' | 'sent' | 'drafts' | 'archive'

/**
 * Returns the new counts after applying an action from the given folder.
 * Centralizes all count delta logic to avoid hardcoded inbox -= 1 bugs.
 */
function adjustCounts(
  prev: { inbox: number; processed: number; sent: number; drafts: number; archive: number },
  action: CountAction,
  currentFolder: string
): { inbox: number; processed: number; sent: number; drafts: number; archive: number } {
  const next = { ...prev }
  const folder = currentFolder as FolderKey

  switch (action) {
    case 'archive':
      // Remove from current folder, add to archive
      if (folder in next) next[folder] = Math.max(0, next[folder] - 1)
      next.archive = next.archive + 1
      break
    case 'delete':
    case 'softDelete':
      // Remove from current folder only
      if (folder in next) next[folder] = Math.max(0, next[folder] - 1)
      break
    case 'markProcessed':
      // inbox → processed
      next.inbox = Math.max(0, next.inbox - 1)
      next.processed = next.processed + 1
      break
    case 'markUnprocessed':
      // processed → inbox
      next.processed = Math.max(0, next.processed - 1)
      next.inbox = next.inbox + 1
      break
    case 'replySent':
      next.sent = next.sent + 1
      break
  }

  return next
}

// ============================================================================
// MAIN CLIENT COMPONENT
// ============================================================================

export function MailClient({
  teamId,
  initialCounts,
  initialSourceCounts,
  initialBuildings,
  initialEmailConnections,
  initialLinkedEntities,
  initialEmails,
  initialTotalEmails
}: MailClientProps) {
  const router = useRouter()
  const { openCompose } = useComposeEmail()

  // Core state (initialized with SSR data)
  const [currentFolder, setCurrentFolder] = useState('inbox')
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>(
    initialEmails.length > 0 ? initialEmails[0].id : undefined
  )
  const [realEmails, setRealEmails] = useState<Email[]>(initialEmails)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [isLoading, setIsLoading] = useState(false)
  const [counts, setCounts] = useState(initialCounts)
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>(initialSourceCounts || {})

  // Linked entities for sidebar
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntities>(initialLinkedEntities)
  const [entityFilter, setEntityFilter] = useState<EntityFilter | null>(null)
  const [entityPaginationOffset, setEntityPaginationOffset] = useState(0)

  // Email box source filter
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>(initialEmailConnections)

  // Collapse state for email list column
  const [isEmailListCollapsed, setIsEmailListCollapsed] = useState(false)

  // Loading state for full email body fetch (shows skeleton in EmailDetail)
  const [loadingEmailBodyId, setLoadingEmailBodyId] = useState<string | null>(null)

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
  // Track optimistic removals to prevent stale-while-revalidate from resurrecting them
  const optimisticRemovals = useRef<Set<string>>(new Set())

  // Stable refs for values used inside memoized callbacks (avoids re-creating callbacks on state change)
  const currentFolderRef = useRef(currentFolder)
  currentFolderRef.current = currentFolder
  const fetchEmailsRef = useRef<((isLoadMore?: boolean, sourceOverride?: string, folderOverride?: string) => Promise<void>) | null>(null)

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

    // Always increment the correct folder count (badge must update even when viewing another folder)
    if (newEmail.direction === 'received') {
      setCounts(prev => ({ ...prev, inbox: prev.inbox + 1 }))
    }
    if (newEmail.direction === 'sent') {
      setCounts(prev => ({ ...prev, sent: prev.sent + 1 }))
    }

    // Only prepend to visible list when the folder matches
    if (folder === 'inbox' && newEmail.direction === 'received') {
      setRealEmails(prev => [newEmail, ...prev])
      setTotalEmails(prev => prev + 1)
    }
    if (folder === 'sent' && newEmail.direction === 'sent') {
      setRealEmails(prev => [newEmail, ...prev])
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

  // Stable callback: refresh source counts from polling data
  const handlePollingRefresh = useCallback((data: { sourceCounts?: Record<string, number> }) => {
    if (data.sourceCounts) {
      setSourceCounts(data.sourceCounts)
    }
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
    onNewEmails: handlePollingNewEmails,
    onRefresh: handlePollingRefresh
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
    } catch {
      // Error is non-critical; sidebar entities will refresh on next sync
    }
  }, [])

  const fetchEmails = useCallback(async (isLoadMore = false, sourceOverride?: string, folderOverride?: string) => {
    const source = sourceOverride ?? selectedSource
    const folder = folderOverride ?? currentFolder
    const cacheKey = `${folder}:${source}`

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
        folder,
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
        // Filter out optimistically removed emails to prevent resurrection on background refresh
        const filteredEmails = optimisticRemovals.current.size > 0
          ? data.emails.filter((e: Email) => !optimisticRemovals.current.has(e.id))
          : data.emails
        setRealEmails(filteredEmails)
        setOffset(LIMIT)
        if (filteredEmails.length > 0) {
          setSelectedEmailId(prev => {
            // Keep current selection if it exists in new data (avoid jarring jumps on background refresh)
            if (prev && filteredEmails.some((e: Email) => e.id === prev)) return prev
            return filteredEmails[0].id
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
      // Guard: only overwrite when viewing all sources — source-filtered totals are partial
      if (!isLoadMore && source === 'all') {
        setCounts(prev => {
          const folderKey = folder === 'inbox' ? 'inbox'
            : folder === 'processed' ? 'processed'
            : folder === 'sent' ? 'sent'
            : folder === 'archive' ? 'archive'
            : null
          if (folderKey) return { ...prev, [folderKey]: data.total }
          return prev
        })
      }
    } catch (error) {
      // Silently ignore aborted requests (user switched folder before response arrived)
      if (error instanceof DOMException && error.name === 'AbortError') return
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
    } catch {
      // Silently fail; email detail will show partial data
    }
    return null
  }, [])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load full email data when selecting a filtered email
  useEffect(() => {
    if (entityFilter && selectedEmailId) {
      const currentEmail = realEmails.find(e => e.id === selectedEmailId)
      if (currentEmail && currentEmail.body_html === null) {
        setLoadingEmailBodyId(selectedEmailId)
        fetchFullEmail(selectedEmailId).then(fullEmail => {
          if (fullEmail) {
            setRealEmails(prev => prev.map(e =>
              e.id === selectedEmailId ? fullEmail : e
            ))
          }
        }).finally(() => {
          setLoadingEmailBodyId(null)
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
    setEntityPaginationOffset(0)
    setSelectedSource('all')
    // Fetch explicitly with folder override (avoids stale closure from setCurrentFolder)
    // No useEffect needed — handlers are the sole fetch triggers
    fetchEmails(false, 'all', folder)
  }, [fetchEmails])

  const handleSourceChange = useCallback((source: string) => {
    setSelectedSource(source)
    setEntityFilter(null)
    setEntityPaginationOffset(0)
    fetchEmails(false, source)
  }, [fetchEmails])

  const handleEntityClick = useCallback(async (type: string, id: string) => {
    setIsLoading(true)
    setEntityPaginationOffset(0)
    try {
      const response = await fetch(`/api/entities/${type}/${id}/emails?limit=20&offset=0`)
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
        setTotalEmails(data.pagination?.total ?? data.emails.length)
        setEntityPaginationOffset(data.emails.length)
        if (adaptedEmails.length > 0) {
          setSelectedEmailId(adaptedEmails[0].id)
        }
      }
    } catch {
      toast.error('Erreur lors du filtrage')
    } finally {
      setIsLoading(false)
    }
  }, [linkedEntities])

  const handleLoadMore = useCallback(async () => {
    if (isLoading || offset >= totalEmails) return

    // Entity filter: load more from entity API
    if (entityFilter) {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/entities/${entityFilter.type}/${entityFilter.id}/emails?limit=20&offset=${entityPaginationOffset}`
        )
        if (!response.ok) return
        const data = await response.json()
        if (data.success && data.emails.length > 0) {
          const adaptedEmails = data.emails.map((le: LinkedEmail) => adaptLinkedEmailToEmail(le))
          setRealEmails(prev => [...prev, ...adaptedEmails])
          setEntityPaginationOffset(prev => prev + data.emails.length)
        }
      } catch {
        // Silently fail; user can retry via scroll
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Folder mode: use standard fetchEmails
    fetchEmails(true)
  }, [isLoading, offset, totalEmails, entityFilter, entityPaginationOffset, fetchEmails])

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
        optimisticRemovals.current.clear()
        fetchEmails(false)
        fetchLinkedEntities()
      }
    } catch (error) {
      toast.error('Échec de la synchronisation')
    } finally {
      setIsLoading(false)
    }
  }, [invalidateCache, resetKnownEmails, fetchEmails, fetchLinkedEntities])

  useFABActions([
    {
      id: 'sync-emails',
      label: 'Synchroniser',
      icon: RefreshCw,
      onClick: handleSync,
    }
  ])

  // Reply is handled directly inside EmailDetail (calls EmailClientService.sendEmail)

  const handleArchive = useCallback(async () => {
    if (!selectedEmailId) return

    const previousEmails = realEmails
    const emailToArchive = realEmails.find(e => e.id === selectedEmailId)
    setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
    setSelectedEmailId(undefined)
    optimisticRemovals.current.add(selectedEmailId)

    try {
      await EmailClientService.archiveEmail(selectedEmailId)
      toast.success('Email archivé')
      invalidateCache(currentFolder)
      invalidateCache('archive')
      setCounts(prev => adjustCounts(prev, 'archive', currentFolder))
    } catch (error) {
      optimisticRemovals.current.delete(selectedEmailId)
      setRealEmails(previousEmails)
      setSelectedEmailId(emailToArchive?.id)
      toast.error('Échec de l\'archivage')
    }
  }, [selectedEmailId, realEmails, currentFolder, invalidateCache])

  const handleDelete = useCallback(async () => {
    if (!selectedEmailId) return

    const previousEmails = realEmails
    const emailToDelete = realEmails.find(e => e.id === selectedEmailId)
    setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
    setSelectedEmailId(undefined)
    optimisticRemovals.current.add(selectedEmailId)

    try {
      await EmailClientService.deleteEmail(selectedEmailId)
      toast.success('Email supprimé')
      invalidateCache(currentFolder)
      setCounts(prev => adjustCounts(prev, 'delete', currentFolder))
    } catch (error) {
      optimisticRemovals.current.delete(selectedEmailId)
      setRealEmails(previousEmails)
      setSelectedEmailId(emailToDelete?.id)
      toast.error('Échec de la suppression')
    }
  }, [selectedEmailId, realEmails, currentFolder, invalidateCache])

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
    optimisticRemovals.current.add(emailId)

    try {
      await EmailClientService.deleteEmail(emailId)
      toast.success('Email supprimé')
      invalidateCache(currentFolder)
      setCounts(prev => adjustCounts(prev, 'softDelete', currentFolder))
    } catch (error) {
      optimisticRemovals.current.delete(emailId)
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
          // Blacklist archives from inbox specifically (server-side behavior)
          setCounts(prev => ({
            ...prev,
            inbox: Math.max(0, prev.inbox - result.archivedCount),
            archive: prev.archive + result.archivedCount
          }))
        }
      } else {
        // Single email soft-deleted from current folder
        setCounts(prev => adjustCounts(prev, 'softDelete', currentFolder))
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
  }, [realEmails, selectedEmailId, currentFolder, invalidateCache])

  const handleMarkAsProcessed = useCallback(async () => {
    if (!selectedEmailId) return

    // Save state for rollback
    const previousEmails = realEmails
    const previousCounts = { ...counts }
    const previousSelectedId = selectedEmailId

    // Optimistic: if in inbox, remove email from list + select next
    if (currentFolder === 'inbox') {
      const idx = realEmails.findIndex(e => e.id === selectedEmailId)
      setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
      const nextEmail = realEmails[idx + 1] || realEmails[idx - 1]
      setSelectedEmailId(nextEmail?.id)
    } else {
      setRealEmails(prev => prev.map(e =>
        e.id === selectedEmailId ? { ...e, status: 'read' as const } : e
      ))
    }
    setCounts(prev => adjustCounts(prev, 'markProcessed', currentFolder))

    try {
      await EmailClientService.markAsProcessed(selectedEmailId)
      toast.success('Email marqué comme traité')
      invalidateCache('inbox')
      invalidateCache('processed')
    } catch (error) {
      // Rollback
      setRealEmails(previousEmails)
      setCounts(previousCounts)
      setSelectedEmailId(previousSelectedId)
      toast.error('Échec du marquage')
    }
  }, [selectedEmailId, realEmails, counts, currentFolder, invalidateCache])

  const handleMarkAsUnprocessed = useCallback(async () => {
    if (!selectedEmailId) return

    // Save state for rollback
    const previousEmails = realEmails
    const previousCounts = { ...counts }
    const previousSelectedId = selectedEmailId

    // Optimistic: if in processed, remove email from list + select next
    if (currentFolder === 'processed') {
      const idx = realEmails.findIndex(e => e.id === selectedEmailId)
      setRealEmails(prev => prev.filter(e => e.id !== selectedEmailId))
      const nextEmail = realEmails[idx + 1] || realEmails[idx - 1]
      setSelectedEmailId(nextEmail?.id)
    } else {
      setRealEmails(prev => prev.map(e =>
        e.id === selectedEmailId ? { ...e, status: 'unread' as const } : e
      ))
    }
    setCounts(prev => adjustCounts(prev, 'markUnprocessed', currentFolder))

    try {
      await EmailClientService.markAsUnprocessed(selectedEmailId)
      toast.success('Email marqué comme non traité')
      invalidateCache('inbox')
      invalidateCache('processed')
    } catch (error) {
      // Rollback
      setRealEmails(previousEmails)
      setCounts(previousCounts)
      setSelectedEmailId(previousSelectedId)
      toast.error('Échec du marquage')
    }
  }, [selectedEmailId, realEmails, counts, currentFolder, invalidateCache])

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
    setCounts(prev => adjustCounts(prev, 'replySent', currentFolder))
  }, [fetchFullEmail, currentFolder])

  // ============================================================================
  // RENDER
  // ============================================================================

  // emailConnections is pre-filtered (is_active=true) by SSR
  const hasActiveConnections = emailConnections.length > 0

  // Full takeover: show connection prompt when no email connected
  if (!hasActiveConnections) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-card rounded-lg border border-border shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Connectez votre email</h2>
            <p className="text-muted-foreground mt-2">
              Synchronisez et envoyez des messages directement depuis SEIDO
            </p>
          </div>
          <EmailConnectionPrompt onSuccess={() => router.refresh()} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <PageActions>
        <Button variant="outline" onClick={handleSync} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Synchroniser
        </Button>
        <Button onClick={openCompose} className="w-fit">
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
            sourceCounts={sourceCounts}
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
                    setEntityPaginationOffset(0)
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
              loadingEmailBodyId={loadingEmailBodyId}

              onArchive={handleArchive}
              onDelete={handleDelete}
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
                <p className="text-lg font-semibold mb-2">Aucun email sélectionné</p>
                <p className="text-sm">Sélectionnez un email pour le consulter</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
