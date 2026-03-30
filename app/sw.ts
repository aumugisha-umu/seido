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
    // 🗺️ Google Maps API - MUST bypass Service Worker completely
    // The SW interferes with Google's dynamic library loading mechanism
    {
      matcher: ({ url }: { url: URL }) => {
        return url.hostname.includes('googleapis.com') ||
               url.hostname.includes('gstatic.com') ||
               url.hostname.includes('google.com')
      },
      handler: new NetworkOnly(),
    },
    // ⚡ OPTIMISATION: NetworkFirst pour les API stables (meilleure UX offline)
    {
      matcher: ({ url }: { url: URL }) => {
        const stableEndpoints = ['/api/user-teams', '/api/buildings', '/api/notifications', '/api/team-contacts', '/api/lots']
        return stableEndpoints.some(endpoint => url.pathname.startsWith(endpoint))
      },
      handler: new NetworkFirst({
        cacheName: 'api-stable-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          }),
        ],
        networkTimeoutSeconds: 5, // Fallback au cache si réseau lent
      }),
    },
    // NetworkOnly pour les mutations (create, update, delete)
    {
      matcher: ({ url }: { url: URL }) => {
        const mutationPatterns = ['/api/create-', '/api/update-', '/api/invite-', '/api/push/']
        return mutationPatterns.some(pattern => url.pathname.includes(pattern))
      },
      handler: new NetworkOnly({
        networkTimeoutSeconds: 30,
      }),
    },
    // Routes de sync email - timeout plus long (1 minute)
    // La sync IMAP peut prendre du temps selon le nombre d'emails
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith('/api/emails') &&
        (url.pathname.includes('/sync') || url.pathname.includes('/connections')),
      handler: new NetworkOnly({
        networkTimeoutSeconds: 60, // 1 minute pour les syncs IMAP
      }),
    },
    // Fallback NetworkOnly pour autres API
    // ⚠️ Timeout augmenté de 10s à 30s pour éviter les erreurs de timeout prématurées
    // Les requêtes complexes (activity-logs, rapports) peuvent prendre plus de 10s
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
      handler: new NetworkOnly({
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
        networkTimeoutSeconds: 30,
      }),
    },
    // NOTE: /_next/static/ is NOT listed here on purpose — content-hashed files are
    // handled by defaultCache (CacheFirst). Adding NetworkOnly here breaks CSS after
    // deployments: cached HTML references old hashes → 404 → unstyled page.
    //
    // Next.js images — NetworkFirst with 24h cache
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
    // Images externes (emails HTML) - pas d'interception SW
    // Les emails HTML contiennent des images sur des domaines externes (bolt.eu, etc.)
    // Le SW ne peut pas les fetcher correctement, donc on les laisse passer directement
    {
      matcher: ({ request, url }: { request: Request; url: URL }) => {
        return request.destination === 'image' && url.origin !== self.location.origin
      },
      handler: new NetworkOnly(), // Fetch direct sans cache SW
    },
    ...defaultCache,
  ],
  disableDevLogs: true
})

// 🔔 PUSH NOTIFICATION HANDLER
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('📥 [SW-PUSH] No data in push event, ignoring')
    return
  }

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
        .then(() => {
          // Notification shown
        })
        .catch((err) => {
          console.error('❌ [SW-PUSH] Failed to show notification:', err)
        })
    )
  } catch (error) {
    console.error('❌ [SW-PUSH] Error handling push event:', error)
    // 🔍 DEBUG: Try to log raw text on error
    try {
      console.error('❌ [SW-PUSH] Raw data that failed to parse:', event.data?.text())
    } catch (e) {
      console.error('❌ [SW-PUSH] Could not read raw data:', e)
    }
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
self.addEventListener('notificationclose', () => {
  // no-op
})

serwist.addEventListeners()
