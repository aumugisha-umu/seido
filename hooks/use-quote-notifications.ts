"use client"

import { useState, useEffect, useCallback } from "react"
import { QuoteNotification } from "@/components/notifications/quote-notifications"

interface UseQuoteNotificationsProps {
  userId: string
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  enabled?: boolean
}

export function useQuoteNotifications({
  userId,
  userRole,
  enabled = true
}: UseQuoteNotificationsProps) {
  const [notifications, setNotifications] = useState<QuoteNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fonction pour récupérer les notifications
  const fetchNotifications = useCallback(async () => {
    if (!enabled || !userId) return

    try {
      setIsLoading(true)
      setError(null)

      // TODO: Remplacer par un vrai appel API
      // const response = await fetch(`/api/notifications/quotes?userId=${userId}&role=${userRole}`)
      // const data = await response.json()

      // Simulation de données selon le rôle et le design system
      const mockNotifications: QuoteNotification[] = []

      if (userRole === 'prestataire') {
        // Notifications pour prestataires : demandes de devis
        mockNotifications.push({
          id: 'notif-1',
          type: 'quote_request',
          title: 'Nouvelle demande de devis',
          message: 'Devis demandé pour "Réparation plomberie urgente"',
          interventionId: 'int-001',
          interventionTitle: 'Réparation plomberie urgente',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Il y a 30 min
          read: false,
          urgent: true
        })
      } else if (userRole === 'gestionnaire') {
        // Notifications pour gestionnaires : devis reçus
        mockNotifications.push(
          {
            id: 'notif-2',
            type: 'quote_submitted',
            title: 'Nouveau devis reçu',
            message: 'Plomberie Express a soumis un devis de 380€',
            interventionId: 'int-001',
            interventionTitle: 'Réparation plomberie urgente',
            providerName: 'Plomberie Express',
            quoteAmount: 380,
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // Il y a 15 min
            read: false,
            urgent: true
          },
          {
            id: 'notif-3',
            type: 'quote_submitted',
            title: 'Nouveau devis reçu',
            message: 'Artisan Pro a soumis un devis de 420€',
            interventionId: 'int-002',
            interventionTitle: 'Installation électrique',
            providerName: 'Artisan Pro',
            quoteAmount: 420,
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Il y a 1h
            read: true,
            urgent: false
          }
        )
      } else if (userRole === 'locataire') {
        // Notifications pour locataires : statut des devis
        mockNotifications.push({
          id: 'notif-4',
          type: 'quote_approved',
          title: 'Devis approuvé',
          message: 'Le devis de Plomberie Pro (380€) a été approuvé',
          interventionId: 'int-001',
          interventionTitle: 'Réparation plomberie urgente',
          providerName: 'Plomberie Pro',
          quoteAmount: 380,
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // Il y a 45 min
          read: false,
          urgent: false
        })
      }

      setNotifications(mockNotifications)
    } catch (err) {
      console.error('Error fetching quote notifications:', err)
      setError('Erreur lors du chargement des notifications')
    } finally {
      setIsLoading(false)
    }
  }, [userId, userRole, enabled])

  // Fonction pour marquer une notification comme lue
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // TODO: Appel API pour marquer comme lue
      // await fetch(`/api/notifications/${notificationId}/mark-read`, { method: 'POST' })

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [])

  // Fonction pour marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async () => {
    try {
      // TODO: Appel API pour marquer toutes comme lues
      // await fetch(`/api/notifications/mark-all-read`, { method: 'POST', body: { userId, type: 'quote' } })

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      )
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }, [])

  // Fonction pour ajouter une nouvelle notification (pour les mises à jour temps réel)
  const addNotification = useCallback((notification: QuoteNotification) => {
    setNotifications(prev => [notification, ...prev])
  }, [])

  // Fonction pour simuler la réception d'une nouvelle notification
  const simulateNotification = useCallback((type: QuoteNotification['type']) => {
    const now = new Date().toISOString()
    let newNotification: QuoteNotification

    switch (type) {
      case 'quote_request':
        newNotification = {
          id: `notif-${Date.now()}`,
          type: 'quote_request',
          title: 'Nouvelle demande de devis',
          message: `Devis demandé pour "Intervention urgente"`,
          interventionId: `int-${Date.now()}`,
          interventionTitle: 'Intervention urgente',
          timestamp: now,
          read: false,
          urgent: true
        }
        break

      case 'quote_submitted':
        newNotification = {
          id: `notif-${Date.now()}`,
          type: 'quote_submitted',
          title: 'Nouveau devis reçu',
          message: `Nouveau Prestataire a soumis un devis de 250€`,
          interventionId: `int-${Date.now()}`,
          interventionTitle: 'Intervention récente',
          providerName: 'Nouveau Prestataire',
          quoteAmount: 250,
          timestamp: now,
          read: false,
          urgent: true
        }
        break

      case 'quote_approved':
        newNotification = {
          id: `notif-${Date.now()}`,
          type: 'quote_approved',
          title: 'Devis approuvé',
          message: `Votre devis a été approuvé !`,
          interventionId: `int-${Date.now()}`,
          interventionTitle: 'Intervention validée',
          timestamp: now,
          read: false,
          urgent: false
        }
        break

      case 'quote_rejected':
        newNotification = {
          id: `notif-${Date.now()}`,
          type: 'quote_rejected',
          title: 'Devis rejeté',
          message: `Votre devis n'a pas été retenu`,
          interventionId: `int-${Date.now()}`,
          interventionTitle: 'Intervention non retenue',
          timestamp: now,
          read: false,
          urgent: false
        }
        break

      default:
        return
    }

    addNotification(newNotification)
  }, [addNotification])

  // Chargement initial
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Simulation du polling pour les mises à jour temps réel (remplacer par WebSocket/SSE en production)
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      // Simulation aléatoire de nouvelles notifications
      if (Math.random() < 0.1) { // 10% de chance toutes les 30 secondes
        const types: QuoteNotification['type'][] = ['quote_request', 'quote_submitted', 'quote_approved']
        const randomType = types[Math.floor(Math.random() * types.length)]
        simulateNotification(randomType)
      }
    }, 30000) // Vérifier toutes les 30 secondes

    return () => clearInterval(interval)
  }, [enabled, simulateNotification])

  // Calculs dérivés
  const unreadCount = notifications.filter(n => !n.read).length
  const urgentCount = notifications.filter(n => !n.read && n.urgent).length

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    urgentCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    simulateNotification
  }
}
