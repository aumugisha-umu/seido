'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import type { InvitationStatus } from './types'

interface ContactAccessCardProps {
  invitationStatus: InvitationStatus
  statusBadge: ReactNode
  accessActions: ReactNode
}

/**
 * Card displaying invitation/access status for a contact
 */
export function ContactAccessCard({
  invitationStatus,
  statusBadge,
  accessActions
}: ContactAccessCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <span>Statut d&apos;Accès</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Statut d&apos;invitation</span>
          {statusBadge}
        </div>

        {invitationStatus === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              Ce contact a accès à l&apos;application et peut se connecter
            </p>
          </div>
        )}

        {invitationStatus === 'pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Une invitation a été envoyée à ce contact. Il doit cliquer sur le lien reçu par
              email pour activer son accès.
            </p>
          </div>
        )}

        {invitationStatus === 'expired' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              L&apos;invitation de ce contact a expiré. Vous pouvez en envoyer une nouvelle
              depuis la page de modification.
            </p>
          </div>
        )}

        {invitationStatus === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              L&apos;invitation de ce contact a été annulée. Vous pouvez en envoyer une nouvelle
              depuis la page de modification.
            </p>
          </div>
        )}

        {!invitationStatus && (
          <div className="bg-muted border border-border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              Ce contact existe dans votre base mais n&apos;a pas accès à l&apos;application
            </p>
          </div>
        )}

        {accessActions}
      </CardContent>
    </Card>
  )
}
