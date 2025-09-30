/**
 * Auto-Healing Test Runner
 * Wrapper pour exécuter les tests avec capacité d'auto-correction
 */

import { test as base, expect, Page } from '@playwright/test'
import { AutoHealingOrchestrator } from './orchestrator'
import type { AutoHealingConfig } from './config'

// Étendre le test Playwright avec auto-healing
export const test = base.extend<{
  autoHealingPage: Page
  orchestrator: AutoHealingOrchestrator
}>({
  orchestrator: async ({}, use) => {
    const orchestrator = new AutoHealingOrchestrator()
    await use(orchestrator)
  },

  autoHealingPage: async ({ page, orchestrator }, use, testInfo) => {
    // Wrapper autour de page qui intercepte les erreurs
    const wrappedPage = new Proxy(page, {
      get(target, prop) {
        const original = target[prop as keyof Page]

        // Intercepter waitForURL pour auto-healing
        if (prop === 'waitForURL') {
          return async function (this: Page, url: string | RegExp, options?: any) {
            try {
              // @ts-ignore
              return await original.call(target, url, options)
            } catch (error) {
              if (error instanceof Error && error.message.includes('Timeout')) {
                console.log('🚨 [AUTO-HEALING] Timeout detected, attempting auto-healing...')

                // Extraire l'URL attendue
                const expectedUrl = typeof url === 'string' ? url : url.source

                // Déclencher l'auto-healing
                const testName = testInfo.title
                const testId = `${testInfo.titlePath.join('-')}-${Date.now()}`

                await orchestrator.heal(
                  testId,
                  testName,
                  'unknown', // TODO: Extraire du contexte
                  error,
                  'waitForURL',
                  target,
                  expectedUrl
                )

                // Relancer l'opération
                // @ts-ignore
                return await original.call(target, url, options)
              }

              throw error
            }
          }
        }

        return original
      }
    })

    await use(wrappedPage as Page)
  }
})

export { expect }

/**
 * Helper pour exécuter un test avec auto-healing explicite
 */
export async function runTestWithAutoHealing<T>(
  testName: string,
  testFn: (page: Page, orchestrator: AutoHealingOrchestrator) => Promise<T>,
  page: Page,
  config?: Partial<AutoHealingConfig>
): Promise<T> {
  const orchestrator = new AutoHealingOrchestrator(config)
  let lastError: Error | null = null
  let attempt = 0
  const maxAttempts = config?.maxRetries || 5

  while (attempt < maxAttempts) {
    try {
      console.log(`\n🎯 [TEST-RUNNER] Attempt ${attempt + 1}/${maxAttempts} for: ${testName}`)

      // Exécuter le test
      const result = await testFn(page, orchestrator)

      console.log(`✅ [TEST-RUNNER] Test passed on attempt ${attempt + 1}`)
      return result
    } catch (error) {
      lastError = error as Error
      attempt++

      console.log(`❌ [TEST-RUNNER] Test failed on attempt ${attempt}:`, lastError.message)

      if (attempt < maxAttempts) {
        // Déclencher auto-healing
        console.log(`🤖 [TEST-RUNNER] Triggering auto-healing...`)

        await orchestrator.heal(
          `${testName}-${Date.now()}`,
          testName,
          'auto',
          lastError,
          'test-execution',
          page
        )

        // Attendre avant le prochain essai
        const retryDelay = config?.retryDelay || 2000
        console.log(`⏳ [TEST-RUNNER] Waiting ${retryDelay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  // Toutes les tentatives ont échoué
  console.log(`❌ [TEST-RUNNER] All ${maxAttempts} attempts failed`)
  throw lastError || new Error('Test failed after all auto-healing attempts')
}

/**
 * Utilitaire pour détecter si un test nécessite l'auto-healing
 */
export function shouldTriggerAutoHealing(error: Error): boolean {
  const message = error.message.toLowerCase()

  return (
    message.includes('timeout') ||
    message.includes('waitforurl') ||
    message.includes('navigation') ||
    message.includes('redirect') ||
    message.includes('selector') ||
    message.includes('locator')
  )
}

/**
 * Décorateur pour ajouter l'auto-healing à un test existant
 */
export function withAutoHealing(
  testFn: (page: Page) => Promise<void>,
  config?: Partial<AutoHealingConfig>
): (page: Page) => Promise<void> {
  return async function (page: Page) {
    const orchestrator = new AutoHealingOrchestrator(config)
    let attempt = 0
    const maxAttempts = config?.maxRetries || 5

    while (attempt < maxAttempts) {
      try {
        await testFn(page)
        return // Success
      } catch (error) {
        if (!shouldTriggerAutoHealing(error as Error)) {
          throw error // Ne pas retry si ce n'est pas un type d'erreur géré
        }

        attempt++
        if (attempt >= maxAttempts) {
          throw error
        }

        // Auto-healing
        await orchestrator.heal(
          `auto-${Date.now()}`,
          'decorated-test',
          'auto',
          error as Error,
          'test-step',
          page
        )

        await new Promise(resolve => setTimeout(resolve, config?.retryDelay || 2000))
      }
    }
  }
}