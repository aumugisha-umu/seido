/**
 * Error Context Collector
 * Collecte le contexte complet lors d'une erreur de test E2E
 */

import { Page } from '@playwright/test'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { ErrorContext } from './config'

export class ErrorContextCollector {
  private artifactsDir: string

  constructor(artifactsDir?: string) {
    this.artifactsDir = artifactsDir || path.resolve(__dirname, '../auto-healing-artifacts')
  }

  /**
   * Collecter le contexte complet d'une erreur
   */
  async collect(
    testId: string,
    testName: string,
    userRole: string,
    error: Error,
    step: string,
    page: Page,
    expectedUrl?: string
  ): Promise<ErrorContext> {
    console.log(`🔍 [ERROR-COLLECTOR] Collecting context for error in ${testName}...`)

    // Créer le dossier d'artifacts pour ce test
    const testArtifactsDir = path.join(this.artifactsDir, testId)
    await fs.mkdir(testArtifactsDir, { recursive: true })

    // Collecter l'état de la page
    const state = await this.collectPageState(page, testArtifactsDir, expectedUrl)

    // Déterminer le type d'erreur
    const errorType = this.detectErrorType(error, step, state.url, expectedUrl)

    // Collecter les fichiers source concernés
    const sourceFiles = await this.collectRelevantSourceFiles(errorType, state.url, expectedUrl)

    const errorContext: ErrorContext = {
      testId,
      testName,
      userRole,

      error: {
        type: errorType,
        message: error.message,
        stack: error.stack,
        step,
        timestamp: new Date().toISOString()
      },

      state,
      sourceFiles,
      previousAttempts: []
    }

    // Sauvegarder le contexte complet
    const contextPath = path.join(testArtifactsDir, 'error-context.json')
    await fs.writeFile(contextPath, JSON.stringify(errorContext, null, 2))

    console.log(`✅ [ERROR-COLLECTOR] Context collected and saved to ${contextPath}`)

    return errorContext
  }

  /**
   * Collecter l'état complet de la page
   */
  private async collectPageState(
    page: Page,
    artifactsDir: string,
    expectedUrl?: string
  ): Promise<ErrorContext['state']> {
    const url = page.url()
    console.log(`📸 [ERROR-COLLECTOR] Collecting page state from ${url}`)

    // Screenshot
    const screenshotPath = path.join(artifactsDir, 'error-screenshot.png')
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true })
    } catch (error) {
      console.error(`❌ [ERROR-COLLECTOR] Failed to capture screenshot:`, error)
    }

    // DOM Snapshot
    let domSnapshot: string | undefined
    try {
      const content = await page.content()
      const snapshotPath = path.join(artifactsDir, 'dom-snapshot.html')
      await fs.writeFile(snapshotPath, content)
      domSnapshot = snapshotPath
    } catch (error) {
      console.error(`❌ [ERROR-COLLECTOR] Failed to capture DOM:`, error)
    }

    // Console logs
    const consoleLogs: string[] = []
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`)
    })

    // Network logs (collect recent)
    const networkLogs: string[] = []
    page.on('request', request => {
      networkLogs.push(`REQUEST: ${request.method()} ${request.url()}`)
    })
    page.on('response', response => {
      networkLogs.push(`RESPONSE: ${response.status()} ${response.url()}`)
    })

    return {
      url,
      expectedUrl,
      screenshot: screenshotPath,
      domSnapshot,
      networkLogs: networkLogs.slice(-20), // Last 20
      consoleLogs: consoleLogs.slice(-20)  // Last 20
    }
  }

  /**
   * Détecter le type d'erreur
   */
  private detectErrorType(
    error: Error,
    step: string,
    actualUrl: string,
    expectedUrl?: string
  ): ErrorContext['error']['type'] {
    const message = error.message.toLowerCase()

    // Timeout
    if (message.includes('timeout')) {
      if (message.includes('navigation') || message.includes('waitforurl')) {
        return 'redirect'
      }
      if (message.includes('selector') || message.includes('locator')) {
        return 'selector'
      }
      return 'timeout'
    }

    // Redirect
    if (expectedUrl && actualUrl !== expectedUrl && step.toLowerCase().includes('redirect')) {
      return 'redirect'
    }

    // Selector
    if (message.includes('selector') || message.includes('locator') || message.includes('element')) {
      return 'selector'
    }

    // Network
    if (message.includes('network') || message.includes('net::')) {
      return 'network'
    }

    // Authentication
    if (message.includes('auth') || message.includes('login') || message.includes('session')) {
      return 'authentication'
    }

    return 'unknown'
  }

  /**
   * Collecter les fichiers source concernés
   */
  private async collectRelevantSourceFiles(
    errorType: ErrorContext['error']['type'],
    actualUrl: string,
    expectedUrl?: string
  ): Promise<ErrorContext['sourceFiles']> {
    const sourceFiles: ErrorContext['sourceFiles'] = []

    const projectRoot = path.resolve(__dirname, '../../../..')

    // Fichiers à collecter selon le type d'erreur
    let filesToCollect: string[] = []

    switch (errorType) {
      case 'redirect':
      case 'authentication':
        filesToCollect = [
          'app/actions/auth-actions.ts',
          'lib/auth-dal.ts',
          'app/auth/login/login-form.tsx',
          'middleware.ts'
        ]
        break

      case 'selector':
        // Essayer de déterminer la page concernée depuis l'URL
        if (actualUrl.includes('/login')) {
          filesToCollect = [
            'app/auth/login/page.tsx',
            'app/auth/login/login-form.tsx'
          ]
        } else if (actualUrl.includes('/dashboard')) {
          filesToCollect = [
            'app/dashboard/[role]/page.tsx',
            'components/dashboards/*/dashboard.tsx'
          ]
        }
        break

      case 'network':
        filesToCollect = [
          'app/api/*/route.ts',
          'lib/services/core/supabase-client.ts'
        ]
        break

      default:
        // Fichiers génériques
        filesToCollect = [
          'app/actions/auth-actions.ts',
          'lib/auth-dal.ts'
        ]
    }

    // Collecter le contenu des fichiers
    for (const relativePath of filesToCollect) {
      const fullPath = path.join(projectRoot, relativePath)

      try {
        const content = await fs.readFile(fullPath, 'utf-8')
        sourceFiles.push({
          path: relativePath,
          content,
          suspectedLines: this.detectSuspectedLines(content, errorType)
        })
      } catch (error) {
        console.log(`⚠️ [ERROR-COLLECTOR] Could not read ${relativePath}:`, error instanceof Error ? error.message : String(error))
      }
    }

    return sourceFiles
  }

  /**
   * Détecter les lignes suspectes dans le code
   */
  private detectSuspectedLines(content: string, errorType: ErrorContext['error']['type']): number[] {
    const lines = content.split('\n')
    const suspectedLines: number[] = []

    const patterns: Record<ErrorContext['error']['type'], RegExp[]> = {
      redirect: [/redirect\(/i, /router\.push/i, /window\.location/i, /useRouter/i],
      authentication: [/auth\./i, /signIn/i, /getUser/i, /getSession/i],
      selector: [/locator\(/i, /querySelector/i, /getElementById/i],
      network: [/fetch\(/i, /axios/i, /\.get\(/i, /\.post\(/i],
      timeout: [/waitFor/i, /setTimeout/i, /delay/i],
      unknown: []
    }

    const relevantPatterns = patterns[errorType] || []

    lines.forEach((line, index) => {
      for (const pattern of relevantPatterns) {
        if (pattern.test(line)) {
          suspectedLines.push(index + 1) // 1-indexed
        }
      }
    })

    return suspectedLines.slice(0, 10) // Max 10 lignes suspectes
  }

  /**
   * Sauvegarder les logs de console et network
   */
  async saveLogs(testId: string, consoleLogs: string[], networkLogs: string[]): Promise<void> {
    const testArtifactsDir = path.join(this.artifactsDir, testId)
    await fs.mkdir(testArtifactsDir, { recursive: true })

    if (consoleLogs.length > 0) {
      const consoleLogPath = path.join(testArtifactsDir, 'console.log')
      await fs.writeFile(consoleLogPath, consoleLogs.join('\n'))
    }

    if (networkLogs.length > 0) {
      const networkLogPath = path.join(testArtifactsDir, 'network.log')
      await fs.writeFile(networkLogPath, networkLogs.join('\n'))
    }
  }
}