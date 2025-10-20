/**
 * Configuration Auto-Healing System
 * Paramètres pour le système de correction automatique des tests E2E
 */

export interface AutoHealingConfig {
  // Limites de retry
  maxRetries: number
  retryDelay: number // ms entre chaque retry

  // Timeouts
  debuggerTimeout: number // ms pour l'analyse du debugger
  fixApplicationTimeout: number // ms pour appliquer une correction

  // Sécurité
  enableBackup: boolean
  enableDryRun: boolean
  autoRollback: boolean

  // Logging
  verboseLogging: boolean
  saveArtifacts: boolean

  // Patterns d'erreurs à traiter
  errorPatterns: {
    timeout: boolean
    redirect: boolean
    selector: boolean
    network: boolean
    authentication: boolean
  }
}

export const DEFAULT_AUTO_HEALING_CONFIG: AutoHealingConfig = {
  maxRetries: 5,
  retryDelay: 2000,

  debuggerTimeout: 60000, // 1 minute
  fixApplicationTimeout: 30000, // 30 secondes

  enableBackup: true,
  enableDryRun: false,
  autoRollback: true,

  verboseLogging: true,
  saveArtifacts: true,

  errorPatterns: {
    timeout: true,
    redirect: true,
    selector: true,
    network: true,
    authentication: true
  }
}

/**
 * Contexte d'erreur enrichi pour le debugger
 */
export interface ErrorContext {
  // Identifiants
  testId: string
  testName: string
  userRole: string

  // Erreur
  error: {
    type: 'timeout' | 'selector' | 'network' | 'authentication' | 'redirect' | 'unknown'
    message: string
    stack?: string
    step: string
    timestamp: string
  }

  // État au moment de l'erreur
  state: {
    url: string
    expectedUrl?: string
    screenshot: string
    domSnapshot?: string
    networkLogs?: string[]
    consoleLogs?: string[]
  }

  // Code source concerné
  sourceFiles: Array<{
    path: string
    content: string
    suspectedLines?: number[]
  }>

  // Tentatives précédentes
  previousAttempts: Array<{
    attemptNumber: number
    correction: string
    result: 'success' | 'failure'
    error?: string
  }>
}

/**
 * Résultat d'une correction automatique
 */
export interface AutoFixResult {
  success: boolean
  correction?: {
    description: string
    filesModified: Array<{
      path: string
      changes: string
      backup: string
    }>
    confidence: 'low' | 'medium' | 'high'
  }
  error?: string
  nextSteps?: string[]
}

/**
 * Rapport de cycle auto-healing
 */
export interface HealingCycleReport {
  cycleNumber: number
  startTime: string
  endTime: string
  duration: number

  errorContext: ErrorContext
  fixApplied: AutoFixResult
  testResult: {
    passed: boolean
    error?: string
    duration: number
  }

  artifacts: {
    screenshots: string[]
    logs: string[]
    diffs: string[]
  }
}

/**
 * Rapport final auto-healing
 */
export interface AutoHealingReport {
  testName: string
  initialError: ErrorContext

  cycles: HealingCycleReport[]

  finalResult: {
    resolved: boolean
    totalAttempts: number
    totalDuration: number
    successfulCycle?: number
  }

  recommendations: string[]

  artifactsPath: string
  reportPath: string
}