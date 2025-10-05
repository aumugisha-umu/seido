/**
 * 🏃 TEST RUNNER - Runner de tests avec mode interactif
 *
 * Fonctionnalités :
 * - Prompt interactif pour mode headed/headless
 * - Collecte de logs automatique
 * - Auto-healing loop
 * - Détection de boucles infinies
 * - Génération de rapports
 */

import { test as base, expect, Page } from '@playwright/test'
import * as readline from 'readline/promises'
import { TEST_CONFIG, isAutoHealingEnabled } from '../config/test-config'
import { LogCollector, createLogCollector } from '../agents/utils/log-collector'
import { BugDetector, createBugDetector } from '../agents/utils/bug-detector'

/**
 * Extension du test Playwright avec auto-healing
 */
export interface TestContext {
  page: Page
  logCollector: LogCollector
  bugDetector: BugDetector
  runWithHealing: <T>(
    testFn: () => Promise<T>,
    testName: string
  ) => Promise<T>
}

/**
 * Prompt pour demander le mode de navigateur
 */
export const promptBrowserMode = async (): Promise<'headed' | 'headless'> => {
  // Si en CI ou env var, utiliser headless
  if (process.env.CI || process.env.HEADLESS === 'true') {
    return 'headless'
  }

  // Si env var HEADED, utiliser headed
  if (process.env.HEADED === 'true') {
    return 'headed'
  }

  // Sinon, demander à l'utilisateur
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log('\n🎭 Mode de navigateur pour les tests\n')
  console.log('1. Headed (navigateur visible) - Recommandé pour debug')
  console.log('2. Headless (navigateur caché) - Plus rapide\n')

  const answer = await rl.question('Votre choix (1 ou 2) [défaut: 2]: ')
  rl.close()

  const mode = answer.trim() === '1' ? 'headed' : 'headless'
  console.log(`\n✅ Mode sélectionné : ${mode}\n`)

  return mode
}

/**
 * Test étendu avec auto-healing
 */
export const test = base.extend<TestContext>({
  page: async ({ page }, use, testInfo) => {
    const logCollector = createLogCollector(testInfo.title)
    const bugDetector = createBugDetector()

    // Initialiser le collecteur de logs
    await logCollector.initialize(page)

    console.log(`\n🧪 Starting test: ${testInfo.title}`)
    console.log(`📊 Logs will be saved to: ${logCollector['logPaths'].baseDir}\n`)

    const startTime = Date.now()

    try {
      // Utiliser la page avec logging
      await use(page)

      // Test réussi
      const duration = Date.now() - startTime
      await logCollector.saveLogs()
      await logCollector.generateReport({
        passed: true,
        duration,
      })

      console.log(`\n✅ Test passed: ${testInfo.title} (${duration}ms)\n`)
    } catch (error) {
      // Test échoué
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Enregistrer le bug
      bugDetector.recordBug(
        error instanceof Error ? error : new Error(errorMessage)
      )

      await logCollector.saveLogs()
      await logCollector.generateReport({
        passed: false,
        duration,
        error: errorMessage,
      })

      console.error(`\n❌ Test failed: ${testInfo.title}`)
      console.error(`📄 Report: ${logCollector['logPaths'].report}\n`)

      throw error
    } finally {
      await logCollector.cleanup()
    }
  },

  logCollector: async ({}, use, testInfo) => {
    const collector = createLogCollector(testInfo.title)
    await use(collector)
  },

  bugDetector: async ({}, use) => {
    const detector = createBugDetector()
    await use(detector)
  },

  runWithHealing: async (
    { page, logCollector, bugDetector },
    use,
    testInfo
  ) => {
    const runWithHealing = async <T>(
      testFn: () => Promise<T>,
      testName: string
    ): Promise<T> => {
      if (!isAutoHealingEnabled()) {
        // Auto-healing désactivé, exécution normale
        return testFn()
      }

      let lastError: Error | null = null
      const maxAttempts = TEST_CONFIG.autoHealing.maxIterations

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`\n🔄 Attempt ${attempt}/${maxAttempts}: ${testName}`)

        try {
          const result = await testFn()
          console.log(`✅ Test passed on attempt ${attempt}`)
          return result
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          // Enregistrer le bug
          const bug = bugDetector.recordBug(lastError, {
            attempt,
            testName,
          })

          console.error(`❌ Attempt ${attempt} failed:`, lastError.message)

          // Vérifier boucle infinie
          const loopDetection = bugDetector.detectInfiniteLoop()

          if (loopDetection.detected) {
            console.error('\n🔄 INFINITE LOOP DETECTED!')
            console.error(`Bug ${loopDetection.bug?.bugId} occurred ${loopDetection.bug?.occurrences} times\n`)

            // Sauvegarder les logs et rapport
            await logCollector.saveLogs()
            await logCollector.generateReport({
              passed: false,
              duration: 0,
              error: lastError.message,
              healingAttempts: attempt,
            })

            // Écrire le rapport de boucle infinie
            const loopReport = loopDetection.recommendation
            const fs = await import('fs/promises')
            const path = await import('path')
            await fs.writeFile(
              path.join(logCollector['logPaths'].baseDir, 'infinite-loop.md'),
              loopReport,
              'utf-8'
            )

            console.error('📄 Infinite loop report saved')
            console.error(`📂 ${logCollector['logPaths'].baseDir}/infinite-loop.md\n`)

            // Arrêter ici
            throw new Error(
              `Infinite loop detected: ${bug.bugId} (${bug.occurrences} occurrences). Manual intervention required.`
            )
          }

          // Si pas la dernière tentative, attendre avant de réessayer
          if (attempt < maxAttempts) {
            const pauseMs = TEST_CONFIG.autoHealing.pauseBetweenRuns
            console.log(`⏸️  Pausing ${pauseMs}ms before retry...\n`)
            await new Promise((resolve) => setTimeout(resolve, pauseMs))

            // TODO: Appeler l'agent coordinateur pour analyser et corriger
            console.log('🤖 [TODO] Call coordinator agent to analyze and fix...\n')
          }
        }
      }

      // Toutes les tentatives ont échoué
      console.error(`\n❌ All ${maxAttempts} attempts failed`)

      // Sauvegarder le rapport final
      await logCollector.saveLogs()
      await logCollector.generateReport({
        passed: false,
        duration: 0,
        error: lastError?.message,
        healingAttempts: maxAttempts,
      })

      throw lastError!
    }

    await use(runWithHealing)
  },
})

export { expect }

/**
 * Helper pour exécuter un test avec retry manuel
 */
export const runTestWithRetry = async <T>(
  testFn: () => Promise<T>,
  options: {
    maxAttempts?: number
    retryDelay?: number
    onRetry?: (attempt: number, error: Error) => void | Promise<void>
  } = {}
): Promise<T> => {
  const maxAttempts = options.maxAttempts || 3
  const retryDelay = options.retryDelay || 1000

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await testFn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxAttempts) {
        if (options.onRetry) {
          await options.onRetry(attempt, lastError)
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }
  }

  throw lastError!
}

/**
 * Helper pour attendre qu'une condition soit vraie
 */
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number
    interval?: number
    errorMessage?: string
  } = {}
): Promise<void> => {
  const timeout = options.timeout || 5000
  const interval = options.interval || 100
  const errorMessage = options.errorMessage || 'Condition not met within timeout'

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(errorMessage)
}

export default test
