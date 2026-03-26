'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectionCard } from '@/components/bank/connection-card'
import type { BankConnectionSafe } from '@/lib/types/bank.types'

interface ComptesTabProps {
  connections: BankConnectionSafe[]
}

export function ComptesTab({ connections }: ComptesTabProps) {
  const handleConnect = () => {
    window.location.href = '/api/bank/oauth/authorize'
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {connections.length} compte{connections.length > 1 ? 's' : ''} connecte{connections.length > 1 ? 's' : ''}
        </h3>
        <Button size="sm" className="gap-2" onClick={handleConnect}>
          <Plus className="size-4" />
          Connecter un compte
        </Button>
      </div>

      {/* Grid or empty message */}
      {connections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun compte bancaire connecte. Cliquez sur le bouton ci-dessus pour commencer.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {connections.map((connection) => (
            <ConnectionCard key={connection.id} connection={connection} />
          ))}
        </div>
      )}
    </div>
  )
}
