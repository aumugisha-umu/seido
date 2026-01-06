"use client"

import {
  Mail,
  MailOpen,
  Archive,
  Calendar,
  User,
  Activity,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getNotificationIcon, formatNotificationDate } from "./notification-utils"
import type { Notification } from "@/hooks/use-notifications"

export interface NotificationCardProps {
  notification: Notification
  onMarkAsRead?: () => void
  onArchive?: () => void
  isUpdating?: boolean
}

/**
 * A single notification card with actions (mark read/unread, archive)
 * Used by both locataire and prestataire notification pages
 */
export function NotificationCard({
  notification,
  onMarkAsRead,
  onArchive,
  isUpdating = false
}: NotificationCardProps) {
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
                {/* Title and badges */}
                <div className="flex items-center gap-2 min-w-0 mb-1">
                  <h3 className="text-sm font-medium truncate text-foreground">
                    {notification.title}
                  </h3>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  )}
                </div>

                {/* Message */}
                <p className="text-sm text-muted-foreground mb-2 sm:mb-3 break-words line-clamp-3">
                  {notification.message}
                </p>

                {/* Metadata */}
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full">
                    <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatNotificationDate(notification.created_at)}
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

                  {notification.related_entity_type && (
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
