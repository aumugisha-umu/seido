'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV !== 'test' // ✅ Actif en dev + production (exclu tests uniquement)
    ) {
      // Reload when a new SW takes control (skipWaiting activated a new version)
      // This ensures users always run the latest JS/CSS after deployment
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Check for updates every hour
          intervalId = setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
        })
        .catch((error) => {
          console.error('❌ [PWA] Service Worker registration failed:', error)
        })
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return null
}
