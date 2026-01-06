"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotifications, type Notification } from "@/hooks/use-notifications"
import { useRealtimeNotificationsV2 } from "@/hooks/use-realtime-notifications-v2"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useToast } from "@/hooks/use-toast"
import { NotificationsList } from "./notifications-list"

export interface PersonalNotificationsPageProps {
  /** URL to navigate back to (e.g., "/locataire/dashboard" or "/prestataire/dashboard") */
  backHref: string
  /** Page title (default: "Notifications") */
  title?: string
  /** Page subtitle (default: "Vos notifications personnelles") */
  subtitle?: string
}

/**
 * Shared personal notifications page component for locataire and prestataire roles.
 * Features:
 * - Personal notifications only (scope: 'personal')
 * - Realtime updates via WebSocket
 * - Mark as read/unread, archive actions
 * - Loading skeleton, error states
 * - Responsive design
 */
export function PersonalNotificationsPage({
  backHref,
  title = "Notifications",
  subtitle = "Vos notifications personnelles",
}: PersonalNotificationsPageProps) {
  const { user } = useAuth()
  const { teamStatus } = useTeamStatus()
  const { toast } = useToast()
  const [userTeam, setUserTeam] = useState<any>(null)
  const [updatingNotifications, setUpdatingNotifications] = useState<Set<string>>(new Set())
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Hook for personal notifications only
  const {
    notifications,
    loading,
    error,
    unreadCount,
    refetch,
    markAllAsRead
  } = useNotifications({
    teamId: userTeam?.id,
    scope: 'personal',
    autoRefresh: false, // Realtime handles updates
  })

  // Realtime: Listen for new notifications via WebSocket
  useRealtimeNotificationsV2({
    enabled: !!user?.id,
    onInsert: () => refetch(),
    onUpdate: () => refetch()
  })

  // Mark as mounted after hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch user's team via API
  useEffect(() => {
    const fetchUserTeam = async () => {
      if (!user?.id || teamStatus !== 'verified') return

      try {
        const response = await fetch('/api/user-teams')
        if (!response.ok) throw new Error('Failed to fetch user teams')
        const result = await response.json()
        if (result.success && result.data && result.data.length > 0) {
          setUserTeam(result.data[0])
        }
      } catch (error) {
        console.error('Error fetching user team:', error)
      }
    }

    fetchUserTeam()
  }, [user?.id, teamStatus])

  // Handle marking notification as read/unread (toggle)
  const handleMarkAsRead = async (notification: Notification) => {
    setUpdatingNotifications(prev => new Set(prev).add(notification.id))

    try {
      const action = notification.read ? 'mark_unread' : 'mark_read'

      const response = await fetch(`/api/notifications?id=${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle notification read status')
      }

      await refetch()
      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      toast({
        title: action === 'mark_read' ? "Marquée comme lue" : "Marquée comme non lue",
        variant: "success",
      })
    } catch (error) {
      console.error('Error toggling notification read status:', error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut de la notification.",
        variant: "destructive",
      })
    } finally {
      setUpdatingNotifications(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.id)
        return newSet
      })
    }
  }

  // Handle marking all as read
  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true)
    try {
      await markAllAsRead()
      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      toast({
        title: "Toutes les notifications marquées comme lues",
        variant: "success",
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: "Erreur",
        description: "Impossible de marquer toutes les notifications comme lues.",
        variant: "destructive",
      })
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  // Handle archiving notification
  const handleArchiveNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive notification')
      }

      await refetch()
      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      toast({
        title: "Notification archivée",
        variant: "success",
      })
    } catch (error) {
      console.error('Error archiving notification:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'archiver la notification.",
        variant: "destructive",
      })
    }
  }

  // Show loading state during hydration
  if (!isMounted || teamStatus === 'checking') {
    return (
      <div className="layout-padding">
        <div className="content-max-width">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="layout-padding">
      <div className="content-max-width">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <Link
              href={backHref}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="flex-shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markingAllAsRead}
                className="flex-shrink-0 text-xs sm:text-sm"
              >
                {markingAllAsRead && (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                )}
                <span className="hidden sm:inline">
                  {markingAllAsRead ? 'Marquage...' : 'Tout marquer comme lu'}
                </span>
                <span className="sm:hidden">
                  {markingAllAsRead ? '...' : 'Tout lu'}
                </span>
                {!markingAllAsRead && (
                  <span className="ml-1">({unreadCount})</span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Section title */}
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Notifications personnelles
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Notifications qui vous sont adressées personnellement
          </p>
        </div>

        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des notifications : {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-start space-x-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <div className="flex space-x-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <NotificationsList
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onArchive={handleArchiveNotification}
            updatingNotifications={updatingNotifications}
          />
        )}
      </div>
    </div>
  )
}
