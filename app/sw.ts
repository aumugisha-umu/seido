import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, NetworkOnly, NetworkFirst, ExpirationPlugin } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
      handler: new NetworkOnly({
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          }),
        ],
        networkTimeoutSeconds: 10,
      }),
    },
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/_next/static/'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/_next/image'),
      handler: new NetworkFirst({
        cacheName: 'next-image',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          }),
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200) {
                return response;
              }
              return null;
            }
          }
        ]
      }),
    },
    ...defaultCache,
  ],
  disableDevLogs: true
})

// 🔔 PUSH NOTIFICATION HANDLER
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const options: NotificationOptions = {
      body: data.message || data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
        notificationId: data.notificationId,
        type: data.type
      },
      actions: [
        {
          action: 'open',
          title: 'Ouvrir'
        },
        {
          action: 'close',
          title: 'Fermer'
        }
      ],
      requireInteraction: data.type === 'intervention' || data.type === 'assignment',
      tag: data.notificationId || 'seido-notification',
      renotify: true,
      silent: false
    } as any

    event.waitUntil(
      self.registration.showNotification(data.title || 'SEIDO', options)
    )
  } catch (error) {
    console.error('Error handling push event:', error)
  }
})

// 🖱️ NOTIFICATION CLICK HANDLER
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focus
        for (const client of clientList) {
          if (client.url.includes(new URL(urlToOpen, self.location.href).pathname) && 'focus' in client) {
            return client.focus()
          }
        }
        // Sinon, ouvrir nouvelle fenêtre
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})

// 🔄 NOTIFICATION CLOSE HANDLER
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag)
})

serwist.addEventListeners()
