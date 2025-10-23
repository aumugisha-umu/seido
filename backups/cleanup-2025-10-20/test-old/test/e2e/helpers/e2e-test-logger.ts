/**
 * E2E Test Logger - Intégration Pino + Screenshots + Métadonnées
 * Logger spécialisé pour tests E2E avec capture automatique et contexte enrichi
 */

import { Page } from '@playwright/test'
import pino from 'pino'
import path from 'path'
import { createE2ELogger, logPerformanceMetrics, logTestError } from '../config/pino-test.config'

export interface TestStep {
  name: string
  timestamp: string
  duration: number
  screenshot?: string
  url?: string
  error?: Error
  metadata?: Record<string, any>
}

export interface PerformanceMetrics {
  stepDuration: number
  totalDuration: number
  memoryUsage?: NodeJS.MemoryUsage
  networkRequests?: number
  renderingTime?: number
}

export interface TestExecutionSummary {
  testId: string
  testName: string
  userRole: string
  totalSteps: number
  totalDuration: number
  successfulSteps: number
  errorSteps: number
  screenshots: string[]
  performanceReport: PerformanceMetrics
  logFiles: {
    structured: string
    performance: string
    errors: string
  }
}

/**
 * E2E Test Logger avec intégration Pino et captures automatiques
 */
export class E2ETestLogger {
  private logger: pino.Logger
  private testId: string
  private testName: string
  private userRole: string
  private startTime: number
  private steps: TestStep[] = []
  private screenshots: string[] = []
  private currentStepNumber = 0
  private screenshotDir: string

  constructor(testName: string, userRole: string = 'unknown') {
    this.testId = `${testName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.testName = testName
    this.userRole = userRole
    this.startTime = Date.now()
    this.screenshotDir = process.env.SCREENSHOT_DIR || path.resolve(__dirname, '../screenshots')

    // Créer le logger Pino avec contexte enrichi
    this.logger = createE2ELogger(testName, userRole)

    // Log de démarrage du test
    this.logger.info({
      event: 'test_start',
      testId: this.testId,
      testName,
      userRole,
      startTime: new Date().toISOString()
    }, `Starting E2E test: ${testName} for role: ${userRole}`)
  }

  /**
   * Enregistrer une étape de test avec capture automatique
   */
  async logStep(
    stepName: string,
    page: Page,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const stepStartTime = Date.now()
    this.currentStepNumber++

    try {
      // Capturer l'URL actuelle
      const currentUrl = page.url()

      // Prendre une capture d'écran
      const screenshotPath = await this.captureScreenshot(page, stepName)

      // Calculer la durée de l'étape
      const stepDuration = Date.now() - stepStartTime

      // Créer l'objet step
      const step: TestStep = {
        name: stepName,
        timestamp: new Date().toISOString(),
        duration: stepDuration,
        screenshot: screenshotPath,
        url: currentUrl,
        metadata
      }

      // Ajouter aux steps
      this.steps.push(step)

      // Logger avec Pino
      this.logger.info({
        event: 'test_step',
        stepNumber: this.currentStepNumber,
        stepName,
        stepDuration,
        url: currentUrl,
        screenshotPath,
        metadata,
        performance: {
          duration: stepDuration,
          timestamp: new Date().toISOString()
        }
      }, `Step ${this.currentStepNumber}: ${stepName}`)

      // Log performance si l'étape est lente
      if (stepDuration > 3000) {
        logPerformanceMetrics(this.logger, stepName, {
          duration: stepDuration,
          memoryUsage: process.memoryUsage()
        })
      }

      return screenshotPath

    } catch (error) {
      // En cas d'erreur, logger et continuer
      await this.logError(error as Error, stepName, page)
      throw error
    }
  }

  /**
   * Capturer une capture d'écran avec nommage intelligent
   */
  async captureScreenshot(page: Page, stepName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${this.testId}-step-${this.currentStepNumber}-${stepName.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.png`

    // Déterminer le sous-dossier selon le type d'étape
    let subDir = 'general'
    if (stepName.toLowerCase().includes('login') || stepName.toLowerCase().includes('auth')) {
      subDir = 'auth'
    } else if (stepName.toLowerCase().includes('workflow') || stepName.toLowerCase().includes('dashboard')) {
      subDir = 'workflows'
    } else if (stepName.toLowerCase().includes('error') || stepName.toLowerCase().includes('fail')) {
      subDir = 'errors'
    }

    const screenshotPath = path.join(this.screenshotDir, subDir, fileName)

    try {
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png',
        quality: parseInt(process.env.SCREENSHOT_QUALITY || '90')
      })

      this.screenshots.push(screenshotPath)

      this.logger.debug({
        event: 'screenshot_captured',
        screenshotPath,
        stepName,
        stepNumber: this.currentStepNumber
      }, `Screenshot captured: ${fileName}`)

      return screenshotPath

    } catch (error) {
      this.logger.error({
        event: 'screenshot_failed',
        error: error,
        stepName,
        attemptedPath: screenshotPath
      }, `Failed to capture screenshot for step: ${stepName}`)

      return '' // Retourner une chaîne vide si la capture échoue
    }
  }

  /**
   * Logger une erreur avec contexte enrichi
   */
  async logError(error: Error, stepName: string, page: Page): Promise<void> {
    try {
      // Capturer une capture d'écran de l'erreur
      const errorScreenshot = await this.captureScreenshot(page, `error-${stepName}`)
      const currentUrl = page.url()

      // Ajouter l'erreur au step current
      if (this.steps.length > 0) {
        this.steps[this.steps.length - 1].error = error
      }

      // Logger avec Pino
      logTestError(this.logger, error, {
        testStep: stepName,
        pageUrl: currentUrl,
        screenshotPath: errorScreenshot
      })

      this.logger.error({
        event: 'test_step_error',
        stepNumber: this.currentStepNumber,
        stepName,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        pageUrl: currentUrl,
        screenshotPath: errorScreenshot
      }, `Error in step ${this.currentStepNumber}: ${stepName}`)

    } catch (captureError) {
      // Si même la capture d'erreur échoue, logger au minimum
      this.logger.error({
        event: 'critical_error',
        originalError: error,
        captureError: captureError,
        stepName
      }, `Critical error in step: ${stepName}`)
    }
  }

  /**
   * Logger des métriques de performance pour une étape
   */
  logPerformance(stepName: string, metrics: Partial<PerformanceMetrics>): void {
    logPerformanceMetrics(this.logger, stepName, {
      duration: metrics.stepDuration || 0,
      memoryUsage: metrics.memoryUsage,
      networkRequests: metrics.networkRequests,
      renderingTime: metrics.renderingTime
    })
  }

  /**
   * Finaliser le test et générer un résumé
   */
  async finalize(): Promise<TestExecutionSummary> {
    const endTime = Date.now()
    const totalDuration = endTime - this.startTime

    // Calculer les statistiques
    const totalSteps = this.steps.length
    const successfulSteps = this.steps.filter(s => !s.error).length
    const errorSteps = this.steps.filter(s => s.error).length

    // Créer le rapport de performance
    const performanceReport: PerformanceMetrics = {
      stepDuration: 0, // Moyenne calculée ci-dessous
      totalDuration,
      memoryUsage: process.memoryUsage()
    }

    // Calculer la durée moyenne des étapes
    if (totalSteps > 0) {
      performanceReport.stepDuration = this.steps.reduce((acc, step) => acc + step.duration, 0) / totalSteps
    }

    const summary: TestExecutionSummary = {
      testId: this.testId,
      testName: this.testName,
      userRole: this.userRole,
      totalSteps,
      totalDuration,
      successfulSteps,
      errorSteps,
      screenshots: this.screenshots,
      performanceReport,
      logFiles: {
        structured: `structured-${this.testId}.json`,
        performance: `performance-${this.testId}.log`,
        errors: errorSteps > 0 ? `errors-${this.testId}.log` : ''
      }
    }

    // Logger le résumé final
    this.logger.info({
      event: 'test_complete',
      testId: this.testId,
      summary,
      steps: this.steps.map(s => ({
        name: s.name,
        duration: s.duration,
        error: s.error ? s.error.message : null,
        screenshot: s.screenshot
      }))
    }, `Test completed: ${this.testName} - ${successfulSteps}/${totalSteps} steps successful`)

    return summary
  }

  /**
   * Obtenir les informations actuelles du test
   */
  getTestInfo() {
    return {
      testId: this.testId,
      testName: this.testName,
      userRole: this.userRole,
      currentStep: this.currentStepNumber,
      screenshots: this.screenshots,
      duration: Date.now() - this.startTime
    }
  }

  /**
   * Obtenir le logger Pino pour usage direct si nécessaire
   */
  getPinoLogger(): pino.Logger {
    return this.logger
  }
}

/**
 * Factory function pour créer facilement un logger E2E
 */
export function createTestLogger(testName: string, userRole?: string): E2ETestLogger {
  return new E2ETestLogger(testName, userRole || 'unknown')
}

/**
 * Utility pour formatter la durée en format lisible
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(2)}s`
  } else {
    const minutes = Math.floor(milliseconds / 60000)
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0)
    return `${minutes}m ${seconds}s`
  }
}