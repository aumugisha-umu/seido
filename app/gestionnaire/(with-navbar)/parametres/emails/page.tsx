'use client'

import { useState, useEffect } from 'react'
import { BlacklistManager } from '../../mail/components/blacklist-manager'
import { EmailConnectionForm } from './components/email-connection-form'
import { EmailConnectionList } from './components/email-connection-list'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EmailConnection {
  id: string
  provider: string
  email_address: string
  is_active: boolean
  last_sync_at: string | null
  last_error: string | null
  sync_from_date: string | null
  created_at: string
}

export default function EmailSettingsPage() {
  const [blacklist, setBlacklist] = useState([])
  const [connections, setConnections] = useState<EmailConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const fetchConnections = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/emails/connections')
      if (!response.ok) {
        throw new Error('Failed to fetch connections')
      }
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (error) {
      console.error('Failed to fetch connections:', error)
      // If fetch fails, we assume no connections or temporary error
      // Don't show toast on initial load to avoid user confusion if it's just empty
      setConnections([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const handleUnblock = (blacklistId: string) => {
    // Dummy implementation
    setBlacklist(prev => prev.filter(entry => entry.id !== blacklistId))
    console.log('Unblocked blacklist entry:', blacklistId)
  }

  const handleAddManual = () => {
    toast.info('Manual blacklist entry modal would open here (dummy action)')
    console.log('Add manual blacklist entry')
  }

  const handleConnectionAdded = () => {
    setShowAddDialog(false)
    fetchConnections()
  }

  const handleConnectionDeleted = () => {
    fetchConnections()
  }

  return (
    <div className="container content-max-width py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your email configuration and blocked senders.
        </p>
      </div>

      <div className="space-y-8">
        {/* Email Connections Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Email Connections</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your email accounts to sync and send emails
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <EmailConnectionList
              connections={connections}
              onConnectionDeleted={handleConnectionDeleted}
            />
          )}
        </div>

        {/* Blacklist Manager */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Blocked Senders</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage blocked email addresses and domains
            </p>
          </div>
          <BlacklistManager
            blacklist={blacklist}
            onUnblock={handleUnblock}
            onAddManual={handleAddManual}
          />
        </div>
      </div>

      {/* Add Connection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Email Connection</DialogTitle>
            <DialogDescription>
              Connect your email account to sync and send emails from SEIDO
            </DialogDescription>
          </DialogHeader>
          <EmailConnectionForm
            onSuccess={handleConnectionAdded}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
