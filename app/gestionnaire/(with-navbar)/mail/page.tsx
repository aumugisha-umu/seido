'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { MailboxSidebar } from './components/mailbox-sidebar'
import { EmailList } from './components/email-list'
import { EmailDetail } from './components/email-detail'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { EmailClientService } from '@/lib/services/client/email-client.service'
import { Email } from '@/lib/types/email-integration'
import { MailboxEmail, Building } from './components/types'
import { useRealtimeEmails } from '@/hooks/use-realtime-emails'

// Adapter to convert real Email to MailboxEmail (for UI compatibility)
const adaptEmail = (email: Email, buildings: Building[]): MailboxEmail => {
  const building = buildings.find(b => b.id === email.building_id)
  const lot = building?.lots.find(l => l.id === email.lot_id)

  return {
    id: email.id,
    sender_email: email.from_address,
    sender_name: email.from_address.split('@')[0], // Simple extraction
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
    conversation_id: email.id, // TODO: Implement conversation grouping
    thread_order: 0,
    is_parent: true,
    email_connection_id: email.email_connection_id || undefined
  }
}

export default function EmailPage() {
  const [currentFolder, setCurrentFolder] = useState('inbox')
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>(undefined)
  const [realEmails, setRealEmails] = useState<Email[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [teamId, setTeamId] = useState<string | undefined>(undefined)

  const [counts, setCounts] = useState({ inbox: 0, sent: 0, drafts: 0, archive: 0 })

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
  }, [selectedEmailId, selectedEmail, emails.length])

  // Fetch team ID
  useEffect(() => {
    const fetchTeamId = async () => {
      try {
        const response = await fetch('/api/user-teams')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.teamId) {
            setTeamId(data.teamId)
          }
        }
      } catch (error) {
        console.error('Failed to fetch team ID:', error)
      }
    }
    fetchTeamId()
  }, [])

  // Real-time subscription
  useRealtimeEmails({
    teamId,
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
  const fetchEmails = async (isLoadMore = false) => {
    setIsLoading(true)
    try {
      const currentOffset = isLoadMore ? offset : 0
      const data = await EmailClientService.getEmails(currentFolder, undefined, LIMIT, currentOffset)

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

  // Initial fetch
  useEffect(() => {
    fetchBuildings()
    fetchCounts()
  }, [])

  // Fetch emails when folder changes
  useEffect(() => {
    setOffset(0)
    fetchEmails(false)
  }, [currentFolder])

  // Auto-select first email when folder changes
  const handleFolderChange = (folder: string) => {
    setCurrentFolder(folder)
    setSelectedEmailId(undefined) // Will be set by fetchEmails/useEffect
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

    if (!selectedEmail.email_connection_id) {
      toast.error('Impossible de répondre : Aucune connexion email associée')
      return
    }

    try {
      await EmailClientService.sendEmail({
        emailConnectionId: selectedEmail.email_connection_id,
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
    try {
      await EmailClientService.archiveEmail(selectedEmailId)
      toast.success('Email archivé')
      fetchEmails()
    } catch (error) {
      toast.error('Échec de l\'archivage')
    }
  }

  const handleDelete = async () => {
    if (!selectedEmailId) return
    try {
      await EmailClientService.deleteEmail(selectedEmailId)
      toast.success('Email supprimé')
      fetchEmails()
    } catch (error) {
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

  const handleCreateIntervention = () => {
    toast.success('Modal de création d\'intervention s\'ouvrira ici (action factice)')
  }

  const handleSoftDelete = async (emailId: string) => {
    try {
      await EmailClientService.deleteEmail(emailId)
      toast.success('Email deleted')
      fetchEmails()
    } catch (error) {
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

  const handleBuildingClick = (buildingId: string) => {
    // Filter by building (not implemented in API yet, but we can filter locally or add param)
    // For now, just set folder to buildingId (which might not work if API doesn't support it)
    // Actually, API supports 'folder' param. If we pass buildingId, API needs to handle it.
    // Current API only handles 'inbox', 'sent', 'archive'.
    // We might need to update API to support building_id filter.
    // For now, let's just log.
    console.log('Filter by building:', buildingId)
    toast.info('Filtrage par immeuble pas encore implémenté')
  }

  const handleConversationSelect = (conversationId: string) => {
    // Find the parent email of this conversation and select it
    const parentEmail = emails.find(e => e.conversation_id === conversationId && e.is_parent)
    if (parentEmail) {
      setSelectedEmailId(parentEmail.id)
    }
  }

  const handleCompose = () => {
    toast.info('Modal de rédaction d\'email s\'ouvrira ici (action factice)')
  }

  return (
    <div className="layout-padding flex flex-col flex-1 min-h-0 bg-slate-50">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
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
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex flex-1 min-h-0 w-full">
          {/* Sidebar */}
          <MailboxSidebar
            currentFolder={currentFolder}
            onFolderChange={handleFolderChange}
            unreadCounts={counts}
            buildings={buildings}
            onBuildingClick={handleBuildingClick}
          />

          {/* Email List */}
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={setSelectedEmailId}
            onConversationSelect={handleConversationSelect}
            totalEmails={totalEmails}
            onLoadMore={handleLoadMore}
          />

          {/* Email Detail */}
          {selectedEmail ? (
            <EmailDetail
              key={selectedEmail.id}
              email={selectedEmail}
              allEmails={emails}
              buildings={buildings}
              onReply={handleReply}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onLinkBuilding={handleLinkBuilding}
              onCreateIntervention={handleCreateIntervention}
              onSoftDelete={handleSoftDelete}
              onBlacklist={handleBlacklist}
              onMarkAsProcessed={handleMarkAsProcessed}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground bg-slate-50/50">
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
