'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Trash2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
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
    const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDeleteClick = (connectionId: string) => {
        setConnectionToDelete(connectionId)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!connectionToDelete) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/emails/connections/${connectionToDelete}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete connection')
            }

            toast.success('Email connection deleted')
            onConnectionDeleted?.()
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete connection')
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setConnectionToDelete(null)
        }
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
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                        No email connections configured yet. Add one to get started.
                    </p>
                </CardContent>
            </Card>
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
                                    <CardDescription>
                                        {getProviderName(connection.provider)}
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
                                        onClick={() => handleDeleteClick(connection.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Email Connection?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the email connection. Your existing emails will not be deleted,
                            but new emails will no longer be synced from this account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
