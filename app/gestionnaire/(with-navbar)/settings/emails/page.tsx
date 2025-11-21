'use client'

import { useState } from 'react'
import { BlacklistManager } from '../../mail/components/blacklist-manager'
import { dummyBlacklist } from '../../mail/components/dummy-data'
import { toast } from 'sonner'

export default function EmailSettingsPage() {
  const [blacklist, setBlacklist] = useState(dummyBlacklist)

  const handleUnblock = (blacklistId: string) => {
    // Dummy implementation
    setBlacklist(prev => prev.filter(entry => entry.id !== blacklistId))
    console.log('Unblocked blacklist entry:', blacklistId)
  }

  const handleAddManual = () => {
    toast.info('Manual blacklist entry modal would open here (dummy action)')
    console.log('Add manual blacklist entry')
  }

  return (
    <div className="container content-max-width py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your email configuration and blocked senders.
        </p>
      </div>

      <div className="space-y-6">
        {/* Blacklist Manager */}
        <BlacklistManager
          blacklist={blacklist}
          onUnblock={handleUnblock}
          onAddManual={handleAddManual}
        />

        {/* Other settings sections can be added here */}
        <div className="p-6 border rounded-lg bg-muted/30">
          <h3 className="font-semibold mb-2">Email Connection Settings</h3>
          <p className="text-sm text-muted-foreground">
            Future feature: Connect your email accounts (Gmail, Outlook, etc.)
          </p>
        </div>
      </div>
    </div>
  )
}
