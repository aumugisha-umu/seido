import {
  ArrowLeft,
  Bell,
  Check,
  Clock,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  User,
  Building,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "intervention",
    title: "Intervention programmée",
    message: "Votre demande d'intervention pour le problème de plomberie a été programmée pour demain à 14h00",
    date: "2024-01-15",
    time: "09:30",
    read: false,
    urgent: true,
    createdBy: "Jean Dupont - Gestionnaire",
  },
  {
    id: "2",
    type: "payment",
    title: "Nouveau document disponible",
    message: "Vos documents de janvier 2024 sont disponibles dans votre espace",
    date: "2024-01-14",
    time: "16:45",
    read: false,
  },
  {
    id: "3",
    type: "system",
    title: "Demande d'intervention acceptée",
    message: "Votre demande d'intervention #INT-2024-001 a été acceptée et sera traitée sous 48h",
    date: "2024-01-13",
    time: "11:20",
    read: true,
  },
]

function getNotificationIcon(type: string) {
  switch (type) {
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

function formatDate(dateString: string, time?: string) {
  const date = new Date(dateString + "T" + (time || "00:00"))
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

export default function NotificationsPage() {
  const unreadCount = mockNotifications.filter((n) => !n.read).length

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

          {unreadCount > 0 && (
            <Button variant="outline" size="sm">
              Marquer tout comme lu ({unreadCount})
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {mockNotifications.map((notification) => (
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
                        {notification.urgent && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
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
                            {formatDate(notification.date, notification.time)}
                          </span>
                        </div>
                        {notification.createdBy && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{notification.createdBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {notification.read ? (
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

        {mockNotifications.length === 0 && (
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
