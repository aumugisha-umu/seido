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
    title: "Nouvelle intervention assignée",
    message: "Une intervention de plomberie vous a été assignée pour le Lot001 - Résidence Champs-Élysées",
    date: "2025-01-09T10:30:00",
    read: false,
    urgent: true,
    createdBy: "Marie Dupont",
    property: "Lot001 - Résidence Champs-Élysées",
    time: "10:30",
  },
  {
    id: "2",
    type: "payment",
    title: "Paiement reçu",
    message: "Le loyer de janvier a été reçu pour le Lot001",
    date: "2025-01-08T14:15:00",
    read: false,
    createdBy: "Système automatique",
    property: "Lot001 - Résidence Champs-Élysées",
    time: "14:15",
  },
  {
    id: "3",
    type: "document",
    title: "Nouveau document disponible",
    message: "Le contrat de bail mis à jour est disponible dans vos documents",
    date: "2025-01-07T09:00:00",
    read: true,
    createdBy: "Jean Martin",
    property: "Bt 11 - Marconi 9",
    time: "09:00",
  },
  {
    id: "4",
    type: "system",
    title: "Maintenance programmée",
    message: "Une maintenance système aura lieu ce weekend de 2h à 4h du matin",
    date: "2025-01-06T16:45:00",
    read: true,
    createdBy: "Équipe technique",
    time: "16:45",
  },
]

function getNotificationIcon(type: string, urgent?: boolean) {
  const className = urgent ? "h-5 w-5 text-red-500" : "h-5 w-5 text-blue-500"

  switch (type) {
    case "intervention":
      return urgent ? <AlertTriangle className={className} /> : <Bell className={className} />
    case "payment":
      return <Check className={className} />
    case "document":
      return <Info className={className} />
    case "system":
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
  const unreadCount = mockNotifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/gestionnaire/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600">Gérez vos notifications et alertes</p>
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
              className={`transition-all hover:shadow-md ${!notification.read ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.urgent)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-0.5">
                          <h3
                            className={`text-sm font-medium ${!notification.read ? "text-gray-900" : "text-gray-700"}`}
                          >
                            {notification.title}
                          </h3>
                          {notification.urgent && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                          {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>

                        <div className="flex flex-wrap gap-1.5">
                          <div className="flex items-center space-x-1 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-600">
                              {formatDate(notification.date)} {notification.time && `à ${notification.time}`}
                            </span>
                          </div>

                          {notification.createdBy && (
                            <div className="flex items-center space-x-1 bg-blue-100 px-1.5 py-0.5 rounded-full">
                              <User className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-blue-700">{notification.createdBy}</span>
                            </div>
                          )}

                          {notification.property && (
                            <div className="flex items-center space-x-1 bg-green-100 px-1.5 py-0.5 rounded-full">
                              <Building className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-700">{notification.property}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 ml-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          title={notification.read ? "Marquer comme non lu" : "Marquer comme lu"}
                        >
                          {notification.read ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-blue-500" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50" title="Supprimer">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {mockNotifications.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
              <p className="text-gray-600">Vous n'avez aucune notification pour le moment.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
