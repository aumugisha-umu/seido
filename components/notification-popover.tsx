"use client"

import { useState } from "react"
import Link from "next/link"
import { useNavigationPending } from "@/hooks/use-navigation-pending"
import {
  Bell,
  Mail,
  MailOpen,
  Loader2,
  CheckCircle,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import {
  getRelativeTime,
  getNotificationIcon,
  truncateText,
  getNotificationNavigationUrl
} from "@/lib/notification-utils"
import type { Notification } from "@/hooks/use-notification-popover"

interface NotificationPopoverProps {
  notifications: Notification[]
  loading: boolean
  error: string | null
  onMarkAsRead: (id: string) => Promise<void>
  onMarkAsUnread: (id: string) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
  role: string
  onClose?: () => void
  unreadCount?: number
}

export default function NotificationPopover({
  notifications,
  loading,
  error,
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAllAsRead,
  role,
  onClose,
  unreadCount
}: NotificationPopoverProps) {
  const { isPending, navigate } = useNavigationPending()
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)

  const handleNotificationClick = async (notification: Notification, e: React.MouseEvent) => {
    // Ne pas déclencher la navigation si on clique sur les boutons d'action
    const target = e.target as HTMLElement
    if (target.closest('button')) {
      return
    }

    // Protection contre le double-clic pendant la navigation
    if (isPending) {
      return
    }

    // Obtenir l'URL de navigation
    const navigationUrl = getNotificationNavigationUrl(notification, role as 'gestionnaire' | 'locataire' | 'prestataire' | 'admin')

    if (navigationUrl) {
      // Marquer comme lu si non lu
      if (!notification.read) {
        try {
          await onMarkAsRead(notification.id)
        } catch (error) {
          logger.error({ error }, '[NotificationPopover] Error marking notification as read')
        }
      }

      // Fermer le popover
      onClose?.()

      // Naviguer vers la page de détail (avec protection useTransition)
      navigate(navigationUrl)
    }
  }

  const handleMarkAsRead = async (notification: Notification) => {
    if (processingIds.has(notification.id)) return

    setProcessingIds(prev => new Set(prev).add(notification.id))
    try {
      if (notification.read) {
        await onMarkAsUnread(notification.id)
      } else {
        await onMarkAsRead(notification.id)
      }
    } catch (error) {
      logger.error({ error }, '[NotificationPopover] Error toggling read status')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.id)
        return newSet
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true)
    try {
      await onMarkAllAsRead()
    } catch (error) {
      logger.error({ error }, '[NotificationPopover] Error marking all as read')
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  const unreadNotifications = notifications.filter(n => !n.read)
  const displayUnreadCount = unreadCount ?? unreadNotifications.length
  const hasUnread = displayUnreadCount > 0
  const displayedNotifications = unreadNotifications

  return (
    <div className="w-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="h-5 w-5 text-slate-700 flex-shrink-0" />
            <h3 className="font-semibold text-slate-900 truncate">Notifications</h3>
            {hasUnread && (
              <Badge variant="default" className="h-5 px-1.5 text-xs bg-blue-600">
                {displayUnreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasUnread && !loading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markingAllAsRead}
                className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                {markingAllAsRead ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Marquage...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Tout marquer lu
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-3" />
          <p className="text-sm text-slate-500">Chargement des notifications...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
            <Bell className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      ) : displayedNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Bell className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            Aucune notification non lue
          </p>
          <p className="text-xs text-slate-500 text-center">
            Vous êtes à jour !
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {displayedNotifications.map((notification) => {
              const { icon: Icon, className: iconClassName } = getNotificationIcon(
                notification.type
              )
              const isProcessing = processingIds.has(notification.id)

              return (
                <div
                  key={notification.id}
                  onClick={(e) => handleNotificationClick(notification, e)}
                  className={cn(
                    "p-3 transition-colors hover:bg-slate-50 cursor-pointer",
                    !notification.read && "bg-blue-50/30"
                  )}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100">
                      <Icon className={cn("h-4 w-4", iconClassName)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={cn(
                          "text-sm font-medium leading-tight line-clamp-2",
                          notification.read ? "text-slate-700" : "text-slate-900"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
                        )}
                      </div>

                      {/* Message preview */}
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                        {truncateText(notification.message, 80)}
                      </p>

                      {/* Meta info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">
                          {getRelativeTime(notification.created_at)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification)}
                          disabled={isProcessing}
                          className="h-7 px-2 text-xs hover:bg-slate-100"
                          title={notification.read ? "Marquer comme non lu" : "Marquer comme lu"}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : notification.read ? (
                            <MailOpen className="h-3 w-3" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {!loading && notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Link
              href={`/${role}/notifications`}
              onClick={() => onClose?.()}
              className="block"
            >
              <Button
                variant="outline"
                className="w-full justify-between hover:bg-slate-50"
                size="sm"
              >
                <span>Voir toutes les notifications</span>
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
