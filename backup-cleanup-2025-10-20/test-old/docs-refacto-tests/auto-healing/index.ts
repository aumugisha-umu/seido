/**
 * SEIDO Auto-Healing System - Main Exports
 * Système intelligent de correction automatique des tests E2E
 */

// Configuration & Types
export * from './config'

// Core Components
export { ErrorContextCollector } from './error-context-collector'
export { AutoFixAgent } from './auto-fix-agent'
export { AutoHealingOrchestrator } from './orchestrator'

// Test Utilities
export { test, expect, runTestWithAutoHealing, withAutoHealing, shouldTriggerAutoHealing } from './test-runner'

// Default orchestrator instance for quick usage
import { AutoHealingOrchestrator } from './orchestrator'
export const defaultOrchestrator = new AutoHealingOrchestrator()

/**
 * Quick start function
 */
export async function quickHeal(
  testName: string,
  error: Error,
  page: import('@playwright/test').Page,
  expectedUrl?: string
) {
  return await defaultOrchestrator.heal(
    `quick-${Date.now()}`,
    testName,
    'auto',
    error,
    'auto-detected',
    page,
    expectedUrl
  )
}