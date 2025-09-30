/**
 * 🎯 MASTER TEST RUNNER - Orchestration Complète des Tests avec Auto-Healing
 *
 * Ce runner exécute TOUTES les suites de tests (auth, contacts, workflows, performance)
 * avec système d'auto-healing intelligent basé sur agents spécialisés.
 *
 * Workflow:
 * 1. Lance toutes les test suites enabled
 * 2. Collecte résultats avec Pino logging
 * 3. Sur échec : Agent Coordinator → Debugger Analysis → Specialized Agent Fix
 * 4. Retry test (max 5 cycles)
 * 5. Si toujours en échec après 5 cycles : demande aide utilisateur
 * 6. Génère rapport final exhaustif
 *
 * Agents utilisés:
 * - seido-debugger : Analyse logs et diagnostic
 * - backend-developer : Corrections Server Actions, middleware, DAL
 * - API-designer : Corrections routes API, endpoints
 * - tester : Corrections selectors, timeouts, infrastructure tests
 */

import { spawn } from 'child_process'
import { TEST_SUITES, getEnabledSuites, getCriticalSuites, type TestSuiteConfig } from './test-suite-config'
import { AgentCoordinator, type AgentTask, type DebuggerAnalysis, type AgentExecutionResult } from '../auto-healing/agent-coordinator'
import type { ErrorContext, AutoFixResult } from '../auto-healing/config'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Configuration du Master Runner
 */
interface MasterRunnerConfig {
  mode: 'all' | 'critical' | 'by-tag'
  tag?: string
  maxRetries: number // Max 5 cycles d'auto-healing par défaut
  generateReport: boolean
  stopOnFirstFailure: boolean
  logLevel: 'verbose' | 'normal' | 'minimal'
}

/**
 * Résultat d'exécution d'une test suite
 */
interface TestSuiteResult {
  suite: TestSuiteConfig
  status: 'passed' | 'failed' | 'fixed' | 'skipped'
  attempts: number
  duration: number
  errors: ErrorContext[]
  fixes: AutoFixResult[]
  agentActions: AgentExecutionResult[]
  logs: string[]
}

/**
 * Rapport final du Master Runner
 */
interface MasterRunnerReport {
  startTime: Date
  endTime: Date
  totalDuration: number
  config: MasterRunnerConfig
  results: TestSuiteResult[]
  summary: {
    total: number
    passed: number
    failed: number
    fixed: number
    skipped: number
    criticalFailures: number
  }
  agentUsage: {
    [agentType: string]: {
      timesUsed: number
      successRate: number
      totalDuration: number
    }
  }
  recommendations: string[]
}

/**
 * Master Test Runner
 */
export class MasterTestRunner {
  private config: MasterRunnerConfig
  private coordinator: AgentCoordinator
  private results: TestSuiteResult[] = []
  private startTime: Date | null = null

  constructor(config: Partial<MasterRunnerConfig> = {}) {
    this.config = {
      mode: config.mode || 'all',
      tag: config.tag,
      maxRetries: config.maxRetries || 5,
      generateReport: config.generateReport !== false,
      stopOnFirstFailure: config.stopOnFirstFailure || false,
      logLevel: config.logLevel || 'normal'
    }

    this.coordinator = new AgentCoordinator()
  }

  /**
   * 🚀 Point d'entrée principal : Lance tous les tests avec auto-healing
   */
  async run(): Promise<MasterRunnerReport> {
    this.startTime = new Date()
    console.log('\n' + '='.repeat(80))
    console.log('🎯 MASTER TEST RUNNER - Démarrage')
    console.log('='.repeat(80))
    console.log(`Mode: ${this.config.mode}`)
    console.log(`Max Retries: ${this.config.maxRetries}`)
    console.log(`Log Level: ${this.config.logLevel}`)
    console.log('='.repeat(80) + '\n')

    // Sélectionner les test suites à exécuter
    const suitesToRun = this.selectTestSuites()
    console.log(`📋 ${suitesToRun.length} test suite(s) sélectionnée(s)\n`)

    // Exécuter chaque test suite
    for (const suite of suitesToRun) {
      console.log(`\n${'▶'.repeat(40)}`)
      console.log(`▶ Exécution: ${suite.name}`)
      console.log(`▶ Description: ${suite.description}`)
      console.log(`▶ Critical: ${suite.critical ? '⚠️ OUI' : 'Non'}`)
      console.log(`${'▶'.repeat(40)}\n`)

      const result = await this.runTestSuite(suite)
      this.results.push(result)

      // Afficher le résultat
      this.printSuiteResult(result)

      // Stop on first failure si configuré
      if (this.config.stopOnFirstFailure && result.status === 'failed') {
        console.log('\n⛔ Stop on first failure activé - Arrêt du runner\n')
        break
      }
    }

    // Générer le rapport final
    const report = this.generateReport()

    // Afficher le rapport
    this.printReport(report)

    // Sauvegarder le rapport si configuré
    if (this.config.generateReport) {
      await this.saveReport(report)
    }

    return report
  }

  /**
   * Exécute une test suite avec auto-healing (max 5 cycles)
   */
  private async runTestSuite(suite: TestSuiteConfig): Promise<TestSuiteResult> {
    const startTime = Date.now()
    const logs: string[] = []
    const errors: ErrorContext[] = []
    const fixes: AutoFixResult[] = []
    const agentActions: AgentExecutionResult[] = []

    let attempt = 0
    let status: 'passed' | 'failed' | 'fixed' = 'failed'

    // Boucle d'auto-healing (max maxRetries cycles)
    while (attempt < this.config.maxRetries) {
      attempt++

      logs.push(`\n[ATTEMPT ${attempt}/${this.config.maxRetries}] Running test suite...`)
      console.log(`\n🔄 [ATTEMPT ${attempt}/${this.config.maxRetries}] Exécution de ${suite.name}...`)

      // Exécuter la test suite
      const executionResult = await this.executeTestSuite(suite)

      if (executionResult.success) {
        logs.push(`[ATTEMPT ${attempt}] ✅ Test suite passed`)
        console.log(`✅ [ATTEMPT ${attempt}] ${suite.name} - Tests passés avec succès`)

        status = attempt === 1 ? 'passed' : 'fixed'
        break
      }

      // Test échoué - Analyser et corriger
      logs.push(`[ATTEMPT ${attempt}] ❌ Test suite failed`)
      console.log(`❌ [ATTEMPT ${attempt}] ${suite.name} - Tests échoués`)

      // Extraire l'erreur du résultat
      const errorContext = this.extractErrorContext(executionResult, suite)
      errors.push(errorContext)

      // Si dernière tentative, ne pas essayer de corriger
      if (attempt >= this.config.maxRetries) {
        logs.push(`[ATTEMPT ${attempt}] ⛔ Max retries reached - Giving up`)
        console.log(`\n⛔ Max retries (${this.config.maxRetries}) atteint pour ${suite.name}`)
        console.log('   → Intervention manuelle requise\n')
        status = 'failed'
        break
      }

      // Analyser l'erreur avec le Debugger Agent
      logs.push(`[ATTEMPT ${attempt}] 🧠 Analyzing error with debugger agent...`)
      console.log(`\n🧠 [AUTO-HEALING] Analyse de l'erreur avec debugger agent...`)

      const analysis = await this.coordinator.analyzeError(errorContext)
      logs.push(`[ATTEMPT ${attempt}] Root cause: ${analysis.rootCause}`)
      logs.push(`[ATTEMPT ${attempt}] Recommended agent: ${analysis.recommendedAgent}`)

      // Créer le plan d'action
      const actionPlan = this.coordinator.createActionPlan(analysis, errorContext)

      // Exécuter les agents du plan
      for (const task of actionPlan) {
        logs.push(`[ATTEMPT ${attempt}] 🤖 Executing ${task.agent} agent...`)

        const agentResult = await this.coordinator.executeAgent(task)
        agentActions.push(agentResult)

        logs.push(...agentResult.logs.map(log => `[ATTEMPT ${attempt}] ${log}`))

        if (agentResult.fixApplied) {
          fixes.push(agentResult.fixApplied)
          logs.push(`[ATTEMPT ${attempt}] ✅ Fix applied by ${task.agent}`)
          console.log(`✅ [AUTO-HEALING] Fix appliqué par ${task.agent}`)
        }
      }

      // Attendre un peu pour que les changements soient pris en compte
      logs.push(`[ATTEMPT ${attempt}] ⏳ Waiting for hot-reload...`)
      console.log(`⏳ Attente du hot-reload (2s)...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    const duration = Date.now() - startTime

    return {
      suite,
      status,
      attempts: attempt,
      duration,
      errors,
      fixes,
      agentActions,
      logs
    }
  }

  /**
   * Exécute une test suite Playwright
   */
  private async executeTestSuite(suite: TestSuiteConfig): Promise<{
    success: boolean
    output: string
    error?: string
  }> {
    return new Promise((resolve) => {
      const configArg = suite.config ? `--config=${suite.config}` : ''
      const command = suite.command.includes('npx playwright')
        ? suite.command.replace('npx playwright test', `npx playwright test ${configArg}`)
        : `${suite.command} ${configArg}`

      console.log(`   📝 Command: ${command}`)

      const child = spawn(command, {
        shell: true,
        timeout: suite.timeout,
        cwd: process.cwd()
      })

      let output = ''
      let errorOutput = ''

      child.stdout?.on('data', (data) => {
        const text = data.toString()
        output += text
        if (this.config.logLevel === 'verbose') {
          process.stdout.write(text)
        }
      })

      child.stderr?.on('data', (data) => {
        const text = data.toString()
        errorOutput += text
        if (this.config.logLevel === 'verbose') {
          process.stderr.write(text)
        }
      })

      child.on('close', (code) => {
        const success = code === 0

        resolve({
          success,
          output: output + errorOutput,
          error: success ? undefined : errorOutput
        })
      })

      child.on('error', (error) => {
        resolve({
          success: false,
          output,
          error: error.message
        })
      })
    })
  }

  /**
   * Extrait le contexte d'erreur depuis le résultat Playwright
   */
  private extractErrorContext(
    executionResult: { success: boolean; output: string; error?: string },
    suite: TestSuiteConfig
  ): ErrorContext {
    const output = executionResult.output + (executionResult.error || '')

    // Détecter le type d'erreur depuis l'output
    let errorType: ErrorContext['error']['type'] = 'unknown'
    let errorMessage = 'Test failed'
    let stackTrace = ''

    if (output.includes('redirect()')) {
      errorType = 'redirect'
      errorMessage = 'Server Action redirect() issue detected'
    } else if (output.includes('Timeout') || output.includes('timeout')) {
      errorType = 'timeout'
      errorMessage = 'Test timeout detected'
    } else if (output.includes('locator') || output.includes('selector')) {
      errorType = 'selector'
      errorMessage = 'Element selector issue detected'
    } else if (output.includes('network') || output.includes('fetch') || output.includes('API')) {
      errorType = 'network'
      errorMessage = 'Network/API issue detected'
    } else if (output.includes('auth') || output.includes('session') || output.includes('unauthorized')) {
      errorType = 'authentication'
      errorMessage = 'Authentication issue detected'
    }

    // Extraire la stack trace si disponible
    const stackMatch = output.match(/at .+:\d+:\d+/g)
    if (stackMatch) {
      stackTrace = stackMatch.slice(0, 5).join('\n')
    }

    return {
      test: {
        name: suite.name,
        file: suite.command
      },
      error: {
        type: errorType,
        message: errorMessage,
        stack: stackTrace
      },
      timestamp: new Date(),
      testOutput: output.substring(0, 2000) // Limiter la taille
    }
  }

  /**
   * Sélectionne les test suites à exécuter selon la config
   */
  private selectTestSuites(): TestSuiteConfig[] {
    switch (this.config.mode) {
      case 'critical':
        return getCriticalSuites()

      case 'by-tag':
        if (!this.config.tag) {
          throw new Error('Tag requis pour mode by-tag')
        }
        return Object.values(TEST_SUITES).filter(
          suite => suite.enabled && suite.tags.includes(this.config.tag!)
        )

      case 'all':
      default:
        return getEnabledSuites()
    }
  }

  /**
   * Génère le rapport final
   */
  private generateReport(): MasterRunnerReport {
    const endTime = new Date()
    const totalDuration = endTime.getTime() - (this.startTime?.getTime() || 0)

    // Calculer le summary
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      fixed: this.results.filter(r => r.status === 'fixed').length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
      criticalFailures: this.results.filter(r => r.status === 'failed' && r.suite.critical).length
    }

    // Calculer l'usage des agents
    const agentUsage: MasterRunnerReport['agentUsage'] = {}

    for (const result of this.results) {
      for (const action of result.agentActions) {
        if (!agentUsage[action.agent]) {
          agentUsage[action.agent] = {
            timesUsed: 0,
            successRate: 0,
            totalDuration: 0
          }
        }

        agentUsage[action.agent].timesUsed++
        agentUsage[action.agent].totalDuration += action.duration
      }
    }

    // Calculer les success rates
    for (const agent in agentUsage) {
      const successCount = this.results
        .flatMap(r => r.agentActions)
        .filter(a => a.agent === agent && a.success)
        .length

      agentUsage[agent].successRate = successCount / agentUsage[agent].timesUsed
    }

    // Générer les recommandations
    const recommendations: string[] = []

    if (summary.failed > 0) {
      recommendations.push(`⚠️ ${summary.failed} test suite(s) ont échoué après ${this.config.maxRetries} tentatives`)
      recommendations.push('→ Vérifier les logs et corriger manuellement')
    }

    if (summary.criticalFailures > 0) {
      recommendations.push(`🚨 ${summary.criticalFailures} CRITICAL test suite(s) ont échoué`)
      recommendations.push('→ Intervention URGENTE requise')
    }

    if (summary.fixed > 0) {
      recommendations.push(`✅ ${summary.fixed} test suite(s) ont été corrigées automatiquement`)
      recommendations.push('→ Vérifier et committer les corrections')
    }

    // Recommandations par agent
    for (const agent in agentUsage) {
      const usage = agentUsage[agent]
      if (usage.successRate < 0.5 && usage.timesUsed > 2) {
        recommendations.push(`⚠️ Agent ${agent} a un faible taux de succès (${Math.round(usage.successRate * 100)}%)`)
        recommendations.push(`→ Améliorer la logique de correction de cet agent`)
      }
    }

    return {
      startTime: this.startTime!,
      endTime,
      totalDuration,
      config: this.config,
      results: this.results,
      summary,
      agentUsage,
      recommendations
    }
  }

  /**
   * Affiche le résultat d'une test suite
   */
  private printSuiteResult(result: TestSuiteResult): void {
    const icon =
      result.status === 'passed' ? '✅' :
      result.status === 'fixed' ? '🔧' :
      result.status === 'failed' ? '❌' :
      '⏭️'

    console.log(`\n${icon} ${result.suite.name} - ${result.status.toUpperCase()}`)
    console.log(`   Durée: ${(result.duration / 1000).toFixed(1)}s`)
    console.log(`   Tentatives: ${result.attempts}`)

    if (result.fixes.length > 0) {
      console.log(`   Corrections: ${result.fixes.length}`)
    }

    if (result.errors.length > 0) {
      console.log(`   Erreurs: ${result.errors.length}`)
    }
  }

  /**
   * Affiche le rapport final
   */
  private printReport(report: MasterRunnerReport): void {
    console.log('\n' + '='.repeat(80))
    console.log('📊 RAPPORT FINAL - MASTER TEST RUNNER')
    console.log('='.repeat(80))
    console.log(`Durée totale: ${(report.totalDuration / 1000).toFixed(1)}s`)
    console.log(`Démarrage: ${report.startTime.toLocaleString()}`)
    console.log(`Fin: ${report.endTime.toLocaleString()}`)
    console.log('\n📈 RÉSUMÉ:')
    console.log(`   Total: ${report.summary.total}`)
    console.log(`   ✅ Passés: ${report.summary.passed}`)
    console.log(`   🔧 Corrigés: ${report.summary.fixed}`)
    console.log(`   ❌ Échoués: ${report.summary.failed}`)
    console.log(`   🚨 Critical Failures: ${report.summary.criticalFailures}`)

    console.log('\n🤖 USAGE DES AGENTS:')
    for (const [agent, usage] of Object.entries(report.agentUsage)) {
      console.log(`   ${agent}:`)
      console.log(`      Utilisations: ${usage.timesUsed}`)
      console.log(`      Taux de succès: ${Math.round(usage.successRate * 100)}%`)
      console.log(`      Durée totale: ${(usage.totalDuration / 1000).toFixed(1)}s`)
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMANDATIONS:')
      for (const rec of report.recommendations) {
        console.log(`   ${rec}`)
      }
    }

    console.log('\n' + '='.repeat(80) + '\n')
  }

  /**
   * Sauvegarde le rapport au format JSON
   */
  private async saveReport(report: MasterRunnerReport): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'docs', 'refacto', 'Tests', 'reports')

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `master-runner-report-${timestamp}.json`
    const filepath = path.join(reportsDir, filename)

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8')

    console.log(`📄 Rapport sauvegardé: ${filepath}`)

    // Créer aussi un lien "latest"
    const latestPath = path.join(reportsDir, 'master-runner-report-latest.json')
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf-8')
  }

  /**
   * Reset pour nouvelle exécution
   */
  reset(): void {
    this.results = []
    this.startTime = null
    this.coordinator.reset()
  }
}

/**
 * 🚀 CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2)

  const config: Partial<MasterRunnerConfig> = {
    mode: 'all',
    maxRetries: 5,
    generateReport: true,
    stopOnFirstFailure: false,
    logLevel: 'normal'
  }

  // Parser les arguments CLI
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--critical') {
      config.mode = 'critical'
    } else if (arg === '--tag') {
      config.mode = 'by-tag'
      config.tag = args[++i]
    } else if (arg === '--max-retries') {
      config.maxRetries = parseInt(args[++i], 10)
    } else if (arg === '--stop-on-failure') {
      config.stopOnFirstFailure = true
    } else if (arg === '--verbose') {
      config.logLevel = 'verbose'
    } else if (arg === '--minimal') {
      config.logLevel = 'minimal'
    }
  }

  const runner = new MasterTestRunner(config)

  try {
    const report = await runner.run()

    // Exit code selon le résultat
    if (report.summary.failed > 0) {
      process.exit(1)
    } else {
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Master Runner Error:', error)
    process.exit(1)
  }
}

// Si exécuté directement
if (require.main === module) {
  main()
}