/**
 * Custom Pino Reporter pour Playwright
 * Intégration native entre Playwright et Pino pour logs structurés
 */

import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter'
import pino from 'pino'
import { createE2ELogger } from '../config/pino-test.config'
import path from 'path'

export default class CustomPinoReporter implements Reporter {
  private logger: pino.Logger
  private config: FullConfig | null = null
  private startTime: number = 0
  private testResults: Map<string, TestResult[]> = new Map()

  constructor() {
    // Initialiser le logger Pino pour le reporter
    this.logger = createE2ELogger('playwright-reporter')
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config
    this.startTime = Date.now()

    this.logger.info({
      event: 'test_suite_start',
      config: {
        testDir: config.testDir,
        workers: config.workers,
        projects: config.projects.map(p => p.name),
        timeout: config.timeout
      },
      suite: {
        allTests: suite.allTests().length,
        suites: this.countSuites(suite)
      },
      startTime: new Date().toISOString()
    }, `🚀 Starting Playwright test suite with ${config.workers} workers`)
  }

  onTestBegin(test: TestCase) {
    const projectName = test.parent.project()?.name || 'unknown'
    const testPath = this.getRelativeTestPath(test.location.file)

    this.logger.info({
      event: 'test_start',
      test: {
        id: test.id,
        title: test.title,
        file: testPath,
        project: projectName,
        annotations: test.annotations
      },
      startTime: new Date().toISOString()
    }, `▶️  Starting test: ${test.title} (${projectName})`)
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep) {
    this.logger.debug({
      event: 'test_step_start',
      test: {
        id: test.id,
        title: test.title
      },
      step: {
        title: step.title,
        category: step.category
      },
      startTime: new Date().toISOString()
    }, `  ⏳ Step: ${step.title}`)
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep) {
    const duration = step.duration || 0

    this.logger.debug({
      event: 'test_step_end',
      test: {
        id: test.id,
        title: test.title
      },
      step: {
        title: step.title,
        category: step.category,
        duration,
        error: step.error ? {
          message: step.error.message,
          stack: step.error.stack
        } : null
      },
      performance: {
        duration,
        slow: duration > 3000
      },
      endTime: new Date().toISOString()
    }, `  ${step.error ? '❌' : '✅'} Step completed: ${step.title} (${duration}ms)`)

    // Log de performance si l'étape est lente
    if (duration > 3000) {
      this.logger.warn({
        event: 'performance_warning',
        test: {
          id: test.id,
          title: test.title
        },
        step: {
          title: step.title,
          duration
        }
      }, `⚠️  Slow step detected: ${step.title} took ${duration}ms`)
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const projectName = test.parent.project()?.name || 'unknown'
    const testPath = this.getRelativeTestPath(test.location.file)
    const duration = result.duration

    // Stocker les résultats pour l'analyse finale
    if (!this.testResults.has(projectName)) {
      this.testResults.set(projectName, [])
    }
    this.testResults.get(projectName)!.push(result)

    // Log du résultat du test
    const logLevel = result.status === 'passed' ? 'info' : 'error'
    const icon = this.getStatusIcon(result.status)

    this.logger[logLevel]({
      event: 'test_end',
      test: {
        id: test.id,
        title: test.title,
        file: testPath,
        project: projectName
      },
      result: {
        status: result.status,
        duration,
        retry: result.retry,
        errors: result.errors?.map(err => ({
          message: err.message,
          location: err.location
        })) || []
      },
      artifacts: {
        screenshots: result.attachments?.filter(a => a.name.includes('screenshot')).length || 0,
        videos: result.attachments?.filter(a => a.name.includes('video')).length || 0,
        traces: result.attachments?.filter(a => a.name.includes('trace')).length || 0
      },
      performance: {
        duration,
        slow: duration > 10000,
        timeout: duration >= (test.timeout || 30000)
      },
      endTime: new Date().toISOString()
    }, `${icon} Test ${result.status}: ${test.title} (${duration}ms)`)

    // Log des erreurs détaillées si le test a échoué
    if (result.errors && result.errors.length > 0) {
      for (const error of result.errors) {
        this.logger.error({
          event: 'test_error',
          test: {
            id: test.id,
            title: test.title,
            file: testPath
          },
          error: {
            message: error.message,
            location: error.location,
            stack: error.stack
          }
        }, `💥 Test error: ${error.message}`)
      }
    }

    // Log des attachments (screenshots, vidéos, etc.)
    if (result.attachments && result.attachments.length > 0) {
      this.logger.info({
        event: 'test_artifacts',
        test: {
          id: test.id,
          title: test.title
        },
        artifacts: result.attachments.map(att => ({
          name: att.name,
          contentType: att.contentType,
          path: att.path
        }))
      }, `📎 Test artifacts: ${result.attachments.length} files`)
    }
  }

  onEnd(result: FullResult) {
    const totalDuration = Date.now() - this.startTime
    const totalTests = Array.from(this.testResults.values())
      .reduce((sum, results) => sum + results.length, 0)

    // Calculer les statistiques globales
    const stats = this.calculateStats(result)

    this.logger.info({
      event: 'test_suite_end',
      summary: {
        status: result.status,
        totalTests,
        duration: totalDuration,
        ...stats
      },
      projects: Array.from(this.testResults.entries()).map(([projectName, results]) => ({
        name: projectName,
        tests: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        flaky: results.filter(r => r.status === 'flaky').length,
        skipped: results.filter(r => r.status === 'skipped').length
      })),
      performance: {
        totalDuration,
        averageTestDuration: totalTests > 0 ? totalDuration / totalTests : 0,
        slowTests: this.getSlowTests()
      },
      endTime: new Date().toISOString()
    }, `🏁 Test suite completed: ${stats.passed}/${totalTests} passed (${totalDuration}ms)`)

    // Log des recommandations basées sur les résultats
    this.logRecommendations(stats, totalDuration)

    // Exporter les données pour l'agent debugger
    this.exportForDebugger(result, stats, totalDuration)
  }

  private countSuites(suite: Suite): number {
    return suite.suites.length + suite.suites.reduce((count, s) => count + this.countSuites(s), 0)
  }

  private getRelativeTestPath(filePath: string): string {
    if (!this.config || !this.config.testDir) return filePath
    return path.relative(this.config.testDir, filePath)
  }

  private getStatusIcon(status: string): string {
    const icons = {
      passed: '✅',
      failed: '❌',
      flaky: '🔄',
      skipped: '⏭️',
      timedOut: '⏰',
      interrupted: '⚡'
    }
    return icons[status] || '❓'
  }

  private calculateStats(result: FullResult) {
    const allResults = Array.from(this.testResults.values()).flat()

    return {
      passed: allResults.filter(r => r.status === 'passed').length,
      failed: allResults.filter(r => r.status === 'failed').length,
      flaky: allResults.filter(r => r.status === 'flaky').length,
      skipped: allResults.filter(r => r.status === 'skipped').length,
      timedOut: allResults.filter(r => r.status === 'timedOut').length,
      interrupted: allResults.filter(r => r.status === 'interrupted').length
    }
  }

  private getSlowTests() {
    const allResults = Array.from(this.testResults.values()).flat()
    return allResults
      .filter(r => r.duration > 10000) // Plus de 10 secondes
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5) // Top 5 des plus lents
      .map(r => ({
        duration: r.duration,
        status: r.status
      }))
  }

  private logRecommendations(stats: any, totalDuration: number) {
    const recommendations: string[] = []

    // Recommandations basées sur le taux de réussite
    const successRate = stats.passed / (stats.passed + stats.failed + stats.flaky)
    if (successRate < 0.8) {
      recommendations.push('Taux de réussite faible (<80%). Revoir la stabilité des tests.')
    }

    // Recommandations basées sur la durée
    if (totalDuration > 300000) { // Plus de 5 minutes
      recommendations.push('Suite de tests lente (>5min). Optimiser ou paralléliser davantage.')
    }

    // Recommandations basées sur les tests flaky
    if (stats.flaky > 0) {
      recommendations.push(`${stats.flaky} tests instables détectés. Améliorer la fiabilité.`)
    }

    // Recommandations basées sur les timeouts
    if (stats.timedOut > 0) {
      recommendations.push(`${stats.timedOut} tests en timeout. Revoir les timeouts ou optimiser.`)
    }

    if (recommendations.length > 0) {
      this.logger.warn({
        event: 'suite_recommendations',
        recommendations,
        stats
      }, `💡 Recommendations: ${recommendations.length} issues detected`)

      recommendations.forEach(rec => {
        this.logger.warn({ recommendation: rec }, `  - ${rec}`)
      })
    }
  }

  private exportForDebugger(result: FullResult, stats: any, totalDuration: number) {
    const debuggerData = {
      timestamp: new Date().toISOString(),
      suite: {
        status: result.status,
        duration: totalDuration,
        stats
      },
      projects: Array.from(this.testResults.entries()).map(([name, results]) => ({
        name,
        results: results.map(r => ({
          status: r.status,
          duration: r.duration,
          retry: r.retry,
          errors: r.errors?.map(e => e.message) || []
        }))
      }))
    }

    // Exporter vers le dossier de l'agent debugger
    const debuggerDir = process.env.DEBUGGER_OUTPUT_DIR || path.resolve(__dirname, '../logs/debugger-analysis')
    const debuggerFile = path.join(debuggerDir, `playwright-export-${Date.now()}.json`)

    try {
      require('fs').writeFileSync(debuggerFile, JSON.stringify(debuggerData, null, 2))

      this.logger.info({
        event: 'debugger_export',
        filePath: debuggerFile,
        dataSize: JSON.stringify(debuggerData).length
      }, `📤 Exported data for debugger analysis: ${debuggerFile}`)
    } catch (error) {
      this.logger.error({
        event: 'debugger_export_failed',
        error: error,
        attemptedPath: debuggerFile
      }, `❌ Failed to export debugger data: ${error}`)
    }
  }
}