/**
 * 🧹 Test Isolation Helpers
 *
 * Fonctions pour garantir l'isolation complète entre tests E2E.
 * Évite les problèmes d'état partagé qui causent des timeouts et échecs.
 */

import { Page } from '@playwright/test'
import { logger, logError } from '@/lib/logger'

/**
 * Nettoie complètement l'état du navigateur
 * À appeler dans afterEach pour garantir isolation entre tests
 */
export async function cleanBrowserState(page: Page): Promise<void> {
  try {
    // 1. Clear cookies
    await page.context().clearCookies()

    // 2. Clear localStorage et sessionStorage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // 3. Clear service workers (PWA cache)
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }
    })

    // 4. Clear IndexedDB
    await page.evaluate(async () => {
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      }
    })

  } catch (error) {
    console.warn('⚠️ Warning cleaning browser state:', error)
    // Non-bloquant - le test peut continuer
  }
}

/**
 * Attend que toutes les requêtes réseau soient terminées
 * Utile avant de passer au test suivant
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout })
  } catch (error) {
    console.warn('⚠️ Network not idle after', timeout, 'ms')
  }
}

/**
 * Configuration d'isolation complète pour un test
 * Usage dans beforeEach
 */
export async function setupTestIsolation(page: Page): Promise<void> {
  // Bloquer ressources non essentielles pour accélérer tests
  await page.route('**/*', (route) => {
    const url = route.request().url()

    // Bloquer analytics, fonts externes, etc.
    if (
      url.includes('analytics') ||
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('fonts.googleapis') ||
      url.includes('facebook.com') ||
      url.includes('twitter.com')
    ) {
      route.abort()
    } else {
      route.continue()
    }
  })

  // Clear state existant
  await cleanBrowserState(page)
}

/**
 * Teardown complet après test
 * Usage dans afterEach
 */
export async function teardownTestIsolation(page: Page, testInfo: any): Promise<void> {
  // Screenshot seulement si échec (économise espace disque)
  if (testInfo.status === 'failed') {
    await page.screenshot({
      path: `test/e2e/screenshots/${testInfo.title.replace(/\s+/g, '-')}.png`,
      fullPage: true
    })
  }

  // Attendre requêtes réseau
  await waitForNetworkIdle(page, 3000)

  // Nettoyer state
  await cleanBrowserState(page)
}

/**
 * Vérifie si la page est dans un état stable
 * Retourne false si timeouts ou erreurs détectés
 */
export async function isPageHealthy(page: Page): Promise<boolean> {
  try {
    // 1. Vérifier que document est prêt
    const ready = await page.evaluate(() => document.readyState === 'complete')
    if (!ready) return false

    // 2. Vérifier qu'il n'y a pas d'erreurs JS non catchées
    const errors = await page.evaluate(() => {
      return (window as any).__testErrors || []
    })
    if (errors.length > 0) {
      console.warn('⚠️ Page has JS errors:', errors)
      return false
    }

    // 3. Vérifier que Next.js est hydraté
    const hydrated = await page.evaluate(() => {
      return !!(window as any).__NEXT_DATA__
    })
    if (!hydrated) {
      console.warn('⚠️ Next.js not hydrated')
      return false
    }

    return true

  } catch (error) {
    console.warn('⚠️ Error checking page health:', error)
    return false
  }
}

/**
 * Reset complet de l'application entre tests
 * Pour tests qui modifient données serveur
 */
export async function resetApplicationState(page: Page): Promise<void> {
  try {
    // Appeler endpoint de reset si disponible
    const response = await page.request.post('http://localhost:3000/api/test/reset', {
      timeout: 5000
    }).catch(() => null)

    if (response && response.ok()) {
      console.log('✅ Application state reset')
    }
  } catch (error) {
    console.warn('⚠️ Could not reset application state:', error)
  }
}
