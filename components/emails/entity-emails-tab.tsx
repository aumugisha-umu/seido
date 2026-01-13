'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Mail,
    Send,
    ArrowDownLeft,
    ExternalLink,
    Unlink,
    ChevronRight,
    RefreshCw,
    AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import {
    EmailLinkEntityType,
    LinkedEmail,
    EMAIL_LINK_DISPLAY_CONFIG
} from '@/lib/types/email-links'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'

interface EntityEmailsTabProps {
    entityType: EmailLinkEntityType
    entityId: string
    entityName: string
}

export function EntityEmailsTab({
    entityType,
    entityId,
    entityName
}: EntityEmailsTabProps) {
    const [emails, setEmails] = useState<LinkedEmail[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [totalCount, setTotalCount] = useState(0)
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [unlinkEmailId, setUnlinkEmailId] = useState<string | null>(null)
    const [isUnlinking, setIsUnlinking] = useState(false)

    const LIMIT = 10

    const fetchEmails = useCallback(async (isLoadMore = false) => {
        if (!isLoadMore) {
            setIsLoading(true)
            setError(null)
        }

        try {
            const currentOffset = isLoadMore ? offset : 0
            const response = await fetch(
                `/api/entities/${entityType}/${entityId}/emails?limit=${LIMIT}&offset=${currentOffset}`
            )

            if (!response.ok) {
                throw new Error('Échec du chargement des emails')
            }

            const data = await response.json()

            if (isLoadMore) {
                setEmails(prev => [...prev, ...data.emails])
            } else {
                setEmails(data.emails)
            }

            setTotalCount(data.pagination.total)
            setHasMore(data.pagination.hasMore)
            setOffset(currentOffset + LIMIT)
        } catch (err: any) {
            console.error('Fetch emails error:', err)
            setError(err.message || 'Erreur lors du chargement des emails')
        } finally {
            setIsLoading(false)
        }
    }, [entityType, entityId, offset])

    useEffect(() => {
        fetchEmails(false)
    }, [entityType, entityId]) // Reset when entity changes

    const handleUnlink = async () => {
        if (!unlinkEmailId) return

        setIsUnlinking(true)
        try {
            const response = await fetch(
                `/api/entities/${entityType}/${entityId}/emails?email_id=${unlinkEmailId}`,
                { method: 'DELETE' }
            )

            if (!response.ok) {
                throw new Error('Échec de la suppression du lien')
            }

            // Remove from local state
            setEmails(prev => prev.filter(e => e.id !== unlinkEmailId))
            setTotalCount(prev => prev - 1)
            toast.success('Lien supprimé')
        } catch (err: any) {
            console.error('Unlink error:', err)
            toast.error(err.message || 'Erreur lors de la suppression du lien')
        } finally {
            setIsUnlinking(false)
            setUnlinkEmailId(null)
        }
    }

    const config = EMAIL_LINK_DISPLAY_CONFIG[entityType]

    if (isLoading && emails.length === 0) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-destructive font-medium">{error}</p>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => fetchEmails(false)}
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer
                </Button>
            </div>
        )
    }

    if (emails.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">
                    Aucun email lié à {config.label.toLowerCase()} "{entityName}"
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                    Les emails peuvent être liés depuis la page Emails
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">
                        {totalCount} email{totalCount > 1 ? 's' : ''} lié{totalCount > 1 ? 's' : ''}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setOffset(0)
                        fetchEmails(false)
                    }}
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Email List */}
            <ScrollArea className="flex-1">
                <div className="divide-y">
                    {emails.map((email) => (
                        <div
                            key={email.id}
                            className="group p-4 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                {/* Direction Icon */}
                                <div className={`
                                    mt-1 p-1.5 rounded-full flex-shrink-0
                                    ${email.direction === 'received'
                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                        : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                                    }
                                `}>
                                    {email.direction === 'received' ? (
                                        <ArrowDownLeft className="h-3 w-3" />
                                    ) : (
                                        <Send className="h-3 w-3" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Subject */}
                                    <p className="font-medium text-sm truncate">
                                        {email.subject || '(Sans sujet)'}
                                    </p>

                                    {/* Sender & Date */}
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <span className="truncate">{email.from_address}</span>
                                        <span>•</span>
                                        <span className="whitespace-nowrap">
                                            {format(
                                                new Date(email.received_at || email.sent_at || Date.now()),
                                                'dd MMM yyyy',
                                                { locale: fr }
                                            )}
                                        </span>
                                    </div>

                                    {/* Snippet */}
                                    {email.snippet && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {email.snippet}
                                        </p>
                                    )}

                                    {/* Linked info */}
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Lié le {format(new Date(email.link.linked_at), 'dd/MM/yyyy', { locale: fr })}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <Link href={`/gestionnaire/mail?email=${email.id}`}>
                                        <Button variant="ghost" size="sm">
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setUnlinkEmailId(email.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Unlink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Load More */}
                {hasMore && (
                    <div className="p-4 text-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchEmails(true)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <ChevronRight className="h-4 w-4 mr-2" />
                            )}
                            Charger plus
                        </Button>
                    </div>
                )}
            </ScrollArea>

            {/* Unlink Confirmation Dialog */}
            <AlertDialog open={!!unlinkEmailId} onOpenChange={(open) => !open && setUnlinkEmailId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le lien ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            L'email ne sera plus associé à {config.label.toLowerCase()} "{entityName}".
                            L'email lui-même ne sera pas supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUnlinking}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUnlink}
                            disabled={isUnlinking}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isUnlinking ? 'Suppression...' : 'Supprimer le lien'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
