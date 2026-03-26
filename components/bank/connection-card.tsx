'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreVertical, RefreshCw, Ban, Trash2, ExternalLink } from 'lucide-react'
import type { BankConnectionSafe, AccountPurpose, BankConnectionSyncStatus } from '@/lib/types/bank.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Jamais synchronise'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "A l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

function formatBalance(balance: number | null, currency: string): string {
  if (balance === null) return '\u2014'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(balance)
}

const PURPOSE_CONFIG: Record<AccountPurpose, { label: string; className: string }> = {
  operating: {
    label: 'Compte courant',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  client_funds: {
    label: 'Fonds clients',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  security_deposits: {
    label: 'Depot de garantie',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
}

const SYNC_STATUS_CONFIG: Record<BankConnectionSyncStatus, { label: string; dotClassName: string }> = {
  active: { label: 'Synchronise', dotClassName: 'bg-green-500' },
  error: { label: 'Erreur', dotClassName: 'bg-red-500' },
  disconnected: { label: 'Deconnecte', dotClassName: 'bg-amber-500' },
  blacklisted: { label: 'Liste noire', dotClassName: 'bg-gray-400' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ConnectionCardProps {
  connection: BankConnectionSafe
  onDelete?: () => void
  onBlacklistToggle?: () => void
}

export function ConnectionCard({ connection, onDelete, onBlacklistToggle }: ConnectionCardProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTogglingBlacklist, setIsTogglingBlacklist] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const purposeConfig = PURPOSE_CONFIG[connection.account_purpose]
  const syncConfig = SYNC_STATUS_CONFIG[connection.sync_status]

  // --- Handlers ---

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connection.id }),
      })
      if (!res.ok) throw new Error('Sync failed')
      router.refresh()
    } finally {
      setIsSyncing(false)
    }
  }

  const handleBlacklistToggle = async () => {
    setIsTogglingBlacklist(true)
    try {
      const res = await fetch(`/api/bank/connections/${connection.id}/blacklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blacklisted: !connection.is_blacklisted }),
      })
      if (!res.ok) throw new Error('Blacklist toggle failed')
      router.refresh()
      onBlacklistToggle?.()
    } finally {
      setIsTogglingBlacklist(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/bank/connections/${connection.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      router.refresh()
      onDelete?.()
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleReauthorize = () => {
    window.location.href = '/api/bank/oauth/authorize'
  }

  // --- Render ---

  return (
    <>
      <Card className="flex flex-col" data-testid={`connection-card-${connection.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{connection.bank_name}</CardTitle>
              <CardDescription className="truncate">
                {connection.account_name ?? 'Compte'}
              </CardDescription>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" aria-label="Actions du compte">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSync} disabled={isSyncing}>
                  <RefreshCw className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Synchroniser maintenant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlacklistToggle} disabled={isTogglingBlacklist}>
                  <Ban className="size-4" />
                  {connection.is_blacklisted ? 'Retirer de la liste noire' : 'Liste noire'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          {/* IBAN */}
          <div className="text-sm text-muted-foreground">
            {connection.iban_last4 ? `\u2022\u2022\u2022\u2022 ${connection.iban_last4}` : 'IBAN non disponible'}
          </div>

          {/* Balance */}
          <div className="text-2xl font-semibold text-foreground">
            {formatBalance(connection.balance, connection.currency)}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={purposeConfig.className}>
              {purposeConfig.label}
            </Badge>

            <Badge variant="outline" className="gap-1.5">
              <span className={`size-2 rounded-full ${syncConfig.dotClassName}`} aria-hidden="true" />
              {syncConfig.label}
            </Badge>
          </div>

          {/* Sync error message */}
          {connection.sync_status === 'error' && connection.sync_error_message && (
            <p className="text-xs text-destructive" role="alert">
              {connection.sync_error_message}
            </p>
          )}

          {/* Re-auth CTA for disconnected */}
          {connection.sync_status === 'disconnected' && (
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleReauthorize}>
              <ExternalLink className="size-3.5" />
              Re-autoriser
            </Button>
          )}
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground">
          {formatRelativeTime(connection.last_sync_at)}
        </CardFooter>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte bancaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte {connection.bank_name}
              {connection.account_name ? ` (${connection.account_name})` : ''} sera
              deconnecte. Les transactions deja importees seront conservees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
