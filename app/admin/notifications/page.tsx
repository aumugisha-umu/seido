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
  Shield,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: string
  type: "system" | "security" | "user" | "maintenance"
  title: string
  message: string
  date: string
  read: boolean
  urgent?: boolean
  createdBy?: string
  time?: string
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "security",
    title: "Tentative de connexion suspecte",
    message: "Plusieurs tentatives de connexion échouées détectées sur le compte gestionnaire jean.dupont@example.com",
    date: "2024-01-15",
    time: "14:22",
    read: false,
    urgent: true,
  },
  {
    id: "2",
    type: "system",
    title: "Maintenance système programmée",
    message: "Maintenance de routine programmée pour ce dimanche de 02:00 à 04:00",
    date: "2024-01-14",
    time: "18:00",
    read: false,
  },
  {
    id: "3",
    type: "user",
    title: "Nouveau gestionnaire inscrit",
    message: "Marie Martin s'est inscrite en tant que gestionnaire et attend validation",
    date: "2024-01-13",
    time: "10:30",
    read: true,
  },
]

function getNotificationIcon(_type: string) {
  switch (_type) {
    case "security":
      return <Shield className="h-5 w-5 text-red-600" />
    case "system":
      return <Info className="h-5 w-5 text-blue-600" />
    case "user":
      return <User className="h-5 w-5 text-green-600" />
    case "maintenance":
      return <Building className="h-5 w-5 text-orange-600" />
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
            <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications Système</h1>
              <p className="text-gray-600">Alertes et notifications administrateur</p>
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
                            Critique
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
            <p className="text-gray-600">Aucune alerte système pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
