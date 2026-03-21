/**
 * QA Bot — Budget Limiter
 *
 * Enforces exploration budget constraints: time, pages, API calls, cost.
 * Prevents runaway exploration that could exhaust API credits or CI time.
 */

import { EXPLORATION_BUDGET, API_PRICING } from '../helpers/constants'

interface BudgetStats {
  elapsedMs: number
  pagesVisited: number
  apiCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCostUsd: number
}

interface RemainingBudget {
  timeLeftMs: number
  pagesLeft: number
  apiCallsLeft: number
  costLeftUsd: number
}

interface PageVisit {
  url: string
  timestamp: number
  actionsPerformed: number
  anomaliesFound: number
}

export class BudgetLimiter {
  private startTime: number
  private pageVisits: PageVisit[] = []
  private apiCallCount = 0
  private totalInputTokens = 0
  private totalOutputTokens = 0

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Check if exploration can continue within all budget limits.
   */
  canContinue(): boolean {
    const elapsed = Date.now() - this.startTime
    const cost = this.calculateCost()

    if (elapsed >= EXPLORATION_BUDGET.maxDurationMs) {
      console.log(`[budget] Time limit reached: ${Math.round(elapsed / 1000)}s / ${EXPLORATION_BUDGET.maxDurationMs / 1000}s`)
      return false
    }

    if (this.pageVisits.length >= EXPLORATION_BUDGET.maxPages) {
      console.log(`[budget] Page limit reached: ${this.pageVisits.length} / ${EXPLORATION_BUDGET.maxPages}`)
      return false
    }

    if (this.apiCallCount >= EXPLORATION_BUDGET.maxApiCalls) {
      console.log(`[budget] API call limit reached: ${this.apiCallCount} / ${EXPLORATION_BUDGET.maxApiCalls}`)
      return false
    }

    if (cost >= EXPLORATION_BUDGET.maxCostUsd) {
      console.log(`[budget] Cost limit reached: $${cost.toFixed(3)} / $${EXPLORATION_BUDGET.maxCostUsd}`)
      return false
    }

    return true
  }

  /**
   * Record a page visit.
   */
  recordPageVisit(url: string, actionsPerformed = 0, anomaliesFound = 0): void {
    this.pageVisits.push({
      url,
      timestamp: Date.now(),
      actionsPerformed,
      anomaliesFound,
    })
  }

  /**
   * Record an API call with token usage.
   */
  recordApiCall(inputTokens: number, outputTokens: number): void {
    this.apiCallCount++
    this.totalInputTokens += inputTokens
    this.totalOutputTokens += outputTokens
  }

  /**
   * Get current exploration statistics.
   */
  getStats(): BudgetStats {
    return {
      elapsedMs: Date.now() - this.startTime,
      pagesVisited: this.pageVisits.length,
      apiCalls: this.apiCallCount,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      estimatedCostUsd: this.calculateCost(),
    }
  }

  /**
   * Get remaining budget for each constraint.
   */
  getRemainingBudget(): RemainingBudget {
    const elapsed = Date.now() - this.startTime
    const cost = this.calculateCost()

    return {
      timeLeftMs: Math.max(0, EXPLORATION_BUDGET.maxDurationMs - elapsed),
      pagesLeft: Math.max(0, EXPLORATION_BUDGET.maxPages - this.pageVisits.length),
      apiCallsLeft: Math.max(0, EXPLORATION_BUDGET.maxApiCalls - this.apiCallCount),
      costLeftUsd: Math.max(0, EXPLORATION_BUDGET.maxCostUsd - cost),
    }
  }

  /**
   * Get the list of all visited page URLs.
   */
  getVisitedUrls(): string[] {
    return this.pageVisits.map(v => v.url)
  }

  /**
   * Get detailed page visit history.
   */
  getPageVisits(): ReadonlyArray<PageVisit> {
    return this.pageVisits
  }

  /**
   * Print a summary of budget usage to console.
   */
  printSummary(): void {
    const stats = this.getStats()
    const remaining = this.getRemainingBudget()

    console.log('\n[budget] === Exploration Budget Summary ===')
    console.log(`[budget] Duration: ${Math.round(stats.elapsedMs / 1000)}s (${Math.round(remaining.timeLeftMs / 1000)}s remaining)`)
    console.log(`[budget] Pages: ${stats.pagesVisited} / ${EXPLORATION_BUDGET.maxPages} (${remaining.pagesLeft} remaining)`)
    console.log(`[budget] API calls: ${stats.apiCalls} / ${EXPLORATION_BUDGET.maxApiCalls} (${remaining.apiCallsLeft} remaining)`)
    console.log(`[budget] Tokens: ${stats.totalInputTokens} input + ${stats.totalOutputTokens} output`)
    console.log(`[budget] Cost: $${stats.estimatedCostUsd.toFixed(4)} / $${EXPLORATION_BUDGET.maxCostUsd} ($${remaining.costLeftUsd.toFixed(4)} remaining)`)
    console.log('[budget] ===============================\n')
  }

  private calculateCost(): number {
    const inputCost = (this.totalInputTokens / 1000) * API_PRICING.inputPer1k
    const outputCost = (this.totalOutputTokens / 1000) * API_PRICING.outputPer1k
    return inputCost + outputCost
  }
}
