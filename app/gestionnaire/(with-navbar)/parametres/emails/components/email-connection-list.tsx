'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
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
import { Trash2, RefreshCw, CheckCircle2, XCircle, Clock, Shield, Key, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'

interface EmailConnection {
    id: string
    provider: string
    email_address: string
    is_active: boolean
    last_sync_at: string | null
    last_error: string | null
    sync_from_date: string | null
    created_at: string
    email_count?: number
    auth_method?: 'password' | 'oauth'
    oauth_token_expires_at?: string | null
}

interface EmailConnectionListProps {
    connections: EmailConnection[]
    onConnectionDeleted?: () => void
}

export function EmailConnectionList({
    connections,
    onConnectionDeleted,
}: EmailConnectionListProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [connectionToDelete, setConnectionToDelete] = useState<EmailConnection | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteEmails, setDeleteEmails] = useState(false)

    // Reset deleteEmails when dialog closes
    useEffect(() => {
        if (!deleteDialogOpen) {
            setDeleteEmails(false)
        }
    }, [deleteDialogOpen])

    const handleDeleteClick = (connection: EmailConnection) => {
        setConnectionToDelete(connection)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!connectionToDelete) return

        setIsDeleting(true)
        try {
            // Pour OAuth, utiliser la route de révocation
            if (connectionToDelete.auth_method === 'oauth') {
                const response = await fetch('/api/emails/oauth/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        connectionId: connectionToDelete.id,
                        deleteEmails: deleteEmails
                    }),
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Échec de la révocation OAuth')
                }

                const successMessage = deleteEmails
                    ? 'Accès OAuth révoqué, connexion et emails supprimés'
                    : 'Accès OAuth révoqué et connexion supprimée'
                toast.success(successMessage)
            } else {
                // Pour les connexions par mot de passe
                const response = await fetch(`/api/emails/connections/${connectionToDelete.id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deleteEmails: deleteEmails }),
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Échec de la suppression')
                }

                const successMessage = deleteEmails
                    ? 'Connexion et emails supprimés'
                    : 'Connexion email supprimée'
                toast.success(successMessage)
            }

            onConnectionDeleted?.()
        } catch (error: any) {
            toast.error(error.message || 'Échec de la suppression')
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setConnectionToDelete(null)
        }
    }

    // Vérifie si le token OAuth est proche de l'expiration
    const isTokenExpiringSoon = (expiresAt: string | null | undefined): boolean => {
        if (!expiresAt) return false
        const expiryDate = new Date(expiresAt)
        const now = new Date()
        const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        return hoursUntilExpiry < 1 && hoursUntilExpiry > 0
    }

    // Badge pour la méthode d'authentification
    const getAuthMethodBadge = (connection: EmailConnection) => {
        if (connection.auth_method === 'oauth') {
            const isExpiringSoon = isTokenExpiringSoon(connection.oauth_token_expires_at)
            return (
                <Badge variant="outline" className="gap-1 text-xs">
                    <Shield className="h-3 w-3" />
                    OAuth
                    {isExpiringSoon && (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    )}
                </Badge>
            )
        }
        return (
            <Badge variant="outline" className="gap-1 text-xs">
                <Key className="h-3 w-3" />
                IMAP
            </Badge>
        )
    }

    const handleTestConnection = async (connectionId: string) => {
        toast.promise(
            fetch(`/api/emails/connections/${connectionId}/test`, {
                method: 'POST',
            }).then(async (response) => {
                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Connection test failed')
                }
                return response.json()
            }),
            {
                loading: 'Testing connection...',
                success: 'Connection test successful!',
                error: (err) => err.message || 'Connection test failed',
            }
        )
    }

    const handleSyncConnection = async (connectionId: string) => {
        toast.promise(
            fetch(`/api/emails/connections/${connectionId}/sync`, {
                method: 'POST',
            }).then(async (response) => {
                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Sync failed')
                }
                const data = await response.json()
                if (data.result.status === 'no_new_emails') {
                    return 'No new emails found'
                }
                return `Synced ${data.result.count} new emails`
            }),
            {
                loading: 'Syncing emails...',
                success: (data) => data,
                error: (err) => err.message || 'Sync failed',
            }
        )
    }

    const getStatusBadge = (connection: EmailConnection) => {
        if (connection.last_error) {
            return (
                <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Error
                </Badge>
            )
        }
        if (connection.is_active) {
            return (
                <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                </Badge>
            )
        }
        return (
            <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Inactive
            </Badge>
        )
    }

    const getProviderName = (provider: string) => {
        const providerMap: Record<string, string> = {
            gmail: 'Gmail',
            outlook: 'Outlook',
            yahoo: 'Yahoo',
            custom: 'Custom',
        }
        return providerMap[provider] || provider
    }

    if (connections.length === 0) {
        return (
            <div className="py-8">
                <p className="text-center text-muted-foreground">
                    Aucune connexion email configurée. Ajoutez-en une pour commencer.
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-4">
                {connections.map((connection) => (
                    <Card key={connection.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">{connection.email_address}</CardTitle>
                                    <CardDescription className="flex items-center gap-2">
                                        {getProviderName(connection.provider)}
                                        {getAuthMethodBadge(connection)}
                                    </CardDescription>
                                </div>
                                {getStatusBadge(connection)}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {/* Last Sync */}
                                {connection.last_sync_at && (
                                    <div className="text-sm text-muted-foreground">
                                        Last synced{' '}
                                        {formatDistanceToNow(new Date(connection.last_sync_at), {
                                            addSuffix: true,
                                        })}
                                    </div>
                                )}

                                {/* Email Count */}
                                {connection.email_count !== undefined && (
                                    <div className="text-sm font-medium text-primary">
                                        📧 {connection.email_count} email{connection.email_count !== 1 ? 's' : ''} synchronized
                                    </div>
                                )}

                                {/* Sync From Date */}
                                {connection.sync_from_date && (
                                    <div className="text-sm text-muted-foreground">
                                        Syncing emails from{' '}
                                        {format(new Date(connection.sync_from_date), 'PPP')}
                                    </div>
                                )}

                                {/* Error Message */}
                                {connection.last_error && (
                                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                        {connection.last_error}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSyncConnection(connection.id)}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Sync Now
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTestConnection(connection.id)}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Test
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteClick(connection)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {connection.auth_method === 'oauth' ? 'Révoquer' : 'Supprimer'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Delete/Revoke Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {connectionToDelete?.auth_method === 'oauth'
                                ? 'Révoquer l\'accès OAuth ?'
                                : 'Supprimer la connexion email ?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    {connectionToDelete?.auth_method === 'oauth' ? (
                                        <>
                                            Cette action va révoquer l'accès OAuth chez Google et supprimer la connexion.
                                            Les nouveaux emails ne seront plus synchronisés.
                                            Vous pourrez reconnecter ce compte à tout moment.
                                        </>
                                    ) : (
                                        <>
                                            Cette action supprimera la connexion email.
                                            Les nouveaux emails ne seront plus synchronisés depuis ce compte.
                                        </>
                                    )}
                                </p>

                                {/* Checkbox pour supprimer les emails */}
                                <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg border">
                                    <Checkbox
                                        id="delete-emails"
                                        checked={deleteEmails}
                                        onCheckedChange={(checked) => setDeleteEmails(checked === true)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label
                                            htmlFor="delete-emails"
                                            className="text-sm font-medium cursor-pointer"
                                        >
                                            Supprimer également les {connectionToDelete?.email_count || 0} emails synchronisés
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Si décoché, les emails resteront accessibles mais ne seront plus liés à cette connexion
                                        </p>
                                    </div>
                                </div>

                                {/* Message d'avertissement si suppression activée */}
                                {deleteEmails && (
                                    <p className="text-destructive text-sm font-medium flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Les {connectionToDelete?.email_count || 0} emails seront définitivement supprimés
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting
                                ? 'Suppression...'
                                : connectionToDelete?.auth_method === 'oauth'
                                    ? 'Révoquer l\'accès'
                                    : 'Supprimer'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
