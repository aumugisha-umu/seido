/**
 * Auto-Healing Orchestrator
 * Coordonne le système complet de correction automatique des tests E2E
 *
 * Version 2.0: Intégration avec système multi-agents
 * - seido-debugger: Analyse et diagnostic
 * - backend-developer: Corrections Server Actions, middleware, DAL
 * - API-designer: Corrections routes API, endpoints
 * - tester: Corrections selectors, timeouts, infrastructure
 */

import { Page } from '@playwright/test'
import * as fs from 'fs/promises'
import * as path from 'path'
import { ErrorContextCollector } from './error-context-collector'
import { AgentCoordinator, type AgentExecutionResult } from './agent-coordinator'
import {
import { logger, logError } from '@/lib/logger'
  AutoHealingConfig,
  DEFAULT_AUTO_HEALING_CONFIG,
  type ErrorContext,
  type AutoFixResult,
  type HealingCycleReport,
  type AutoHealingReport
} from './config'

export class AutoHealingOrchestrator {
  private config: AutoHealingConfig
  private errorCollector: ErrorContextCollector
  private agentCoordinator: AgentCoordinator
  private cycleReports: HealingCycleReport[] = []
  private reportsDir: string

  constructor(config?: Partial<AutoHealingConfig>) {
    this.config = { ...DEFAULT_AUTO_HEALING_CONFIG, ...config }
    this.errorCollector = new ErrorContextCollector()
    this.agentCoordinator = new AgentCoordinator()
    this.reportsDir = path.resolve(__dirname, '../auto-healing-artifacts/reports')
  }

  /**
   * Démarrer le processus d'auto-healing pour une erreur
   */
  async heal(
    testId: string,
    testName: string,
    userRole: string,
    error: Error,
    step: string,
    page: Page,
    expectedUrl?: string
  ): Promise<AutoHealingReport> {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🤖 [AUTO-HEALING] Starting auto-healing process for: ${testName}`)
    console.log(`${'='.repeat(80)}\n`)

    const startTime = Date.now()

    // Collecter le contexte initial de l'erreur
    const initialContext = await this.errorCollector.collect(
      testId,
      testName,
      userRole,
      error,
      step,
      page,
      expectedUrl
    )

    // Boucle d'auto-healing
    let resolved = false
    let attemptNumber = 0

    while (!resolved && attemptNumber < this.config.maxRetries) {
      attemptNumber++
      console.log(`\n🔄 [AUTO-HEALING] Attempt ${attemptNumber}/${this.config.maxRetries}`)

      const cycleReport = await this.runHealingCycle(
        initialContext,
        attemptNumber,
        page
      )

      this.cycleReports.push(cycleReport)

      // Vérifier si le problème est résolu
      if (cycleReport.testResult.passed) {
        resolved = true
        console.log(`\n✅ [AUTO-HEALING] Problem resolved after ${attemptNumber} attempt(s)!`)
        break
      }

      // Attendre avant le prochain retry
      if (attemptNumber < this.config.maxRetries) {
        console.log(`⏳ [AUTO-HEALING] Waiting ${this.config.retryDelay}ms before next attempt...`)
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
      }
    }

    const totalDuration = Date.now() - startTime

    // Générer le rapport final
    const finalReport: AutoHealingReport = {
      testName,
      initialError: initialContext,
      cycles: this.cycleReports,
      finalResult: {
        resolved,
        totalAttempts: attemptNumber,
        totalDuration,
        successfulCycle: resolved ? attemptNumber : undefined
      },
      recommendations: this.generateRecommendations(resolved, this.cycleReports),
      artifactsPath: path.resolve(__dirname, '../auto-healing-artifacts'),
      reportPath: await this.saveReport(testName, this.cycleReports, resolved)
    }

    this.printFinalSummary(finalReport)

    return finalReport
  }

  /**
   * Exécuter un cycle complet d'auto-healing avec système multi-agents
   */
  private async runHealingCycle(
    context: ErrorContext,
    attemptNumber: number,
    page: Page
  ): Promise<HealingCycleReport> {
    const cycleStartTime = Date.now()

    console.log(`\n📋 [CYCLE ${attemptNumber}] Starting healing cycle with multi-agent system...`)

    // 1. Analyser l'erreur avec le Debugger Agent
    console.log(`🧠 [CYCLE ${attemptNumber}] Analyzing error with debugger agent...`)
    const analysis = await this.agentCoordinator.analyzeError(context)

    console.log(`🔍 [CYCLE ${attemptNumber}] Analysis complete:`)
    console.log(`   Root Cause: ${analysis.rootCause}`)
    console.log(`   Recommended Agent: ${analysis.recommendedAgent}`)
    console.log(`   Confidence: ${analysis.confidence}`)

    // 2. Créer le plan d'action multi-agents
    console.log(`📋 [CYCLE ${attemptNumber}] Creating action plan...`)
    const actionPlan = this.agentCoordinator.createActionPlan(analysis, context)

    // 3. Exécuter les agents du plan
    const agentResults: AgentExecutionResult[] = []
    let overallSuccess = false
    let fixResult: AutoFixResult | undefined

    for (const task of actionPlan) {
      console.log(`🤖 [CYCLE ${attemptNumber}] Executing ${task.agent} agent...`)

      const agentResult = await this.agentCoordinator.executeAgent(task)
      agentResults.push(agentResult)

      // Si un agent a appliqué un fix, on le récupère
      if (agentResult.fixApplied) {
        fixResult = agentResult.fixApplied
        overallSuccess = agentResult.success
        console.log(`✅ [CYCLE ${attemptNumber}] Fix applied by ${task.agent}:`, fixResult.correction?.description)
      }
    }

    // Si aucun fix n'a été appliqué
    if (!fixResult) {
      console.log(`❌ [CYCLE ${attemptNumber}] No fix could be generated by any agent`)

      return {
        cycleNumber: attemptNumber,
        startTime: new Date(cycleStartTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - cycleStartTime,
        errorContext: context,
        fixApplied: {
          success: false,
          error: 'No agent was able to generate a fix for this error'
        },
        testResult: {
          passed: false,
          error: 'No fix generated',
          duration: 0
        },
        artifacts: {
          screenshots: [],
          logs: agentResults.flatMap(r => r.logs),
          diffs: []
        }
      }
    }

    console.log(`🔧 [CYCLE ${attemptNumber}] Fix details:`)
    console.log(`   Description: ${fixResult.correction?.description}`)
    console.log(`   Confidence: ${fixResult.correction?.confidence}`)
    console.log(`   Files Modified: ${fixResult.correction?.filesModified.length || 0}`)

    // 4. Attendre que les changements soient pris en compte
    console.log(`⏳ [CYCLE ${attemptNumber}] Waiting for code changes to be detected (hot-reload)...`)
    await new Promise(resolve => setTimeout(resolve, 3000)) // 3 secondes pour hot-reload

    // 5. Le test sera relancé par le test runner wrapper
    // On ne peut pas relancer ici car on est dans le contexte d'un test Playwright
    // C'est le wrapper qui gère le retry

    const cycleDuration = Date.now() - cycleStartTime

    return {
      cycleNumber: attemptNumber,
      startTime: new Date(cycleStartTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: cycleDuration,
      errorContext: context,
      fixApplied: fixResult,
      testResult: {
        passed: false, // Will be updated by test runner
        duration: 0
      },
      artifacts: {
        screenshots: [context.state.screenshot],
        logs: agentResults.flatMap(r => r.logs),
        diffs: []
      }
    }
  }

  /**
   * Générer des recommandations basées sur les cycles
   */
  private generateRecommendations(resolved: boolean, cycles: HealingCycleReport[]): string[] {
    const recommendations: string[] = []

    if (resolved) {
      recommendations.push('✅ Le problème a été résolu automatiquement')
      recommendations.push('Vérifier que la correction appliquée est appropriée')
      recommendations.push('Commiter les changements si tout fonctionne correctement')
    } else {
      recommendations.push('❌ Le problème n\'a pas pu être résolu automatiquement')
      recommendations.push('Analyser manuellement les tentatives de correction')
      recommendations.push('Consulter les logs et screenshots générés')

      // Recommandations spécifiques selon les tentatives
      const lastCycle = cycles[cycles.length - 1]
      if (lastCycle?.errorContext.error.type === 'redirect') {
        recommendations.push('Vérifier la logique de redirection dans les Server Actions')
        recommendations.push('S\'assurer que redirect() est appelé hors des try/catch')
      }
    }

    return recommendations
  }

  /**
   * Sauvegarder le rapport final
   */
  private async saveReport(
    testName: string,
    cycles: HealingCycleReport[],
    resolved: boolean
  ): Promise<string> {
    await fs.mkdir(this.reportsDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const reportPath = path.join(
      this.reportsDir,
      `auto-healing-${testName}-${timestamp}.json`
    )

    const report = {
      testName,
      resolved,
      cycles,
      timestamp
    }

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    console.log(`📄 [AUTO-HEALING] Report saved to: ${reportPath}`)

    return reportPath
  }

  /**
   * Afficher le résumé final
   */
  private printFinalSummary(report: AutoHealingReport): void {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 [AUTO-HEALING] FINAL SUMMARY`)
    console.log(`${'='.repeat(80)}`)
    console.log(`Test: ${report.testName}`)
    console.log(`Status: ${report.finalResult.resolved ? '✅ RESOLVED' : '❌ UNRESOLVED'}`)
    console.log(`Total Attempts: ${report.finalResult.totalAttempts}`)
    console.log(`Total Duration: ${(report.finalResult.totalDuration / 1000).toFixed(2)}s`)

    if (report.finalResult.resolved) {
      console.log(`Successful Cycle: #${report.finalResult.successfulCycle}`)
    }

    console.log(`\n📋 Recommendations:`)
    report.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })

    console.log(`\n📁 Artifacts: ${report.artifactsPath}`)
    console.log(`📄 Report: ${report.reportPath}`)
    console.log(`${'='.repeat(80)}\n`)
  }

  /**
   * Obtenir le nombre de cycles exécutés
   */
  getCycleCount(): number {
    return this.cycleReports.length
  }

  /**
   * Obtenir les rapports de cycles
   */
  getCycleReports(): HealingCycleReport[] {
    return this.cycleReports
  }

  /**
   * Réinitialiser l'orchestrateur pour un nouveau test
   */
  reset(): void {
    this.cycleReports = []
    this.agentCoordinator.reset()
  }
}