'use client'

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
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready
        console.log('✅ [PushManager] Service Worker ready')
      } catch (error) {
        console.error('❌ [PushManager] Service Worker not available:', error)
      }
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Ce navigateur ne supporte pas les notifications')
    }

    const permission = await Notification.requestPermission()
    console.log('🔔 [PushManager] Permission status:', permission)
    return permission
  }

  async subscribe(userId: string): Promise<PushSubscription> {
    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) {
      throw new Error('Service Worker non disponible')
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Permission de notification refusée')
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      throw new Error('VAPID public key manquante')
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      })

      console.log('✅ [PushManager] Push subscription created')

      // Envoyer l'abonnement au serveur
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save subscription')
      }

      console.log('✅ [PushManager] Subscription saved to server')
      return subscription
    } catch (error) {
      console.error('❌ [PushManager] Subscribe error:', error)
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
        console.log('✅ [PushManager] Push subscription removed')
      }

      // Supprimer du serveur
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove subscription')
      }

      console.log('✅ [PushManager] Subscription removed from server')
    } catch (error) {
      console.error('❌ [PushManager] Unsubscribe error:', error)
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
      console.error('❌ [PushManager] Get subscription error:', error)
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
