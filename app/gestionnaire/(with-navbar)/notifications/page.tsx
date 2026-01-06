"use client"

import { useState, useEffect, useMemo } from "react"
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
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useToast } from "@/hooks/use-toast"


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
  
  // Use a consistent format that doesn't depend on current time for SSR/hydration
  return date.toLocaleDateString("fr-FR", { 
    day: "numeric", 
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { toast } = useToast()
  const [userTeam, setUserTeam] = useState<any>(null)
  const [updatingNotifications, setUpdatingNotifications] = useState<Set<string>>(new Set())
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  // ✅ Fix hydration: Ne render conditionnel qu'après montage client
  const [isMounted, setIsMounted] = useState(false)
  // State pour les filtres du journal d'activité
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>(defaultActivityFilters)

  // Hook pour les notifications d'équipe (activité des collègues)
  const {
    notifications: teamNotifications,
    loading: loadingTeamNotifications,
    error: teamNotificationsError,
    unreadCount,
    refetch: refetchTeamNotifications,
    markAsRead: markTeamNotificationAsRead,
    markAllAsRead: markAllTeamNotificationsAsRead
  } = useNotifications({
    teamId: userTeam?.id,
    scope: 'team', // Notifications des collègues pour information
    autoRefresh: false, // ✅ Désactivé - Realtime gère les mises à jour
  })

  // Hook pour les notifications personnelles (qui me sont adressées directement)
  const {
    notifications: personalNotifications,
    loading: loadingPersonalNotifications,
    error: personalNotificationsError,
    unreadCount: personalUnreadCount,
    refetch: refetchPersonalNotifications,
    markAsRead: markPersonalNotificationAsRead
  } = useNotifications({
    teamId: userTeam?.id,
    scope: 'personal', // Mes notifications personnelles
    autoRefresh: false, // ✅ Désactivé - Realtime gère les mises à jour
  })

  // Hook pour les logs d'activité avec filtres
  const {
    activities,
    loading: loadingActivities,
    error: activitiesError,
    refetch: refetchActivities
  } = useActivityLogs({
    teamId: userTeam?.id,
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

  // Extraire les membres de l'équipe depuis les activités (pour le dropdown)
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

  // ✅ Realtime: Écouter les nouvelles notifications via WebSocket
  // Remplace le polling toutes les 30s par des mises à jour instantanées
  useRealtimeNotificationsV2({
    enabled: !!user?.id,
    onInsert: () => {
      // Nouvelle notification reçue → rafraîchir les deux listes
      refetchTeamNotifications()
      refetchPersonalNotifications()
    },
    onUpdate: () => {
      // Notification modifiée (ex: marquée lue) → rafraîchir
      refetchTeamNotifications()
      refetchPersonalNotifications()
    }
  })

  // ✅ Marquer comme monté après hydratation
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Récupérer l'équipe de l'utilisateur via API
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
  const handleMarkAsRead = async (notification: Notification, isPersonal = false) => {
    // Add loading state
    setUpdatingNotifications(prev => new Set(prev).add(notification.id))
    
    try {
      const action = notification.read ? 'mark_unread' : 'mark_read'
      
      const response = await fetch(`/api/notifications?id=${notification.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle notification read status')
      }

      // Refresh data by calling the appropriate refetch functions
      if (isPersonal) {
        await refetchPersonalNotifications()
      } else {
        await refetchTeamNotifications()
      }

      // Notifier les autres composants (notamment le header)
      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      // Show success toast
      toast({
        title: action === 'mark_read' ? "✓ Marquée comme lue" : "✉️ Marquée comme non lue",
        description: `La notification "${notification.title}" a été ${action === 'mark_read' ? 'marquée comme lue' : 'marquée comme non lue'}.`,
        variant: "success",
      })
    } catch (error) {
      console.error('Error toggling notification read status:', error)
      toast({
        title: "❌ Erreur",
        description: "Impossible de modifier le statut de la notification. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      // Remove loading state
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
      await markAllTeamNotificationsAsRead()
      
      // Notifier les autres composants (notamment le header)
      window.dispatchEvent(new CustomEvent('notificationUpdated'))
      
      // Show success toast
      toast({
        title: "✅ Toutes les notifications marquées comme lues",
        description: "Toutes vos notifications ont été marquées comme lues avec succès.",
        variant: "success",
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      
      // Show error toast
      toast({
        title: "❌ Erreur",
        description: "Impossible de marquer toutes les notifications comme lues. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  // Handle archiving notification
  const handleArchiveNotification = async (notificationId: string, notificationTitle: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'archive'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to archive notification')
      }

      // Refresh both notification lists
      await Promise.all([
        refetchTeamNotifications(),
        refetchPersonalNotifications()
      ])

      // Notifier les autres composants (notamment le header)
      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      // Show success toast
      toast({
        title: "🗃️ Notification archivée",
        description: `La notification "${notificationTitle}" a été archivée avec succès.`,
        variant: "success",
      })
    } catch (error) {
      console.error('Error archiving notification:', error)
      toast({
        title: "❌ Erreur",
        description: "Impossible d'archiver la notification. Veuillez réessayer.",
        variant: "destructive",
      })
    }
  }

  // ✅ Afficher un état de chargement pendant l'hydratation OU si teamStatus est 'checking'
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
              href="/gestionnaire/dashboard" 
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                Notifications & Activite
              </h1>
              <p className="text-sm text-muted-foreground sm:hidden">
                Notifications et activite
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
                  Notifications de l'equipe
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Toutes les notifications concernant votre equipe
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
                  Notifications qui vous sont adressees personnellement
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
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
              <CardContent className="p-4">
                      <div className="animate-pulse space-y-3">
                <div className="flex items-start space-x-3">
                          <Skeleton className="h-5 w-5 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                  Journal d'activite
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Historique complet des actions de votre equipe
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refetchActivities}
                className="flex-shrink-0 text-xs sm:text-sm"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Actualiser</span>
                <span className="sm:hidden">Actualiser</span>
              </Button>
            </div>

            {/* Barre de recherche et filtres */}
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

// Composant pour organiser les notifications par statut lu/non lu
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

  // Séparer les notifications lues et non lues
  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)

  return (
    <div className="space-y-4">
      {/* Notifications non lues */}
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

      {/* Séparation visuelle si on a des notifications lues et non lues */}
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

      {/* Notifications lues */}
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

// Composant pour les cartes de notification (extrait pour réutilisation)
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
                {/* Titre et badges */}
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
                
                {/* Message */}
                <p className="text-sm text-muted-foreground mb-2 sm:mb-3 break-words line-clamp-3">
                  {notification.message}
                </p>

                {/* Métadonnées */}
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

              {/* Actions */}
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

// Composant pour les états vides
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
