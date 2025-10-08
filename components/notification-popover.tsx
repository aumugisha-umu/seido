"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Bell,
  Eye,
  EyeOff,
  Archive,
  Loader2,
  CheckCircle,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  getRelativeTime,
  getNotificationIcon,
  truncateText,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/notification-utils"
import type { Notification } from "@/hooks/use-notification-popover"

interface NotificationPopoverProps {
  notifications: Notification[]
  loading: boolean
  error: string | null
  onMarkAsRead: (id: string) => Promise<void>
  onMarkAsUnread: (id: string) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
  role: string
  onClose?: () => void
}

export default function NotificationPopover({
  notifications,
  loading,
  error,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
  onMarkAllAsRead,
  role,
  onClose
}: NotificationPopoverProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)

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
      console.error('Error toggling read status:', error)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.id)
        return newSet
      })
    }
  }

  const handleArchive = async (notificationId: string) => {
    if (processingIds.has(notificationId)) return

    setProcessingIds(prev => new Set(prev).add(notificationId))
    try {
      await onArchive(notificationId)
    } catch (error) {
      console.error('Error archiving notification:', error)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationId)
        return newSet
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true)
    try {
      await onMarkAllAsRead()
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  const unreadNotifications = notifications.filter(n => !n.read)
  const hasUnread = unreadNotifications.length > 0

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {hasUnread && (
            <Badge variant="default" className="h-5 px-1.5 text-xs bg-blue-600">
              {unreadNotifications.length}
            </Badge>
          )}
        </div>
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
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Marquage...
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Tout marquer lu
              </>
            )}
          </Button>
        )}
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
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Bell className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">Aucune notification</p>
          <p className="text-xs text-slate-500 text-center">
            Vous n'avez pas de nouvelles notifications pour le moment
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {notifications.map((notification) => {
              const { icon: Icon, className: iconClassName } = getNotificationIcon(
                notification.type,
                notification.priority
              )
              const isProcessing = processingIds.has(notification.id)
              const isUrgent = notification.priority === 'urgent' || notification.priority === 'high'

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 transition-colors hover:bg-slate-50",
                    !notification.read && "bg-blue-50/30"
                  )}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      isUrgent ? "bg-red-100" : "bg-slate-100"
                    )}>
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

                        {isUrgent && (
                          <Badge
                            variant="outline"
                            className={cn("h-4 px-1.5 text-xs", getPriorityColor(notification.priority))}
                          >
                            {getPriorityLabel(notification.priority)}
                          </Badge>
                        )}
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
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(notification.id)}
                          disabled={isProcessing}
                          className="h-7 px-2 text-xs hover:bg-slate-100"
                          title="Archiver"
                        >
                          <Archive className="h-3 w-3" />
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
