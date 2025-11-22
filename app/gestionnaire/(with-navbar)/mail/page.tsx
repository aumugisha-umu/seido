'use client'

import { useState, useEffect, useRef } from 'react'
import { MailboxSidebar } from './components/mailbox-sidebar'
import { EmailList } from './components/email-list'
import { EmailDetail } from './components/email-detail'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { EmailClientService } from '@/lib/services/client/email-client.service'
import { Email } from '@/lib/types/email-integration'
import { DummyEmail, DummyBuilding } from './components/dummy-data' // Keep for types/buildings for now

// Adapter to convert real Email to DummyEmail (for UI compatibility)
const adaptEmail = (email: Email): DummyEmail => ({
  id: email.id,
  sender_email: email.from_address,
  sender_name: email.from_address.split('@')[0], // Simple extraction
  recipient_email: email.to_addresses[0],
  subject: email.subject,
  snippet: email.body_text?.substring(0, 100) || '',
  body_html: email.body_html || email.body_text || '',
  received_at: email.received_at || new Date().toISOString(),
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
  building_name: undefined, // TODO: Fetch building name
  lot_id: email.lot_id || undefined,
  lot_name: undefined,
  labels: [], // TODO: Implement labels
  direction: email.direction,
  status: email.status,
  conversation_id: email.id, // TODO: Implement conversation grouping
  thread_order: 0,
  is_parent: true,
  email_connection_id: email.email_connection_id || undefined
})

export default function EmailPage() {
  const [currentFolder, setCurrentFolder] = useState('inbox')
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>(undefined)
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false)
  const [emails, setEmails] = useState<DummyEmail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const replyActionRef = useRef<(() => void) | null>(null)

  // Fetch emails
  const fetchEmails = async () => {
    setIsLoading(true)
    try {
      const realEmails = await EmailClientService.getEmails(currentFolder)
      const adaptedEmails = realEmails.map(adaptEmail)
      setEmails(adaptedEmails)

      // Select first email if none selected
      if (!selectedEmailId && adaptedEmails.length > 0) {
        setSelectedEmailId(adaptedEmails[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      toast.error('Failed to load emails')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmails()
  }, [currentFolder])

  const selectedEmail = emails.find(e => e.id === selectedEmailId)

  // Auto-select first email when folder changes
  const handleFolderChange = (folder: string) => {
    setCurrentFolder(folder)
    setSelectedEmailId(undefined) // Will be set by useEffect
  }

  const handleSync = async () => {
    toast.promise(EmailClientService.syncEmails(), {
      loading: 'Syncing emails...',
      success: () => {
        fetchEmails()
        return 'Emails synced'
      },
      error: 'Failed to sync emails'
    })
  }

  // Handlers for email actions
  const handleReply = async (replyText: string) => {
    if (!selectedEmail) return

    if (!selectedEmail.email_connection_id) {
      toast.error('Cannot reply: No email connection associated with this email')
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
      toast.success('Reply sent')
      // Refresh emails to show sent email
      fetchEmails()
    } catch (error) {
      console.error('Reply error:', error)
      toast.error('Failed to send reply')
    }
  }

  const handleArchive = () => {
    toast.success('Email archived (dummy action)')
  }

  const handleDelete = () => {
    toast.success('Email deleted (dummy action)')
  }

  const handleLinkBuilding = (buildingId: string, lotId?: string) => {
    toast.success(`Linked to building (dummy action)`)
  }

  const handleCreateIntervention = () => {
    toast.success('Intervention creation modal would open here (dummy action)')
  }

  const handleSoftDelete = (emailId: string) => {
    toast.success('Email soft deleted (dummy action)')
  }

  const handleBlacklist = (emailId: string, senderEmail: string, reason?: string) => {
    toast.success(`Blacklisted ${senderEmail} (dummy action)`)
  }

  const handleMarkAsProcessed = () => {
    toast.success('Email/Conversation marked as processed (dummy action)')
  }

  const handleBuildingClick = (buildingId: string) => {
    setCurrentFolder(buildingId)
  }

  const handleConversationSelect = (conversationId: string) => {
    // TODO: Implement conversation selection
  }

  // Navigate to next/previous email
  const navigateEmail = (direction: 'next' | 'prev') => {
    const currentIndex = emails.findIndex(e => e.id === selectedEmailId)
    if (currentIndex === -1) return

    const newIndex = direction === 'next'
      ? Math.min(currentIndex + 1, emails.length - 1)
      : Math.max(currentIndex - 1, 0)

    if (newIndex !== currentIndex) {
      setSelectedEmailId(emails[newIndex].id)
    }
  }

  const handleCompose = () => {
    toast.info('Compose new email modal would open here (dummy action)')
  }

  // Dummy buildings for now
  const dummyBuildings: DummyBuilding[] = []

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
              Sync
            </Button>
            <Button onClick={handleCompose} className="w-fit">
              <Plus className="h-4 w-4 mr-2" />
              <span>Composer</span>
            </Button>
          </div>
        </div>
      </div>

      {/* White Card with Email Interface */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 min-h-0 overflow-y-auto overflow-x-visible p-6">
        <div className="flex h-full rounded-lg overflow-x-visible overflow-y-auto">
          {/* Sidebar */}
          <MailboxSidebar
            currentFolder={currentFolder}
            onFolderChange={handleFolderChange}
            unreadCounts={{
              inbox: 0, // TODO: Fetch counts
              sent: 0,
              drafts: 0,
              archive: 0
            }}
            buildings={dummyBuildings}
            onBuildingClick={handleBuildingClick}
          />

          {/* Email List */}
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={setSelectedEmailId}
            onConversationSelect={handleConversationSelect}
          />

          {/* Email Detail */}
          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              buildings={dummyBuildings}
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
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
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
