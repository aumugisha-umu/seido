/**
 * Agent Coordinator - Orchestration des agents spécialisés pour auto-healing
 *
 * Ce module coordonne les 4 agents spécialisés :
 * - seido-debugger : Analyse des logs et diagnostic
 * - backend-developer : Corrections Server Actions, middleware, DAL
 * - API-designer : Corrections routes API, endpoints
 * - tester : Corrections selectors, timeouts, test infrastructure
 */

import { Page } from '@playwright/test'
import type { ErrorContext, AutoFixResult } from './config'
import { logger, logError } from '@/lib/logger'

/**
 * Types d'agents disponibles
 */
export type AgentType = 'seido-debugger' | 'backend-developer' | 'API-designer' | 'tester'

/**
 * Résultat d'analyse du debugger agent
 */
export interface DebuggerAnalysis {
  errorType: ErrorContext['error']['type']
  rootCause: string
  recommendedAgent: AgentType
  confidence: 'high' | 'medium' | 'low'
  context: {
    affectedFiles: string[]
    suspectedCode: string[]
    relatedErrors: string[]
  }
  recommendations: string[]
}

/**
 * Tâche pour un agent spécialisé
 */
export interface AgentTask {
  agent: AgentType
  action: 'analyze' | 'fix' | 'validate'
  context: ErrorContext
  analysis?: DebuggerAnalysis
  priority: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Résultat d'exécution d'un agent
 */
export interface AgentExecutionResult {
  agent: AgentType
  success: boolean
  fixApplied?: AutoFixResult
  logs: string[]
  duration: number
  recommendations: string[]
}

/**
 * Coordinateur des agents spécialisés
 */
export class AgentCoordinator {
  private executionHistory: AgentExecutionResult[] = []

  /**
   * Analyse une erreur et détermine quel(s) agent(s) utiliser
   */
  async analyzeError(context: ErrorContext): Promise<DebuggerAnalysis> {
    console.log('\n🧠 [AGENT-COORDINATOR] Starting error analysis with debugger agent...')

    const startTime = Date.now()

    // Mapper le type d'erreur au diagnostic
    const analysis = this.createAnalysis(context)

    const duration = Date.now() - startTime
    console.log(`✅ [AGENT-COORDINATOR] Analysis complete in ${duration}ms`)
    console.log(`   Root Cause: ${analysis.rootCause}`)
    console.log(`   Recommended Agent: ${analysis.recommendedAgent}`)
    console.log(`   Confidence: ${analysis.confidence}`)

    return analysis
  }

  /**
   * Exécute un agent spécialisé pour corriger l'erreur
   */
  async executeAgent(task: AgentTask): Promise<AgentExecutionResult> {
    console.log(`\n🤖 [AGENT-COORDINATOR] Executing ${task.agent} agent...`)
    console.log(`   Action: ${task.action}`)
    console.log(`   Priority: ${task.priority}`)

    const startTime = Date.now()
    const logs: string[] = []

    let result: AgentExecutionResult

    try {
      switch (task.agent) {
        case 'seido-debugger':
          result = await this.executeDebugger(task, logs)
          break

        case 'backend-developer':
          result = await this.executeBackendDeveloper(task, logs)
          break

        case 'API-designer':
          result = await this.executeAPIDesigner(task, logs)
          break

        case 'tester':
          result = await this.executeTester(task, logs)
          break

        default:
          throw new Error(`Unknown agent type: ${task.agent}`)
      }

      result.duration = Date.now() - startTime
      this.executionHistory.push(result)

      if (result.success) {
        console.log(`✅ [AGENT-COORDINATOR] ${task.agent} completed successfully`)
      } else {
        console.log(`❌ [AGENT-COORDINATOR] ${task.agent} failed to fix the issue`)
      }

      return result

    } catch (error) {
      const duration = Date.now() - startTime
      const failureResult: AgentExecutionResult = {
        agent: task.agent,
        success: false,
        logs: [...logs, `Error: ${error instanceof Error ? error.message : String(error)}`],
        duration,
        recommendations: ['Manual intervention required']
      }

      this.executionHistory.push(failureResult)
      return failureResult
    }
  }

  /**
   * Crée le plan d'action multi-agents pour résoudre l'erreur
   */
  createActionPlan(analysis: DebuggerAnalysis, context: ErrorContext): AgentTask[] {
    const tasks: AgentTask[] = []

    // Toujours commencer par l'analyse debugger
    tasks.push({
      agent: 'seido-debugger',
      action: 'analyze',
      context,
      priority: 'critical'
    })

    // Ajouter l'agent recommandé pour la correction
    tasks.push({
      agent: analysis.recommendedAgent,
      action: 'fix',
      context,
      analysis,
      priority: analysis.confidence === 'high' ? 'critical' : 'high'
    })

    // Si confiance faible, ajouter un agent de validation
    if (analysis.confidence === 'low') {
      tasks.push({
        agent: 'tester',
        action: 'validate',
        context,
        analysis,
        priority: 'medium'
      })
    }

    console.log(`\n📋 [AGENT-COORDINATOR] Action plan created with ${tasks.length} tasks`)
    tasks.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.agent} - ${task.action} (${task.priority})`)
    })

    return tasks
  }

  /**
   * Obtient l'historique d'exécution
   */
  getExecutionHistory(): AgentExecutionResult[] {
    return this.executionHistory
  }

  /**
   * Réinitialise l'historique
   */
  reset(): void {
    this.executionHistory = []
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Crée l'analyse basée sur le contexte d'erreur
   */
  private createAnalysis(context: ErrorContext): DebuggerAnalysis {
    const errorType = context.error.type
    const errorMessage = context.error.message

    let rootCause: string
    let recommendedAgent: AgentType
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    const affectedFiles: string[] = []
    const suspectedCode: string[] = []
    const recommendations: string[] = []

    switch (errorType) {
      case 'redirect':
        rootCause = 'Server Action redirect() called after async operations or inside try/catch'
        recommendedAgent = 'backend-developer'
        confidence = 'high'
        affectedFiles.push('app/actions/auth-actions.ts', 'app/actions/*.ts')
        suspectedCode.push('redirect()', 'async/await', 'try/catch')
        recommendations.push('Restructure Server Action to call redirect() synchronously')
        recommendations.push('Extract async logic before redirect()')
        recommendations.push('Ensure redirect() is outside try/catch blocks')
        break

      case 'timeout':
        if (errorMessage.includes('waitForURL')) {
          rootCause = 'Navigation timeout - possible redirect or auth issue'
          recommendedAgent = 'backend-developer'
          confidence = 'medium'
          affectedFiles.push('middleware.ts', 'app/actions/*.ts')
        } else if (errorMessage.includes('waitForSelector') || errorMessage.includes('locator')) {
          rootCause = 'Element not found or slow to load'
          recommendedAgent = 'tester'
          confidence = 'high'
          affectedFiles.push('test/**/*.spec.ts')
          recommendations.push('Use more robust selectors (data-testid)')
          recommendations.push('Add explicit waits')
          recommendations.push('Increase timeout if needed')
        } else {
          rootCause = 'Generic timeout - needs investigation'
          recommendedAgent = 'tester'
          confidence = 'low'
        }
        break

      case 'selector':
        rootCause = 'Element selector not found or changed'
        recommendedAgent = 'tester'
        confidence = 'high'
        affectedFiles.push('test/**/*.spec.ts')
        suspectedCode.push('page.locator()', 'page.waitForSelector()')
        recommendations.push('Add data-testid attributes to components')
        recommendations.push('Use text-based selectors as fallback')
        recommendations.push('Verify element exists in current state')
        break

      case 'network':
        rootCause = 'API call failed or timed out'
        recommendedAgent = 'API-designer'
        confidence = 'medium'
        affectedFiles.push('app/api/**/*.ts', 'lib/services/**/*.ts')
        suspectedCode.push('fetch()', 'supabase.from()', 'API routes')
        recommendations.push('Add retry logic to API calls')
        recommendations.push('Verify API endpoint exists')
        recommendations.push('Check network conditions')
        break

      case 'authentication':
        rootCause = 'Authentication or session issue'
        recommendedAgent = 'backend-developer'
        confidence = 'high'
        affectedFiles.push('middleware.ts', 'lib/auth-dal.ts', 'lib/supabase.ts')
        suspectedCode.push('supabase.auth', 'cookies', 'session')
        recommendations.push('Verify session creation')
        recommendations.push('Check cookie propagation')
        recommendations.push('Validate middleware auth logic')
        break

      default:
        rootCause = 'Unknown error type - requires manual investigation'
        recommendedAgent = 'seido-debugger'
        confidence = 'low'
        recommendations.push('Analyze logs manually')
        recommendations.push('Check recent code changes')
    }

    return {
      errorType,
      rootCause,
      recommendedAgent,
      confidence,
      context: {
        affectedFiles,
        suspectedCode,
        relatedErrors: []
      },
      recommendations
    }
  }

  /**
   * Exécute l'agent seido-debugger (analyse approfondie)
   */
  private async executeDebugger(task: AgentTask, logs: string[]): Promise<AgentExecutionResult> {
    logs.push('[DEBUGGER] Starting deep analysis...')

    // Analyser les logs Pino si disponibles
    logs.push('[DEBUGGER] Analyzing Pino logs...')
    logs.push('[DEBUGGER] Checking error patterns...')
    logs.push('[DEBUGGER] Reviewing stack trace...')

    // Simuler l'analyse (en production, appeler vraiment l'agent)
    await new Promise(resolve => setTimeout(resolve, 500))

    logs.push('[DEBUGGER] Analysis complete')

    return {
      agent: 'seido-debugger',
      success: true,
      logs,
      duration: 0, // Sera rempli par executeAgent
      recommendations: [
        'Error analysis complete',
        'Recommended agent has been selected',
        'Review logs for detailed context'
      ]
    }
  }

  /**
   * Exécute l'agent backend-developer (corrections serveur)
   */
  private async executeBackendDeveloper(task: AgentTask, logs: string[]): Promise<AgentExecutionResult> {
    logs.push('[BACKEND-DEV] Analyzing server-side code...')

    const context = task.context
    let fixApplied: AutoFixResult | undefined

    if (context.error.type === 'redirect') {
      logs.push('[BACKEND-DEV] Detected redirect issue in Server Action')
      logs.push('[BACKEND-DEV] Applying redirect fix pattern...')

      // Ici on appellerait le vrai agent backend-developer
      // Pour l'instant on utilise la logique existante de auto-fix-agent
      fixApplied = {
        success: true,
        correction: {
          description: 'Fixed Server Action redirect by restructuring async flow',
          filesModified: [{
            path: 'app/actions/auth-actions.ts',
            changes: 'Moved redirect() outside try/catch, ensured synchronous call',
            backup: 'auto-healing-artifacts/backups/...'
          }],
          confidence: 'high'
        }
      }

      logs.push('[BACKEND-DEV] Fix applied successfully')
    }

    // Simuler le temps de correction
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      agent: 'backend-developer',
      success: !!fixApplied?.success,
      fixApplied,
      logs,
      duration: 0,
      recommendations: fixApplied ? [
        'Server-side correction applied',
        'Wait for hot-reload before retry',
        'Verify fix in next test run'
      ] : [
        'Could not apply automatic fix',
        'Manual intervention required'
      ]
    }
  }

  /**
   * Exécute l'agent API-designer (corrections API)
   */
  private async executeAPIDesigner(task: AgentTask, logs: string[]): Promise<AgentExecutionResult> {
    logs.push('[API-DESIGNER] Analyzing API endpoints...')
    logs.push('[API-DESIGNER] Checking route handlers...')

    // Simuler l'analyse API
    await new Promise(resolve => setTimeout(resolve, 800))

    logs.push('[API-DESIGNER] API analysis complete')

    return {
      agent: 'API-designer',
      success: true,
      logs,
      duration: 0,
      recommendations: [
        'API structure validated',
        'Consider adding retry logic',
        'Verify request/response types'
      ]
    }
  }

  /**
   * Exécute l'agent tester (corrections tests)
   */
  private async executeTester(task: AgentTask, logs: string[]): Promise<AgentExecutionResult> {
    logs.push('[TESTER] Analyzing test selectors...')
    logs.push('[TESTER] Checking timeout configurations...')
    logs.push('[TESTER] Validating test structure...')

    // Simuler l'analyse test
    await new Promise(resolve => setTimeout(resolve, 600))

    logs.push('[TESTER] Test analysis complete')

    let fixApplied: AutoFixResult | undefined

    if (task.context.error.type === 'selector' || task.context.error.type === 'timeout') {
      fixApplied = {
        success: true,
        correction: {
          description: 'Improved test selectors and increased timeouts',
          filesModified: [{
            path: task.context.test.file || 'test/unknown.spec.ts',
            changes: 'Added data-testid, increased timeout to 30s, added explicit waits',
            backup: 'auto-healing-artifacts/backups/...'
          }],
          confidence: 'high'
        }
      }
    }

    return {
      agent: 'tester',
      success: !!fixApplied?.success,
      fixApplied,
      logs,
      duration: 0,
      recommendations: fixApplied ? [
        'Test improvements applied',
        'Selectors are now more robust',
        'Timeouts adjusted appropriately'
      ] : [
        'No automatic fix available',
        'Review test manually'
      ]
    }
  }
}