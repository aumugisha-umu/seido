'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Ban, Trash2, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { BlacklistEntry } from './types'

interface BlacklistManagerProps {
  blacklist: BlacklistEntry[]
  onUnblock: (blacklistId: string) => void
  onAddManual: () => void
}

export function BlacklistManager({
  blacklist,
  onUnblock,
  onAddManual
}: BlacklistManagerProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleUnblock = async (id: string, email: string) => {
    setLoading(id)
    try {
      onUnblock(id)
      toast.success(`${email} débloqué`)
    } catch (error) {
      toast.error('Échec du déblocage de l\'expéditeur')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {blacklist.length} expéditeur{blacklist.length !== 1 ? 's' : ''} bloqué{blacklist.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={onAddManual} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter manuellement
        </Button>
      </div>

      {blacklist.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Ban className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun expéditeur bloqué pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blacklist.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {entry.sender_domain ? `@${entry.sender_domain}` : entry.sender_email}
                  </span>
                  {entry.sender_domain && (
                    <Badge variant="secondary" className="text-xs h-5">
                      Domaine entier
                    </Badge>
                  )}
                </div>

                {entry.reason && (
                  <p className="text-sm text-muted-foreground mb-1">
                    Raison : {entry.reason}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Bloqué par : {entry.is_current_user ? 'Vous' : entry.blocked_by_user_name}
                  {' • '}
                  {formatDistanceToNow(new Date(entry.created_at), {
                    addSuffix: true,
                    locale: fr
                  })}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnblock(entry.id, entry.sender_email || entry.sender_domain || '')}
                disabled={loading === entry.id}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Débloquer
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
