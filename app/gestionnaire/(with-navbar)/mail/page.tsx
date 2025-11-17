'use client'

import { useState, useEffect, useRef } from 'react'
import { MailboxSidebar } from './components/mailbox-sidebar'
import { EmailList } from './components/email-list'
import { EmailDetail } from './components/email-detail'
import {
  dummyEmails,
  dummyBuildings,
  getEmailsByFolder,
  getEmailsByBuilding,
  getEmailById,
  getUnreadCount,
  getDraftsCount
} from './components/dummy-data'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

export default function EmailPage() {
  const [currentFolder, setCurrentFolder] = useState('inbox')
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>(undefined)
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false)
  const replyActionRef = useRef<(() => void) | null>(null)

  // Get emails based on current folder/filter
  const getDisplayEmails = () => {
    // Check if folder is a building ID
    const building = dummyBuildings.find(b => b.id === currentFolder)
    if (building) {
      return getEmailsByBuilding(building.id)
    }

    // Check if folder is a label filter
    if (currentFolder === 'urgent') {
      return dummyEmails.filter(e => e.labels.includes('Urgent'))
    }
    if (currentFolder === 'intervention') {
      return dummyEmails.filter(e => e.labels.includes('Intervention'))
    }

    // Standard folder
    return getEmailsByFolder(currentFolder)
  }

  const displayEmails = getDisplayEmails()
  const selectedEmail = selectedEmailId ? getEmailById(selectedEmailId) : displayEmails[0]

  // Auto-select first email when folder changes
  const handleFolderChange = (folder: string) => {
    setCurrentFolder(folder)
    const emails = folder === currentFolder ? displayEmails : getEmailsByFolder(folder)
    setSelectedEmailId(emails[0]?.id)
  }

  // Handlers for email actions (dummy implementations)
  const handleReply = (replyText: string) => {
    toast.success('Reply sent (dummy action)')
    console.log('Reply:', replyText)
  }

  const handleArchive = () => {
    toast.success('Email archived (dummy action)')
  }

  const handleDelete = () => {
    toast.success('Email deleted (dummy action)')
  }

  const handleLinkBuilding = (buildingId: string, lotId?: string) => {
    const building = dummyBuildings.find(b => b.id === buildingId)
    const lot = building?.lots.find(l => l.id === lotId)
    toast.success(`Linked to ${building?.name}${lot ? ` - ${lot.name}` : ''} (dummy action)`)
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
    const emails = getEmailsByBuilding(buildingId)
    setSelectedEmailId(emails[0]?.id)
  }

  const handleConversationSelect = (conversationId: string) => {
    // Find the parent email of this conversation
    const parentEmail = dummyEmails.find(e => 
      e.conversation_id === conversationId && e.is_parent
    )
    if (parentEmail) {
      setSelectedEmailId(parentEmail.id)
    }
  }

  // Navigate to next/previous email
  const navigateEmail = (direction: 'next' | 'prev') => {
    const currentIndex = displayEmails.findIndex(e => e.id === selectedEmailId)
    if (currentIndex === -1) return

    const newIndex = direction === 'next'
      ? Math.min(currentIndex + 1, displayEmails.length - 1)
      : Math.max(currentIndex - 1, 0)

    if (newIndex !== currentIndex) {
      setSelectedEmailId(displayEmails[newIndex].id)
      toast.success(`Navigated to ${direction} email`)
    }
  }

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Keyboard shortcuts
      switch (e.key.toLowerCase()) {
        case 'r':
          if (selectedEmail) {
            replyActionRef.current?.()
            toast.success('Reply mode activated (press R)')
          }
          break
        case 'e':
          if (selectedEmail) {
            handleArchive()
          }
          break
        case '#':
        case 'delete':
          if (selectedEmail) {
            handleDelete()
          }
          break
        case 'j':
          navigateEmail('next')
          e.preventDefault()
          break
        case 'k':
          navigateEmail('prev')
          e.preventDefault()
          break
        case '?':
          setShowShortcutsDialog(true)
          e.preventDefault()
          break
        case 'g':
          // Gmail-style navigation: g+i for inbox
          if (e.shiftKey) {
            setCurrentFolder('inbox')
            toast.success('Navigated to Inbox (Shift+G)')
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEmail, displayEmails, selectedEmailId])

  const handleCompose = () => {
    toast.info('Compose new email modal would open here (dummy action)')
  }

  return (
    <div className="layout-padding flex flex-col flex-1 min-h-0 bg-slate-50">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
            Emails
          </h1>
          <Button onClick={handleCompose} className="w-fit">
            <Plus className="h-4 w-4 mr-2" />
            <span>Composer</span>
          </Button>
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
              inbox: getUnreadCount('inbox'),
              sent: 0,
              drafts: getDraftsCount(),
              archive: 0
            }}
            buildings={dummyBuildings}
            onBuildingClick={handleBuildingClick}
          />

          {/* Email List */}
          <EmailList
            emails={displayEmails}
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
                <p className="text-xs mt-4 text-muted-foreground/70">
                  Press <kbd className="px-2 py-1 bg-muted rounded border">?</kbd> for keyboard shortcuts
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Navigate and manage emails faster with these shortcuts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Navigation</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next email</span>
                  <kbd className="px-2 py-1 bg-muted rounded border text-xs">J</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous email</span>
                  <kbd className="px-2 py-1 bg-muted rounded border text-xs">K</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Go to Inbox</span>
                  <kbd className="px-2 py-1 bg-muted rounded border text-xs">Shift + G</kbd>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Actions</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reply</span>
                  <kbd className="px-2 py-1 bg-muted rounded border text-xs">R</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Archive</span>
                  <kbd className="px-2 py-1 bg-muted rounded border text-xs">E</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delete</span>
                  <kbd className="px-2 py-1 bg-muted rounded border text-xs">#</kbd>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Help</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Show this dialog</span>
                  <kbd className="px-2 py-1 bg-muted rounded border text-xs">?</kbd>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
