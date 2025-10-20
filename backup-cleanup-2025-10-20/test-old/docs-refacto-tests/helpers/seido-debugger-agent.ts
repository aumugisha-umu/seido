/**
 * SEIDO Debugger Agent - Intelligence Artificielle pour Analyse de Tests E2E
 * Agent intelligent pour analyser les résultats de tests, détecter les patterns et générer des recommandations
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { logger, logError } from '@/lib/logger'
import { TestExecutionSummary, TestStep } from './e2e-test-logger'

export interface ErrorPattern {
  type: 'timeout' | 'selector' | 'network' | 'authentication' | 'data' | 'performance' | 'unknown'
  frequency: number
  examples: Array<{
    testId: string
    stepName: string
    error: string
    screenshot?: string
  }>
  recommendation: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface PerformanceIssue {
  type: 'slow_step' | 'memory_leak' | 'network_bottleneck' | 'rendering_lag'
  affectedSteps: Array<{
    testId: string
    stepName: string
    duration: number
    threshold: number
  }>
  recommendation: string
  impact: 'low' | 'medium' | 'high'
}

export interface TestStabilityMetrics {
  overallSuccessRate: number
  flakyTests: Array<{
    testName: string
    failures: number
    total: number
    failureRate: number
  }>
  mostUnstableSteps: Array<{
    stepName: string
    failureRate: number
    commonErrors: string[]
  }>
}

export interface DebuggerAnalysis {
  testRunId: string
  analysisTimestamp: string
  summary: {
    totalTests: number
    successfulTests: number
    failedTests: number
    totalDuration: number
    averageTestDuration: number
  }
  errorPatterns: ErrorPattern[]
  performanceIssues: PerformanceIssue[]
  stabilityMetrics: TestStabilityMetrics
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical'
    category: 'stability' | 'performance' | 'maintenance' | 'infrastructure'
    description: string
    actionItems: string[]
    estimatedImpact: string
  }>
  screenshots: {
    errors: string[]
    comparisons: Array<{
      before: string
      after: string
      diff?: string
    }>
  }
  reportPaths: {
    html: string
    json: string
    detailed: string
  }
}

/**
 * Agent Debugger SEIDO - Analyse intelligente des tests E2E
 */
export class SeidoDebuggerAgent {
  private logsDir: string
  private reportsDir: string
  private testHistoryFile: string
  private testHistory: TestExecutionSummary[] = []

  constructor() {
    this.logsDir = process.env.PINO_TEST_DIR || path.resolve(__dirname, '../logs')
    this.reportsDir = process.env.DEBUGGER_OUTPUT_DIR || path.resolve(__dirname, '../reports/debugger')
    this.testHistoryFile = path.join(this.reportsDir, 'test-history.json')

    this.ensureDirectories()
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Analyser une exécution de test complète
   */
  async analyzeTestRun(testSummaries: TestExecutionSummary[]): Promise<DebuggerAnalysis> {
    const runId = `analysis-${Date.now()}`

    // Charger l'historique des tests pour analyse comparative
    await this.loadTestHistory()

    // Ajouter les nouveaux résultats à l'historique
    this.testHistory.push(...testSummaries)

    // Effectuer l'analyse
    const analysis: DebuggerAnalysis = {
      testRunId: runId,
      analysisTimestamp: new Date().toISOString(),
      summary: this.analyzeSummary(testSummaries),
      errorPatterns: await this.analyzeErrorPatterns(testSummaries),
      performanceIssues: this.analyzePerformanceIssues(testSummaries),
      stabilityMetrics: this.analyzeStabilityMetrics(testSummaries),
      recommendations: [],
      screenshots: await this.analyzeScreenshots(testSummaries),
      reportPaths: {
        html: path.join(this.reportsDir, `${runId}-report.html`),
        json: path.join(this.reportsDir, `${runId}-report.json`),
        detailed: path.join(this.reportsDir, `${runId}-detailed.json`)
      }
    }

    // Générer les recommandations basées sur l'analyse
    analysis.recommendations = this.generateRecommendations(analysis)

    // Sauvegarder l'analyse
    await this.saveAnalysis(analysis)

    // Sauvegarder l'historique mis à jour
    await this.saveTestHistory()

    return analysis
  }

  /**
   * Analyser le résumé général de l'exécution
   */
  private analyzeSummary(testSummaries: TestExecutionSummary[]) {
    const totalTests = testSummaries.length
    const successfulTests = testSummaries.filter(t => t.errorSteps === 0).length
    const failedTests = totalTests - successfulTests
    const totalDuration = testSummaries.reduce((acc, t) => acc + t.totalDuration, 0)
    const averageTestDuration = totalTests > 0 ? totalDuration / totalTests : 0

    return {
      totalTests,
      successfulTests,
      failedTests,
      totalDuration,
      averageTestDuration
    }
  }

  /**
   * Analyser les patterns d'erreurs pour identifier les problèmes récurrents
   */
  private async analyzeErrorPatterns(testSummaries: TestExecutionSummary[]): Promise<ErrorPattern[]> {
    const errorMap = new Map<string, {
      type: ErrorPattern['type']
      errors: Array<{ testId: string, stepName: string, error: string, screenshot?: string }>
    }>()

    // Parcourir tous les tests et collecter les erreurs
    for (const test of testSummaries) {
      // Simuler la lecture des steps détaillés (en réalité, ils viendraient des logs)
      const errorSteps = [] // TODO: Charger depuis les logs structurés

      for (const error of errorSteps) {
        const errorType = this.categorizeError(error.message || '')
        const key = `${errorType}-${this.normalizeErrorMessage(error.message || '')}`

        if (!errorMap.has(key)) {
          errorMap.set(key, { type: errorType, errors: [] })
        }

        errorMap.get(key)!.errors.push({
          testId: test.testId,
          stepName: error.stepName || 'unknown',
          error: error.message || '',
          screenshot: error.screenshot
        })
      }
    }

    // Convertir en patterns avec recommandations
    const patterns: ErrorPattern[] = []
    for (const [key, data] of errorMap.entries()) {
      if (data.errors.length >= 2) { // Pattern si au moins 2 occurrences
        patterns.push({
          type: data.type,
          frequency: data.errors.length,
          examples: data.errors.slice(0, 3), // Max 3 exemples
          recommendation: this.getErrorRecommendation(data.type, data.errors[0].error),
          severity: this.assessErrorSeverity(data.type, data.errors.length)
        })
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Analyser les problèmes de performance
   */
  private analyzePerformanceIssues(testSummaries: TestExecutionSummary[]): PerformanceIssue[] {
    const issues: PerformanceIssue[] = []

    // Analyser les étapes lentes
    const slowSteps: Array<{
      testId: string
      stepName: string
      duration: number
      threshold: number
    }> = []

    for (const test of testSummaries) {
      // TODO: Analyser les steps individuels depuis les logs
      if (test.performanceReport.stepDuration > 5000) { // Plus de 5 secondes
        slowSteps.push({
          testId: test.testId,
          stepName: 'overall', // Remplacer par steps réels
          duration: test.performanceReport.stepDuration,
          threshold: 5000
        })
      }
    }

    if (slowSteps.length > 0) {
      issues.push({
        type: 'slow_step',
        affectedSteps: slowSteps,
        recommendation: this.getPerformanceRecommendation('slow_step', slowSteps),
        impact: slowSteps.length > 5 ? 'high' : 'medium'
      })
    }

    // Analyser la mémoire
    const memoryIssues = testSummaries.filter(t =>
      t.performanceReport.memoryUsage &&
      t.performanceReport.memoryUsage.heapUsed > 512 * 1024 * 1024 // > 512MB
    )

    if (memoryIssues.length > 0) {
      issues.push({
        type: 'memory_leak',
        affectedSteps: memoryIssues.map(t => ({
          testId: t.testId,
          stepName: 'memory_usage',
          duration: 0,
          threshold: 512 * 1024 * 1024
        })),
        recommendation: 'Surveiller l\'utilisation mémoire et optimiser les gros objets',
        impact: 'medium'
      })
    }

    return issues
  }

  /**
   * Analyser la stabilité des tests
   */
  private analyzeStabilityMetrics(testSummaries: TestExecutionSummary[]): TestStabilityMetrics {
    const totalTests = testSummaries.length
    const successfulTests = testSummaries.filter(t => t.errorSteps === 0).length
    const overallSuccessRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0

    // Analyser l'historique pour détecter les tests flaky
    const testsByName = new Map<string, { successes: number, failures: number }>()

    for (const test of this.testHistory) {
      const name = test.testName
      if (!testsByName.has(name)) {
        testsByName.set(name, { successes: 0, failures: 0 })
      }

      const stats = testsByName.get(name)!
      if (test.errorSteps === 0) {
        stats.successes++
      } else {
        stats.failures++
      }
    }

    const flakyTests = Array.from(testsByName.entries())
      .filter(([_, stats]) => stats.failures > 0 && stats.successes > 0)
      .map(([name, stats]) => ({
        testName: name,
        failures: stats.failures,
        total: stats.successes + stats.failures,
        failureRate: (stats.failures / (stats.successes + stats.failures)) * 100
      }))
      .filter(t => t.failureRate > 10 && t.total >= 3) // Au moins 10% d'échec sur 3+ exécutions
      .sort((a, b) => b.failureRate - a.failureRate)

    return {
      overallSuccessRate,
      flakyTests,
      mostUnstableSteps: [] // TODO: Analyser les steps individuels
    }
  }

  /**
   * Analyser les captures d'écran pour détecter les problèmes visuels
   */
  private async analyzeScreenshots(testSummaries: TestExecutionSummary[]) {
    const errorScreenshots: string[] = []
    const comparisons: Array<{ before: string, after: string, diff?: string }> = []

    for (const test of testSummaries) {
      // Collecter les screenshots d'erreur
      errorScreenshots.push(...test.screenshots.filter(s => s.includes('error')))
    }

    // TODO: Implémenter la comparaison visuelle de screenshots
    // Cela pourrait utiliser une librairie comme pixelmatch pour détecter les régressions visuelles

    return {
      errors: errorScreenshots,
      comparisons
    }
  }

  /**
   * Générer des recommandations intelligentes basées sur l'analyse
   */
  private generateRecommendations(analysis: DebuggerAnalysis) {
    const recommendations: DebuggerAnalysis['recommendations'] = []

    // Recommandations basées sur le taux de succès
    if (analysis.summary.successfulTests / analysis.summary.totalTests < 0.8) {
      recommendations.push({
        priority: 'high',
        category: 'stability',
        description: 'Taux de succès des tests inférieur à 80%',
        actionItems: [
          'Identifier les tests les plus instables',
          'Améliorer la sélection des éléments DOM',
          'Ajouter des attentes explicites',
          'Revoir les données de test'
        ],
        estimatedImpact: 'Réduction de 50% des échecs de tests'
      })
    }

    // Recommandations basées sur les patterns d'erreur
    const criticalErrors = analysis.errorPatterns.filter(p => p.severity === 'critical')
    if (criticalErrors.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'stability',
        description: `${criticalErrors.length} patterns d'erreurs critiques détectés`,
        actionItems: criticalErrors.map(e => e.recommendation),
        estimatedImpact: 'Élimination des erreurs bloquantes'
      })
    }

    // Recommandations de performance
    const highImpactPerf = analysis.performanceIssues.filter(i => i.impact === 'high')
    if (highImpactPerf.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        description: 'Problèmes de performance détectés',
        actionItems: highImpactPerf.map(i => i.recommendation),
        estimatedImpact: 'Réduction de 30% du temps d\'exécution'
      })
    }

    // Recommandations de maintenance
    if (analysis.stabilityMetrics.flakyTests.length > 3) {
      recommendations.push({
        priority: 'medium',
        category: 'maintenance',
        description: `${analysis.stabilityMetrics.flakyTests.length} tests instables détectés`,
        actionItems: [
          'Revoir la logique d\'attente dans les tests instables',
          'Améliorer l\'isolation des tests',
          'Standardiser les données de test',
          'Ajouter des retry intelligents'
        ],
        estimatedImpact: 'Amélioration de 25% de la fiabilité'
      })
    }

    return recommendations.sort((a, b) => {
      const priorities = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorities[b.priority] - priorities[a.priority]
    })
  }

  // Méthodes utilitaires pour categoriser et analyser les erreurs

  private categorizeError(errorMessage: string): ErrorPattern['type'] {
    const message = errorMessage.toLowerCase()

    if (message.includes('timeout') || message.includes('waiting')) {
      return 'timeout'
    } else if (message.includes('selector') || message.includes('element') || message.includes('locator')) {
      return 'selector'
    } else if (message.includes('network') || message.includes('fetch') || message.includes('xhr')) {
      return 'network'
    } else if (message.includes('auth') || message.includes('login') || message.includes('unauthorized')) {
      return 'authentication'
    } else if (message.includes('data') || message.includes('null') || message.includes('undefined')) {
      return 'data'
    } else if (message.includes('slow') || message.includes('performance')) {
      return 'performance'
    }

    return 'unknown'
  }

  private normalizeErrorMessage(message: string): string {
    return message
      .replace(/\d+/g, 'N') // Remplacer les nombres par N
      .replace(/["'].*?["']/g, 'STRING') // Remplacer les strings par STRING
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
  }

  private getErrorRecommendation(type: ErrorPattern['type'], example: string): string {
    const recommendations = {
      timeout: 'Augmenter les timeouts ou ajouter des attentes explicites avec page.waitForSelector()',
      selector: 'Utiliser des sélecteurs plus robustes (data-testid) et vérifier la stabilité DOM',
      network: 'Ajouter la gestion des requêtes réseau et des mocks si nécessaire',
      authentication: 'Vérifier les credentials de test et la session management',
      data: 'Améliorer la validation des données et ajouter des vérifications null-safety',
      performance: 'Optimiser les étapes lentes et ajouter du monitoring de performance',
      unknown: 'Analyser manuellement cette erreur pour déterminer la cause root'
    }

    return recommendations[type] || recommendations.unknown
  }

  private assessErrorSeverity(type: ErrorPattern['type'], frequency: number): ErrorPattern['severity'] {
    if (frequency >= 5) return 'critical'
    if (frequency >= 3) return 'high'
    if (frequency >= 2) return 'medium'
    return 'low'
  }

  private getPerformanceRecommendation(type: PerformanceIssue['type'], steps: any[]): string {
    const recommendations = {
      slow_step: `${steps.length} étapes lentes détectées. Optimiser les sélecteurs et réduire les attentes inutiles`,
      memory_leak: 'Fuites mémoire potentielles. Vérifier la gestion des ressources et optimiser les objets volumineux',
      network_bottleneck: 'Goulots d\'étranglement réseau. Optimiser les requêtes et ajouter de la mise en cache',
      rendering_lag: 'Lenteur de rendu. Optimiser les interactions DOM et réduire la complexité visuelle'
    }

    return recommendations[type] || 'Analyser manuellement ce problème de performance'
  }

  // Méthodes de sauvegarde et chargement

  private async loadTestHistory(): Promise<void> {
    try {
      const data = await fs.readFile(this.testHistoryFile, 'utf-8')
      this.testHistory = JSON.parse(data)
    } catch (error) {
      this.testHistory = [] // Nouveau fichier d'historique
    }
  }

  private async saveTestHistory(): Promise<void> {
    // Garder seulement les 100 derniers tests pour éviter un fichier trop volumineux
    const recentHistory = this.testHistory.slice(-100)
    await fs.writeFile(this.testHistoryFile, JSON.stringify(recentHistory, null, 2))
  }

  private async saveAnalysis(analysis: DebuggerAnalysis): Promise<void> {
    // Sauvegarder le rapport JSON complet
    await fs.writeFile(analysis.reportPaths.json, JSON.stringify(analysis, null, 2))

    // Sauvegarder le rapport détaillé avec plus d'informations
    const detailedAnalysis = {
      ...analysis,
      rawData: {
        testHistory: this.testHistory.slice(-10), // 10 derniers tests pour contexte
        environmentInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      }
    }

    await fs.writeFile(analysis.reportPaths.detailed, JSON.stringify(detailedAnalysis, null, 2))

    // Générer le rapport HTML
    await this.generateHTMLReport(analysis)
  }

  private async generateHTMLReport(analysis: DebuggerAnalysis): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEIDO E2E Test Analysis - ${analysis.testRunId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; margin-top: 5px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .error-pattern { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
        .performance-issue { background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
        .recommendation { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
        .priority-critical { border-left: 4px solid #dc2626; }
        .priority-high { border-left: 4px solid #ea580c; }
        .priority-medium { border-left: 4px solid #ca8a04; }
        .priority-low { border-left: 4px solid #65a30d; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .screenshot { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .screenshot img { width: 100%; height: auto; }
        .screenshot-caption { padding: 10px; font-size: 0.9em; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 SEIDO E2E Test Analysis</h1>
            <p><strong>Run ID:</strong> ${analysis.testRunId}</p>
            <p><strong>Analyzed at:</strong> ${new Date(analysis.analysisTimestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${analysis.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${analysis.summary.successfulTests}</div>
                <div class="metric-label">Successful</div>
            </div>
            <div class="metric">
                <div class="metric-value">${analysis.summary.failedTests}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(analysis.summary.averageTestDuration / 1000)}s</div>
                <div class="metric-label">Avg Duration</div>
            </div>
        </div>

        <div class="section">
            <h2>🔥 Critical Recommendations</h2>
            ${analysis.recommendations.map(rec => `
                <div class="recommendation priority-${rec.priority}">
                    <h3>${rec.description}</h3>
                    <p><strong>Category:</strong> ${rec.category} | <strong>Priority:</strong> ${rec.priority}</p>
                    <ul>
                        ${rec.actionItems.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                    <p><em>Estimated Impact: ${rec.estimatedImpact}</em></p>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>⚠️ Error Patterns</h2>
            ${analysis.errorPatterns.map(pattern => `
                <div class="error-pattern">
                    <h3>${pattern.type} (${pattern.frequency} occurrences)</h3>
                    <p><strong>Severity:</strong> ${pattern.severity}</p>
                    <p><strong>Recommendation:</strong> ${pattern.recommendation}</p>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🚀 Performance Issues</h2>
            ${analysis.performanceIssues.map(issue => `
                <div class="performance-issue">
                    <h3>${issue.type} (${issue.affectedSteps.length} affected steps)</h3>
                    <p><strong>Impact:</strong> ${issue.impact}</p>
                    <p><strong>Recommendation:</strong> ${issue.recommendation}</p>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📊 Stability Metrics</h2>
            <p><strong>Overall Success Rate:</strong> ${Math.round(analysis.stabilityMetrics.overallSuccessRate)}%</p>
            <p><strong>Flaky Tests:</strong> ${analysis.stabilityMetrics.flakyTests.length}</p>
            ${analysis.stabilityMetrics.flakyTests.map(flaky => `
                <div style="margin-left: 20px; margin-bottom: 10px;">
                    <strong>${flaky.testName}</strong>: ${Math.round(flaky.failureRate)}% failure rate (${flaky.failures}/${flaky.total})
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📸 Error Screenshots</h2>
            <div class="screenshots">
                ${analysis.screenshots.errors.slice(0, 6).map(screenshot => `
                    <div class="screenshot">
                        <div class="screenshot-caption">${path.basename(screenshot)}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>📋 Raw Data</h2>
            <p><strong>JSON Report:</strong> <a href="${path.basename(analysis.reportPaths.json)}">${path.basename(analysis.reportPaths.json)}</a></p>
            <p><strong>Detailed Data:</strong> <a href="${path.basename(analysis.reportPaths.detailed)}">${path.basename(analysis.reportPaths.detailed)}</a></p>
        </div>
    </div>
</body>
</html>
    `

    await fs.writeFile(analysis.reportPaths.html, html)
  }
}

/**
 * Factory function pour créer l'agent debugger
 */
export function createSeidoDebugger(): SeidoDebuggerAgent {
  return new SeidoDebuggerAgent()
}