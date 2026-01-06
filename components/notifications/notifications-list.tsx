"use client"

import { Bell } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { NotificationCard } from "./notification-card"
import type { Notification } from "@/hooks/use-notifications"

export interface NotificationsListProps {
  notifications: Notification[]
  onMarkAsRead: (notification: Notification) => void
  onArchive: (id: string) => void
  updatingNotifications: Set<string>
}

/**
 * Displays a list of notifications with visual separation between read/unread
 * Includes empty state handling
 */
export function NotificationsList({
  notifications,
  onMarkAsRead,
  onArchive,
  updatingNotifications,
}: NotificationsListProps) {
  if (notifications.length === 0) {
    return (
      <Card className="text-center py-8 sm:py-12">
        <CardContent className="px-4">
          <Bell className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-foreground mb-2 px-2">
            Aucune notification
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground px-2 max-w-md mx-auto">
            Vous n'avez aucune notification pour le moment.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Separate read and unread notifications
  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)

  return (
    <div className="space-y-4">
      {/* Unread notifications */}
      {unreadNotifications.length > 0 && (
        <div className="space-y-3">
          {unreadNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => onMarkAsRead(notification)}
              onArchive={() => onArchive(notification.id)}
              isUpdating={updatingNotifications.has(notification.id)}
            />
          ))}
        </div>
      )}

      {/* Visual separator if we have both read and unread */}
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

      {/* Read notifications */}
      {readNotifications.length > 0 && (
        <div className="space-y-3">
          {readNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => onMarkAsRead(notification)}
              onArchive={() => onArchive(notification.id)}
              isUpdating={updatingNotifications.has(notification.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
