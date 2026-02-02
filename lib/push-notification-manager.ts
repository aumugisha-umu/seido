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
    console.log('🔔 [PushManager] Initializing...')

    if (!('serviceWorker' in navigator)) {
      console.error('❌ [PushManager] Service Worker API not supported in this browser')
      return
    }

    try {
      // Check if any service worker is registered
      const registrations = await navigator.serviceWorker.getRegistrations()
      console.log('🔔 [PushManager] Found', registrations.length, 'service worker registration(s)')

      if (registrations.length === 0) {
        console.warn('⚠️ [PushManager] No service worker registered. In development mode, the SW is disabled by default.')
        console.warn('⚠️ [PushManager] To test push notifications, run: npm run build && npm run start')
        return
      }

      // Wait for the service worker to be ready
      console.log('🔔 [PushManager] Waiting for service worker to be ready...')
      this.registration = await navigator.serviceWorker.ready
      console.log('✅ [PushManager] Service Worker ready:', this.registration.scope)
    } catch (error) {
      console.error('❌ [PushManager] Service Worker initialization failed:', error)
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
    console.log('🔔 [PushManager] Starting subscribe process for userId:', userId)

    if (!this.registration) {
      console.log('🔔 [PushManager] No registration, initializing...')
      await this.initialize()
    }

    if (!this.registration) {
      console.error('❌ [PushManager] Service Worker not available after initialization')
      console.error('❌ [PushManager] Tip: Service Worker is disabled in development mode. Run "npm run build && npm run start" to test push notifications.')
      throw new Error('Service Worker non disponible (désactivé en mode développement)')
    }

    console.log('🔔 [PushManager] Registration OK, requesting permission...')
    const permission = await this.requestPermission()
    console.log('🔔 [PushManager] Permission result:', permission)

    if (permission !== 'granted') {
      throw new Error('Permission de notification refusée')
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    console.log('🔔 [PushManager] VAPID public key exists:', !!publicKey)

    if (!publicKey) {
      console.error('❌ [PushManager] VAPID public key missing. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local')
      throw new Error('VAPID public key manquante')
    }

    try {
      console.log('🔔 [PushManager] Creating push subscription with pushManager...')
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      })

      console.log('✅ [PushManager] Push subscription created:', subscription.endpoint.substring(0, 50) + '...')

      // Envoyer l'abonnement au serveur
      console.log('🔔 [PushManager] Sending subscription to server...')
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription })
      })

      console.log('🔔 [PushManager] Server response status:', response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [PushManager] Server rejected subscription:', error)
        throw new Error(error.error || 'Failed to save subscription')
      }

      const result = await response.json()
      console.log('✅ [PushManager] Subscription saved to server successfully:', result)
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
