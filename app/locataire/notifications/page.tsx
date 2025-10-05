"use client"

import { useState } from "react"
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  User,
  Building,
  Wrench,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/use-notifications"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { logger, logError } from '@/lib/logger'
function getNotificationIcon(_type: string) {
  switch (type) {
    case "intervention":
      return <Wrench className="h-5 w-5 text-blue-600" />
    case "payment":
      return <Building className="h-5 w-5 text-green-600" />
    case "document":
      return <Info className="h-5 w-5 text-purple-600" />
    case "system":
      return <Bell className="h-5 w-5 text-gray-600" />
    case "quote":
      return <Building className="h-5 w-5 text-orange-600" />
    case "assignment":
      return <User className="h-5 w-5 text-purple-600" />
    default:
      return <Bell className="h-5 w-5 text-gray-600" />
  }
}

function formatDate(_dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

function getPriorityBadge(_priority: string) {
  switch (priority) {
    case "urgent":
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Urgent
        </Badge>
      )
    case "high":
      return (
        <Badge className="bg-orange-100 text-orange-800 text-xs">
          Priorité élevée
        </Badge>
      )
    default:
      return null
  }
}

export default function NotificationsPage() {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const {
    notifications,
    loading,
    error,
    unreadCount,
    refresh,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification
  } = useNotifications({
    scope: 'all',
    limit: 100,
    autoRefresh: true,
    refreshInterval: 30000
  })

  const handleMarkAsRead = async (_notificationId: string) => {
    setActionLoading(notificationId)
    try {
      await markAsRead(notificationId)
    } catch (err) {
      logger.error('Error marking as read:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAsUnread = async (_notificationId: string) => {
    setActionLoading(notificationId)
    try {
      await markAsUnread(notificationId)
    } catch (err) {
      logger.error('Error marking as unread:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (_notificationId: string) => {
    setActionLoading(notificationId)
    try {
      await deleteNotification(notificationId)
    } catch (err) {
      logger.error('Error deleting notification:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    setActionLoading('all')
    try {
      await markAllAsRead()
    } catch (err) {
      logger.error('Error marking all as read:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/locataire/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600">Vos notifications et alertes</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={actionLoading === 'all'}
              >
                {actionLoading === 'all' ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Marquer tout comme lu ({unreadCount})
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des notifications: {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${
                !notification.read ? "ring-2 ring-blue-100 bg-blue-50/50" : "bg-white"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex space-x-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className={`text-sm font-medium ${
                          !notification.read ? "text-gray-900" : "text-gray-700"
                        }`}>
                          {notification.title}
                        </h3>
                        {getPriorityBadge(notification.priority)}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {notification.message}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(notification.created_at)}
                          </span>
                        </div>
                        {notification.created_by_user && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{notification.created_by_user.name}</span>
                          </div>
                        )}
                        {notification.team && (
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{notification.team.name}</span>
                          </div>
                        )}
                        {notification.is_personal && (
                          <Badge variant="outline" className="text-xs">
                            Personnel
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => notification.read ? handleMarkAsUnread(notification.id) : handleMarkAsRead(notification.id)}
                      disabled={actionLoading === notification.id}
                    >
                      {actionLoading === notification.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : notification.read ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(notification.id)}
                      disabled={actionLoading === notification.id}
                    >
                      {actionLoading === notification.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {notifications.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
            <p className="text-gray-600">Vous n'avez aucune notification pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-5 w-5" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Notifications skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex space-x-4 flex-1">
                    <Skeleton className="h-5 w-5 rounded-full mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-3/4 mb-3" />
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
