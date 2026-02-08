"use client"

/**
 * Notifications Client Component
 * Handles all interactive functionality for notifications page
 * Server Component fetches initial data, this component handles:
 * - Realtime updates
 * - Mark as read/unread
 * - Archive
 * - Filtering
 * - Tab switching
 */

import { useState, useMemo, useCallback } from "react"
import {
  ArrowLeft,
  Bell,
  Check,
  Clock,
  AlertTriangle,
  Info,
  Mail,
  MailOpen,
  Archive,
  Calendar,
  User,
  Users,
  Activity,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import ActivityLog from "@/components/activity-log"
import { ActivityLogFilters, defaultActivityFilters, type ActivityFilters } from "@/components/activity-log-filters"
import { useNotifications, type Notification } from "@/hooks/use-notifications"
import { useActivityLogs } from "@/hooks/use-activity-logs"
import { useRealtimeNotificationsV2 } from "@/hooks/use-realtime-notifications-v2"
import { useToast } from "@/hooks/use-toast"

// ============================================================================
// TYPES
// ============================================================================

interface NotificationsClientProps {
  userId: string
  teamId: string
  initialTeamNotifications: Notification[]
  initialPersonalNotifications: Notification[]
  initialUnreadCount: number
  initialPersonalUnreadCount: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNotificationIcon(type: string) {
  const className = "h-5 w-5 text-primary"

  switch (type) {
    case "intervention":
      return <Bell className={className} />
    case "assignment":
      return <User className={className} />
    case "payment":
      return <Check className={className} />
    case "document":
      return <Info className={className} />
    case "system":
      return <Clock className={className} />
    case "team_invite":
      return <User className={className} />
    case "status_change":
      return <Activity className={className} />
    case "reminder":
      return <Clock className={className} />
    default:
      return <Bell className={className} />
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  })
}

// ============================================================================
// MAIN CLIENT COMPONENT
// ============================================================================

export function NotificationsClient({
  userId,
  teamId,
  initialTeamNotifications,
  initialPersonalNotifications,
  initialUnreadCount,
  initialPersonalUnreadCount
}: NotificationsClientProps) {
  const { toast } = useToast()
  const [updatingNotifications, setUpdatingNotifications] = useState<Set<string>>(new Set())
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>(defaultActivityFilters)

  // Hook pour les notifications d'équipe (with initial data from server)
  const {
    notifications: teamNotifications,
    loading: loadingTeamNotifications,
    error: teamNotificationsError,
    unreadCount,
    refetch: refetchTeamNotifications,
    markAllAsRead: markAllTeamNotificationsAsRead
  } = useNotifications({
    teamId,
    scope: 'team',
    autoRefresh: false,
    initialData: initialTeamNotifications,
    initialUnreadCount: initialUnreadCount
  })

  // Hook pour les notifications personnelles (with initial data from server)
  const {
    notifications: personalNotifications,
    loading: loadingPersonalNotifications,
    error: personalNotificationsError,
    unreadCount: personalUnreadCount,
    refetch: refetchPersonalNotifications,
  } = useNotifications({
    teamId,
    scope: 'personal',
    autoRefresh: false,
    initialData: initialPersonalNotifications,
    initialUnreadCount: initialPersonalUnreadCount
  })

  // Hook pour les logs d'activité avec filtres
  const {
    activities,
    loading: loadingActivities,
    error: activitiesError,
    refetch: refetchActivities
  } = useActivityLogs({
    teamId,
    userId: activityFilters.userId || undefined,
    entityType: activityFilters.entityType || undefined,
    actionType: activityFilters.actionType || undefined,
    status: activityFilters.status || undefined,
    startDate: activityFilters.dateRange.from?.toISOString(),
    endDate: activityFilters.dateRange.to?.toISOString(),
    autoRefresh: true,
    refreshInterval: 60000,
    limit: 100
  })

  // Filtrage texte côté client (recherche instantanée)
  const filteredActivities = useMemo(() => {
    if (!activityFilters.search || !activities) return activities
    const search = activityFilters.search.toLowerCase()
    return activities.filter((a: any) =>
      a.description?.toLowerCase().includes(search) ||
      a.entity_name?.toLowerCase().includes(search) ||
      a.display_context?.toLowerCase().includes(search) ||
      a.user_name?.toLowerCase().includes(search)
    )
  }, [activities, activityFilters.search])

  // Extraire les membres de l'équipe depuis les activités
  const activityTeamMembers = useMemo(() => {
    if (!activities) return []
    const uniqueUsers = new Map<string, { id: string; name: string }>()
    activities.forEach((a: any) => {
      if (a.user_id && a.user_name) {
        uniqueUsers.set(a.user_id, { id: a.user_id, name: a.user_name })
      }
    })
    return Array.from(uniqueUsers.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [activities])

  // Realtime: Écouter les nouvelles notifications via WebSocket
  useRealtimeNotificationsV2({
    enabled: !!userId,
    onInsert: () => {
      refetchTeamNotifications()
      refetchPersonalNotifications()
    },
    onUpdate: () => {
      refetchTeamNotifications()
      refetchPersonalNotifications()
    }
  })

  // Handle marking notification as read/unread (toggle)
  const handleMarkAsRead = useCallback(async (notification: Notification, isPersonal = false) => {
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

      if (isPersonal) {
        await refetchPersonalNotifications()
      } else {
        await refetchTeamNotifications()
      }

      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      toast({
        title: action === 'mark_read' ? "Marquée comme lue" : "Marquée comme non lue",
        description: `La notification "${notification.title}" a été ${action === 'mark_read' ? 'marquée comme lue' : 'marquée comme non lue'}.`,
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
  }, [refetchPersonalNotifications, refetchTeamNotifications, toast])

  // Handle marking all as read
  const handleMarkAllAsRead = useCallback(async () => {
    setMarkingAllAsRead(true)
    try {
      await markAllTeamNotificationsAsRead()
      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      toast({
        title: "Toutes les notifications marquées comme lues",
        description: "Toutes vos notifications ont été marquées comme lues.",
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
  }, [markAllTeamNotificationsAsRead, toast])

  // Handle archiving notification
  const handleArchiveNotification = useCallback(async (notificationId: string, notificationTitle: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to archive notification')
      }

      await Promise.all([
        refetchTeamNotifications(),
        refetchPersonalNotifications()
      ])

      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      toast({
        title: "Notification archivée",
        description: `La notification "${notificationTitle}" a été archivée.`,
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
  }, [refetchTeamNotifications, refetchPersonalNotifications, toast])

  return (
    <div className="layout-padding">
      <div className="content-max-width">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <Link
              href="/gestionnaire/dashboard"
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                Notifications & Activité
              </h1>
              <p className="text-sm text-muted-foreground sm:hidden">
                Notifications et activité
              </p>
            </div>
          </div>

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
                {markingAllAsRead ? 'Marquage...' : 'Marquer tout comme lu'}
              </span>
              <span className="sm:hidden">
                {markingAllAsRead ? 'Marquage...' : 'Marquer tout lu'}
              </span>
              {!markingAllAsRead && (
                <span className="ml-1">({unreadCount})</span>
              )}
            </Button>
          )}
        </div>

        {/* Système d'onglets */}
        <Tabs defaultValue="personal" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger
              value="personal"
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm min-h-[2.5rem] sm:min-h-[3rem] data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Personnel</span>
              {personalUnreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0 h-4 min-w-[1rem] flex items-center justify-center ml-1 bg-destructive">
                  {personalUnreadCount > 9 ? '9+' : personalUnreadCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="team"
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm min-h-[2.5rem] sm:min-h-[3rem] data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Équipe</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0 h-4 min-w-[1rem] flex items-center justify-center ml-1 bg-destructive">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="activity"
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm min-h-[2.5rem] sm:min-h-[3rem] data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Activité</span>
            </TabsTrigger>
          </TabsList>

          {/* Onglet Notifications Équipe */}
          <TabsContent value="team" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  Notifications de l'équipe
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Toutes les notifications concernant votre équipe
                </p>
              </div>
            </div>

            {teamNotificationsError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Erreur lors du chargement des notifications : {teamNotificationsError}
                </AlertDescription>
              </Alert>
            )}

            {loadingTeamNotifications ? (
              <NotificationsLoadingSkeleton count={3} />
            ) : (
              <NotificationsList
                notifications={teamNotifications}
                onMarkAsRead={(notification) => handleMarkAsRead(notification, false)}
                onArchive={(id, title) => handleArchiveNotification(id, title)}
                updatingNotifications={updatingNotifications}
                emptyStateIcon={Bell}
                emptyStateTitle="Aucune notification d'équipe"
                emptyStateDescription="Votre équipe n'a aucune notification pour le moment."
              />
            )}
          </TabsContent>

          {/* Onglet Notifications Personnelles */}
          <TabsContent value="personal" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  Notifications personnelles
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Notifications qui vous sont adressées personnellement
                </p>
              </div>
            </div>

            {personalNotificationsError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Erreur lors du chargement des notifications : {personalNotificationsError}
                </AlertDescription>
              </Alert>
            )}

            {loadingPersonalNotifications ? (
              <NotificationsLoadingSkeleton count={2} />
            ) : (
              <NotificationsList
                notifications={personalNotifications}
                onMarkAsRead={(notification) => handleMarkAsRead(notification, true)}
                onArchive={(id, title) => handleArchiveNotification(id, title)}
                updatingNotifications={updatingNotifications}
                emptyStateIcon={User}
                emptyStateTitle="Aucune notification personnelle"
                emptyStateDescription="Vous n'avez aucune notification personnelle pour le moment."
              />
            )}
          </TabsContent>

          {/* Onglet Log d'Activité */}
          <TabsContent value="activity" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  Journal d'activité
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Historique complet des actions de votre équipe
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refetchActivities}
                className="flex-shrink-0 text-xs sm:text-sm"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Actualiser
              </Button>
            </div>

            <ActivityLogFilters
              filters={activityFilters}
              onFiltersChange={setActivityFilters}
              teamMembers={activityTeamMembers}
              isLoading={loadingActivities}
            />

            <ActivityLog
              activities={filteredActivities}
              loading={loadingActivities}
              error={activitiesError}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function NotificationsLoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
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
  )
}

function NotificationsList({
  notifications,
  onMarkAsRead,
  onArchive,
  updatingNotifications,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateDescription
}: {
  notifications: Notification[]
  onMarkAsRead: (notification: Notification) => void
  onArchive: (id: string, title: string) => void
  updatingNotifications: Set<string>
  emptyStateIcon: any
  emptyStateTitle: string
  emptyStateDescription: string
}) {
  if (notifications.length === 0) {
    return (
      <EmptyNotificationsState
        icon={emptyStateIcon}
        title={emptyStateTitle}
        description={emptyStateDescription}
      />
    )
  }

  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)

  return (
    <div className="space-y-4">
      {unreadNotifications.length > 0 && (
        <div className="space-y-3">
          {unreadNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => onMarkAsRead(notification)}
              onArchive={() => onArchive(notification.id, notification.title)}
              isUpdating={updatingNotifications.has(notification.id)}
            />
          ))}
        </div>
      )}

      {unreadNotifications.length > 0 && readNotifications.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground font-medium">
              Notifications lues
            </span>
          </div>
        </div>
      )}

      {readNotifications.length > 0 && (
        <div className="space-y-3">
          {readNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => onMarkAsRead(notification)}
              onArchive={() => onArchive(notification.id, notification.title)}
              isUpdating={updatingNotifications.has(notification.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onArchive,
  isUpdating = false
}: {
  notification: Notification
  onMarkAsRead?: () => void
  onArchive?: () => void
  isUpdating?: boolean
}) {
  return (
    <Card
      className={`transition-all hover:shadow-md ${!notification.read ? "border-l-4 border-l-primary bg-primary/5" : ""}`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className={`text-sm font-medium truncate ${!notification.read ? "text-foreground" : "text-foreground"}`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-2 sm:mb-3 break-words line-clamp-3">
                  {notification.message}
                </p>

                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full">
                    <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>

                  {notification.created_by_user?.name && (
                    <div className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-full">
                      <User className="h-3 w-3 text-primary flex-shrink-0" />
                      <span className="text-xs text-primary truncate max-w-[80px] sm:max-w-none">
                        {notification.created_by_user.name}
                      </span>
                    </div>
                  )}

                  {notification.related_entity_type && notification.related_entity_id && (
                    <div className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded-full">
                      <Activity className="h-3 w-3 text-secondary-foreground flex-shrink-0" />
                      <span className="text-xs text-secondary-foreground truncate max-w-[60px] sm:max-w-none">
                        {notification.related_entity_type}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 mt-1 sm:mt-0 self-end sm:self-start">
                {onMarkAsRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 sm:h-8 sm:w-8 p-0 ${notification.read ? 'hover:bg-info/10' : 'hover:bg-destructive/10'}`}
                    title={notification.read ? "Marquer comme non lu" : "Marquer comme lu"}
                    onClick={onMarkAsRead}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-muted-foreground" />
                    ) : notification.read ? (
                      <MailOpen className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                    )}
                  </Button>
                )}
                {onArchive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-orange-50"
                    title="Archiver cette notification"
                    onClick={onArchive}
                  >
                    <Archive className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyNotificationsState({
  icon: Icon,
  title,
  description
}: {
  icon: React.ComponentType<any>,
  title: string,
  description: string
}) {
  return (
    <Card className="text-center py-8 sm:py-12">
      <CardContent className="px-4">
        <Icon className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-foreground mb-2 px-2">{title}</h3>
        <p className="text-sm sm:text-base text-muted-foreground px-2 max-w-md mx-auto">{description}</p>
      </CardContent>
    </Card>
  )
}
