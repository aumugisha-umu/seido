"use client"

import { useState, useEffect } from "react"
import { FileText, Euro, CheckCircle, XCircle, Bell, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { logger, logError } from '@/lib/logger'
export interface QuoteNotification {
  id: string
  type: 'quote_request' | 'quote_submitted' | 'quote_approved' | 'quote_rejected'
  title: string
  message: string
  interventionId: string
  interventionTitle: string
  providerName?: string
  quoteAmount?: number
  timestamp: string
  read: boolean
  urgent?: boolean
}

interface QuoteNotificationsProps {
  userId: string
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  onNotificationClick?: (notification: QuoteNotification) => void
  onMarkAsRead?: (_notificationId: string) => void
}

export function QuoteNotifications({
  userId,
  userRole,
  onNotificationClick,
  onMarkAsRead
}: QuoteNotificationsProps) {
  const [notifications, setNotifications] = useState<QuoteNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Simuler la récupération des notifications selon Design System
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true)
      try {
        // Simulation de notifications selon le rôle
        const mockNotifications: QuoteNotification[] = []

        if (userRole === 'prestataire') {
          mockNotifications.push({
            id: '1',
            type: 'quote_request',
            title: 'Nouvelle demande d\'estimation',
            message: 'Estimation demandée pour "Réparation plomberie - INT-2025-001"',
            interventionId: 'int-001',
            interventionTitle: 'Réparation plomberie',
            timestamp: new Date().toISOString(),
            read: false,
            urgent: true
          })
        }

        if (userRole === 'gestionnaire') {
          mockNotifications.push({
            id: '2',
            type: 'quote_submitted',
            title: 'Nouvelle estimation reçue',
            message: 'Plomberie Pro a soumis une estimation de 450€',
            interventionId: 'int-001',
            interventionTitle: 'Réparation plomberie',
            providerName: 'Plomberie Pro',
            quoteAmount: 450,
            timestamp: new Date().toISOString(),
            read: false,
            urgent: true
          })
        }

        setNotifications(mockNotifications)
      } catch (error) {
        logger.error('Error fetching notifications:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [userId, userRole])

  // Fonction pour obtenir l'icône selon le type (Design System)
  const getNotificationIcon = (type: QuoteNotification['type']) => {
    switch (type) {
      case 'quote_request':
        return <FileText className="w-5 h-5 text-amber-600" />
      case 'quote_submitted':
        return <Euro className="w-5 h-5 text-sky-600" />
      case 'quote_approved':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />
      case 'quote_rejected':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Bell className="w-5 h-5 text-slate-600" />
    }
  }

  // Fonction pour obtenir les couleurs selon le type (Design System)
  const getNotificationColors = (type: QuoteNotification['type'], urgent: boolean = false) => {
    const baseClasses = urgent ? 'border-l-4' : 'border-l-2'

    switch (type) {
      case 'quote_request':
        return `${baseClasses} border-l-amber-500 bg-amber-50 hover:bg-amber-100`
      case 'quote_submitted':
        return `${baseClasses} border-l-sky-500 bg-sky-50 hover:bg-sky-100`
      case 'quote_approved':
        return `${baseClasses} border-l-emerald-500 bg-emerald-50 hover:bg-emerald-100`
      case 'quote_rejected':
        return `${baseClasses} border-l-red-500 bg-red-50 hover:bg-red-100`
      default:
        return `${baseClasses} border-l-slate-500 bg-slate-50 hover:bg-slate-100`
    }
  }

  const handleNotificationClick = (notification: QuoteNotification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-slate-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <Bell className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-slate-600 text-sm">Aucune notification d'estimation</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`cursor-pointer transition-colors ${getNotificationColors(notification.type, notification.urgent)} ${
            !notification.read ? 'ring-2 ring-sky-200' : ''
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              {/* Icône selon type */}
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-medium text-sm ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                    {notification.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {notification.urgent && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                        Urgent
                      </Badge>
                    )}
                    {!notification.read && (
                      <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                    )}
                  </div>
                </div>

                <p className={`text-sm ${!notification.read ? 'text-slate-700' : 'text-slate-600'}`}>
                  {notification.message}
                </p>

                {/* Détails supplémentaires */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {notification.interventionTitle}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(notification.timestamp).toLocaleDateString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Montant du devis si applicable */}
                {notification.quoteAmount && (
                  <div className="mt-2 text-right">
                    <span className="text-sm font-semibold text-sky-700">
                      {notification.quoteAmount}€
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Composant pour afficher les notifications dans un dropdown/panel
export function QuoteNotificationsPanel({
  userId,
  userRole,
  onNotificationClick
}: Omit<QuoteNotificationsProps, 'onMarkAsRead'>) {
  const [notifications, setNotifications] = useState<QuoteNotification[]>([])

  const markAsRead = (_notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="w-80 max-h-96 overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-900">Notifications Estimations</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-sky-100 text-sky-800">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-2">
        <QuoteNotifications
          userId={userId}
          userRole={userRole}
          onNotificationClick={onNotificationClick}
          onMarkAsRead={markAsRead}
        />
      </div>
    </div>
  )
}
