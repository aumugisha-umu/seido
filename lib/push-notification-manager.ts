'use client'

import { logger } from '@/lib/logger'

export class PushNotificationManager {
  private static instance: PushNotificationManager
  private registration: ServiceWorkerRegistration | null = null

  private constructor() {}

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager()
    }
    return PushNotificationManager.instance
  }

  async initialize(): Promise<void> {
    logger.debug('PushManager initializing...')

    if (!('serviceWorker' in navigator)) {
      logger.error('Service Worker API not supported in this browser')
      return
    }

    try {
      // Check if any service worker is registered
      const registrations = await navigator.serviceWorker.getRegistrations()
      logger.debug({ count: registrations.length }, 'PushManager found service worker registrations')

      if (registrations.length === 0) {
        logger.warn('No service worker registered. In development mode, the SW is disabled by default.')
        return
      }

      // Wait for the service worker to be ready
      logger.debug('PushManager waiting for service worker ready...')
      this.registration = await navigator.serviceWorker.ready
      logger.info({ scope: this.registration.scope }, 'PushManager service worker ready')
    } catch (error) {
      logger.error({ error }, 'Service Worker initialization failed')
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Ce navigateur ne supporte pas les notifications')
    }

    const permission = await Notification.requestPermission()
    logger.debug({ permission }, 'PushManager permission status')
    return permission
  }

  async subscribe(userId: string): Promise<PushSubscription> {
    logger.debug({ userId }, 'PushManager starting subscribe process')

    if (!this.registration) {
      logger.debug('PushManager no registration, initializing...')
      await this.initialize()
    }

    if (!this.registration) {
      logger.error('Service Worker not available after initialization')
      throw new Error('Service Worker non disponible (désactivé en mode développement)')
    }

    logger.debug('PushManager registration OK, requesting permission...')
    const permission = await this.requestPermission()
    logger.debug({ permission }, 'PushManager permission result')

    if (permission !== 'granted') {
      throw new Error('Permission de notification refusée')
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    logger.debug({ hasKey: !!publicKey }, 'PushManager VAPID public key check')

    if (!publicKey) {
      logger.error('VAPID public key missing. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local')
      throw new Error('VAPID public key manquante')
    }

    try {
      logger.debug('PushManager creating push subscription...')
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      })

      logger.info({ endpoint: subscription.endpoint.substring(0, 50) }, 'PushManager subscription created')

      // Envoyer l'abonnement au serveur
      logger.debug('PushManager sending subscription to server...')
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription })
      })

      logger.debug({ status: response.status }, 'PushManager server response')

      if (!response.ok) {
        const errorData = await response.json()
        logger.error({ errorData }, 'Server rejected subscription')
        throw new Error(errorData.error || 'Impossible d\'enregistrer l\'abonnement')
      }

      await response.json()
      logger.info('PushManager subscription saved to server')
      return subscription
    } catch (error) {
      logger.error({ error }, 'PushManager subscribe error')
      throw error
    }
  }

  async unsubscribe(userId: string): Promise<void> {
    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) return

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        logger.info('PushManager push subscription removed')
      }

      // Supprimer du serveur
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Impossible de supprimer l\'abonnement')
      }

      logger.info('PushManager subscription removed from server')
    } catch (error) {
      logger.error({ error }, 'PushManager unsubscribe error')
      throw error
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) return null

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      return subscription
    } catch (error) {
      logger.error({ error }, 'PushManager get subscription error')
      return null
    }
  }

  async isSubscribed(): Promise<boolean> {
    const subscription = await this.getSubscription()
    return subscription !== null
  }

  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

// Export singleton instance
export const pushManager = PushNotificationManager.getInstance()
