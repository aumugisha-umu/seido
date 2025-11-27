/**
 * Tests de Performance - Navigation
 *
 * Ces tests vérifient que:
 * 1. La navigation fonctionne au premier clic (pas de double-clic nécessaire)
 * 2. Les temps de navigation sont acceptables (<1s)
 * 3. Les boutons sont désactivés pendant la navigation (protection double-clic)
 */

import { test, expect } from '@playwright/test'

// Configuration des timeouts pour les tests de performance
test.setTimeout(30000)

test.describe('Navigation Performance', () => {
  test.describe('Gestionnaire Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // TODO: Implémenter l'authentification automatique
      // Pour l'instant, ces tests nécessitent une session active
    })

    test('navigation vers interventions doit fonctionner au premier clic', async ({ page }) => {
      // Skip si pas de session (à implémenter avec auth helper)
      test.skip(true, 'Nécessite implémentation auth helper')

      await page.goto('/gestionnaire/dashboard')
      await page.waitForLoadState('networkidle')

      const startTime = Date.now()

      // Cliquer sur le lien vers interventions
      await page.click('a[href*="/interventions"]')

      // Attendre que l'URL change
      await page.waitForURL('**/interventions')
      await page.waitForLoadState('domcontentloaded')

      const navigationTime = Date.now() - startTime

      // La navigation doit prendre moins de 1 seconde
      expect(navigationTime).toBeLessThan(1000)

      // Log pour le rapport
      console.log(`Navigation time to interventions: ${navigationTime}ms`)
    })

    test('navigation vers biens doit être rapide', async ({ page }) => {
      test.skip(true, 'Nécessite implémentation auth helper')

      await page.goto('/gestionnaire/dashboard')
      await page.waitForLoadState('networkidle')

      const startTime = Date.now()
      await page.click('a[href*="/biens"]')
      await page.waitForURL('**/biens')

      const navigationTime = Date.now() - startTime
      expect(navigationTime).toBeLessThan(1000)
      console.log(`Navigation time to biens: ${navigationTime}ms`)
    })

    test('bouton création intervention doit se désactiver pendant navigation', async ({ page }) => {
      test.skip(true, 'Nécessite implémentation auth helper')

      await page.goto('/gestionnaire/interventions')
      await page.waitForLoadState('networkidle')

      // Localiser le bouton de création
      const createButton = page.locator('button:has-text("Créer une intervention")')

      // Vérifier que le bouton est activé initialement
      await expect(createButton).not.toBeDisabled()

      // Cliquer et vérifier immédiatement si le bouton se désactive
      await createButton.click()

      // Le bouton devrait se désactiver pendant la navigation
      // Note: Ce test vérifie le comportement du hook useNavigationPending
      await expect(createButton).toBeDisabled({ timeout: 500 })
    })
  })

  test.describe('Auth Flow Performance', () => {
    test('page de login doit charger rapidement', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/auth/login')
      await page.waitForLoadState('domcontentloaded')

      // Attendre que le formulaire soit visible
      await page.waitForSelector('form', { state: 'visible' })

      const loadTime = Date.now() - startTime

      // La page de login doit charger en moins de 2 secondes
      expect(loadTime).toBeLessThan(2000)
      console.log(`Login page load time: ${loadTime}ms`)
    })

    test('redirection post-login doit être rapide', async ({ page }) => {
      test.skip(true, 'Nécessite credentials de test')

      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')

      const startTime = Date.now()

      // Remplir et soumettre le formulaire
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')

      // Attendre la redirection vers le dashboard
      await page.waitForURL('**/dashboard', { timeout: 5000 })

      const totalTime = Date.now() - startTime

      // Login + redirection doit prendre moins de 3 secondes
      // (réduit de 5s grâce aux optimisations de délais)
      expect(totalTime).toBeLessThan(3000)
      console.log(`Total login + redirect time: ${totalTime}ms`)
    })
  })

  test.describe('Core Web Vitals Checks', () => {
    test('dashboard ne doit pas avoir de layout shift majeur', async ({ page }) => {
      test.skip(true, 'Nécessite implémentation auth helper')

      await page.goto('/gestionnaire/dashboard')

      // Attendre que la page soit stable
      await page.waitForLoadState('networkidle')

      // Mesurer CLS (Cumulative Layout Shift)
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // @ts-ignore - hadRecentInput existe sur LayoutShift
              if (!entry.hadRecentInput) {
                // @ts-ignore - value existe sur LayoutShift
                clsValue += entry.value
              }
            }
          })
          observer.observe({ type: 'layout-shift', buffered: true })

          // Attendre un peu pour capturer les shifts
          setTimeout(() => {
            observer.disconnect()
            resolve(clsValue)
          }, 2000)
        })
      })

      // CLS doit être inférieur à 0.1 (seuil "bon" de Google)
      expect(cls).toBeLessThan(0.1)
      console.log(`CLS score: ${cls}`)
    })

    test('First Contentful Paint doit être rapide', async ({ page }) => {
      await page.goto('/auth/login')

      // Attendre que la page soit chargée
      await page.waitForLoadState('domcontentloaded')

      // Récupérer FCP
      const fcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                observer.disconnect()
                resolve(entry.startTime)
              }
            }
          })
          observer.observe({ type: 'paint', buffered: true })

          // Fallback si FCP déjà passé
          setTimeout(() => {
            const entries = performance.getEntriesByName('first-contentful-paint')
            if (entries.length > 0) {
              resolve(entries[0].startTime)
            } else {
              resolve(0)
            }
          }, 1000)
        })
      })

      // FCP doit être inférieur à 1.8s (seuil "bon" de Google)
      expect(fcp).toBeLessThan(1800)
      console.log(`FCP: ${fcp}ms`)
    })
  })
})

/**
 * Tests de régression pour les délais supprimés
 */
test.describe('Delay Regression Tests', () => {
  test('GlobalLoadingIndicator ne doit pas bloquer la navigation rapide', async ({ page }) => {
    test.skip(true, 'Nécessite implémentation auth helper')

    await page.goto('/gestionnaire/dashboard')
    await page.waitForLoadState('networkidle')

    // Navigation rapide vers interventions
    const startTime = Date.now()
    await page.click('a[href*="/interventions"]')
    await page.waitForURL('**/interventions')
    const time1 = Date.now() - startTime

    // Navigation rapide retour
    const startTime2 = Date.now()
    await page.click('a[href*="/dashboard"]')
    await page.waitForURL('**/dashboard')
    const time2 = Date.now() - startTime2

    // Les deux navigations doivent être rapides (<1s chacune)
    // Cela prouve que le GlobalLoadingIndicator ne bloque pas
    expect(time1).toBeLessThan(1000)
    expect(time2).toBeLessThan(1000)

    console.log(`Fast navigation test: ${time1}ms + ${time2}ms`)
  })
})
