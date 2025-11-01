import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Building,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getServerAuthContext } from "@/lib/server-context"
import { logger } from "@/lib/logger"

interface Notification {
  id: string
  type: "intervention" | "payment" | "document" | "system"
  title: string
  message: string
  date: string
  read: boolean
  urgent?: boolean
  createdBy?: string
  property?: string
  time?: string
}

function getNotificationIcon(_type: string) {
  switch (_type) {
    case "intervention":
      return <Wrench className="h-5 w-5 text-blue-600" />
    case "payment":
      return <Building className="h-5 w-5 text-green-600" />
    case "document":
      return <Info className="h-5 w-5 text-purple-600" />
    case "system":
      return <Bell className="h-5 w-5 text-gray-600" />
    default:
      return <Bell className="h-5 w-5 text-gray-600" />
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

export default async function NotificationsPage() {
  // ✅ CRITICAL FIX: Add authentication (was missing - security issue!)
  const { profile, supabase } = await getServerAuthContext('prestataire')

  logger.info('🔔 [PRESTATAIRE-NOTIFICATIONS] Loading notifications', {
    userId: profile.id,
    role: profile.role
  })

  // Load real notifications from database
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    logger.error('❌ [PRESTATAIRE-NOTIFICATIONS] Error loading notifications', {
      error: error.message
    })
  }

  // Fallback to empty array if no notifications or error
  const displayNotifications = notifications || []
  const unreadCount = displayNotifications.filter((n) => !n.is_read).length

  logger.info('✅ [PRESTATAIRE-NOTIFICATIONS] Notifications loaded', {
    total: displayNotifications.length,
    unread: unreadCount
  })

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/prestataire/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600">Vos missions et notifications</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm">
              Marquer tout comme lu ({unreadCount})
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {displayNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${
                !notification.is_read ? "ring-2 ring-blue-100 bg-blue-50/50" : "bg-white"
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
                          !notification.is_read ? "text-gray-900" : "text-gray-700"
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
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
                        {notification.metadata?.property && (
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{notification.metadata.property}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {notification.is_read ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {displayNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
            <p className="text-gray-600">Vous n'avez aucune notification pour le moment.</p>
          </div>
        )}
    </div>
  )
}
