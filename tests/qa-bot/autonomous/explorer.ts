/**
 * QA Bot — Autonomous Explorer (Orchestrator)
 *
 * Main entry point for Phase 2 autonomous exploration.
 * Launches a Playwright browser, navigates the SEIDO app page by page,
 * uses Claude API to decide which elements to interact with,
 * and monitors for anomalies.
 *
 * Usage: npx tsx tests/qa-bot/autonomous/explorer.ts
 *
 * Required env vars:
 *   TARGET_URL          — Base URL of the app (e.g., https://preview.seido.app)
 *   ANTHROPIC_API_KEY   — Claude API key
 *   QA_TEST_CREDENTIALS — JSON with auth credentials for 3 roles
 */

import { chromium, type Page, type Browser, type BrowserContext } from 'playwright'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import { getStaticRoutes, mapFileToRoutes, type Route } from '../helpers/routes'
import { NAVIGATION, REPORT_PATHS, FORBIDDEN_ACTIONS, type Anomaly } from '../helpers/constants'
import { setupAuth, getStorageStatePath } from '../setup/auth.setup'
import { BudgetLimiter } from './budget-limiter'
import { analyzePage, type SuggestedAction } from './page-analyzer'
import { setupAnomalyDetector, checkPageContent, classifySeverity } from './anomaly-detector'

// ── Types ──

interface ExplorationResult {
  url: string
  route: string
  actionsAttempted: number
  actionsSucceeded: number
  anomalies: Anomaly[]
  durationMs: number
}

interface ExplorationReport {
  startTime: string
  endTime: string
  targetUrl: string
  commitSha: string
  results: ExplorationResult[]
  budget: ReturnType<BudgetLimiter['getStats']>
  anomalySummary: Record<string, number>
}

// ── Page Prioritization ──

/**
 * Prioritize routes for exploration:
 * 1. Routes affected by the deployed commit (git diff)
 * 2. Routes not covered by guided tests (future: read Phase 1 results)
 * 3. Routes with historical bug count (from summary.json)
 * 4. Remaining routes
 */
function prioritizeRoutes(routes: Route[]): Route[] {
  const commitSha = process.env.COMMIT_SHA || ''
  const scored = routes.map(route => ({ route, score: 0 }))

  // Priority 1: Routes affected by deployed commit
  if (commitSha) {
    const changedFiles = getChangedFiles(commitSha)
    const affectedPaths = new Set<string>()

    for (const file of changedFiles) {
      const affected = mapFileToRoutes(file)
      affected.forEach(r => affectedPaths.add(r.path))
    }

    for (const entry of scored) {
      if (affectedPaths.has(entry.route.path)) {
        entry.score += 100
      }
    }
  }

  // Priority 2: Routes with historical bugs
  const historicalBugs = loadHistoricalBugs()
  for (const entry of scored) {
    const bugCount = historicalBugs.get(entry.route.path) || 0
    entry.score += bugCount * 10
  }

  // Priority 3: Complex pages score higher (wizards, detail pages, hubs)
  const complexTypes = ['wizard', 'detail', 'hub', 'tabs']
  for (const entry of scored) {
    if (complexTypes.includes(entry.route.testType)) {
      entry.score += 5
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  return scored.map(s => s.route)
}

function getChangedFiles(commitSha: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${commitSha}~1 ${commitSha} 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 10_000,
    })
    return output.trim().split('\n').filter(Boolean)
  } catch {
    console.log(`[explorer] Could not get git diff for ${commitSha}, skipping commit-based prioritization`)
    return []
  }
}

function loadHistoricalBugs(): Map<string, number> {
  const bugs = new Map<string, number>()
  const summaryPath = path.resolve(process.cwd(), REPORT_PATHS.summary)

  try {
    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
      const problematicRoutes = summary?.trends?.most_problematic_routes || []
      for (const entry of problematicRoutes) {
        if (entry.route && typeof entry.failures === 'number') {
          bugs.set(entry.route, entry.failures)
        }
      }
    }
  } catch {
    // No historical data — that's fine
  }

  return bugs
}

// ── Action Execution ──

/**
 * Execute a single suggested action on the page.
 * Returns true if the action was performed successfully.
 */
async function executeAction(page: Page, action: SuggestedAction): Promise<boolean> {
  // Safety check: skip forbidden actions
  const targetLower = action.target.toLowerCase()
  if (FORBIDDEN_ACTIONS.some(forbidden => targetLower.includes(forbidden))) {
    console.log(`[explorer]   Skipped forbidden action: "${action.target}"`)
    return false
  }

  try {
    switch (action.type) {
      case 'click': {
        // Try by accessible name first, then by role + name, then by text
        const locator = page.getByRole('button', { name: action.target })
          .or(page.getByRole('link', { name: action.target }))
          .or(page.getByRole('tab', { name: action.target }))
          .or(page.getByRole('menuitem', { name: action.target }))
          .or(page.getByText(action.target, { exact: false }))

        const count = await locator.count()
        if (count === 0) {
          console.log(`[explorer]   Element not found: "${action.target}"`)
          return false
        }

        await locator.first().click({ timeout: 5000 })
        await page.waitForTimeout(NAVIGATION.postActionDelayMs)
        return true
      }

      case 'fill': {
        const input = page.getByRole('textbox', { name: action.target })
          .or(page.getByLabel(action.target))
          .or(page.getByPlaceholder(action.target))

        const count = await input.count()
        if (count === 0) {
          console.log(`[explorer]   Input not found: "${action.target}"`)
          return false
        }

        await input.first().fill(action.value || 'QA Bot Test')
        await page.waitForTimeout(NAVIGATION.postFillDelayMs)
        return true
      }

      case 'select': {
        const select = page.getByRole('combobox', { name: action.target })
          .or(page.getByLabel(action.target))

        const count = await select.count()
        if (count === 0) {
          console.log(`[explorer]   Select not found: "${action.target}"`)
          return false
        }

        if (action.value) {
          await select.first().selectOption(action.value)
        } else {
          // Select the first non-empty option
          await select.first().selectOption({ index: 1 })
        }
        await page.waitForTimeout(NAVIGATION.postFillDelayMs)
        return true
      }

      default:
        return false
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Timeout or element detached — not an anomaly, just couldn't interact
    if (message.includes('Timeout') || message.includes('detached') || message.includes('intercept')) {
      console.log(`[explorer]   Action failed (non-critical): ${message.slice(0, 100)}`)
    } else {
      console.log(`[explorer]   Action error: ${message.slice(0, 200)}`)
    }
    return false
  }
}

// ── Page Exploration ──

/**
 * Explore a single page: navigate, analyze, execute actions, detect anomalies.
 */
async function explorePage(
  page: Page,
  route: Route,
  baseUrl: string,
  budget: BudgetLimiter,
): Promise<ExplorationResult> {
  const fullUrl = `${baseUrl}${route.path}`
  const startTime = Date.now()
  const allAnomalies: Anomaly[] = []
  let actionsAttempted = 0
  let actionsSucceeded = 0

  console.log(`\n[explorer] Navigating to ${route.path}...`)

  // Set up anomaly detection listeners
  const detector = setupAnomalyDetector(page)

  try {
    // Navigate
    const navigationStart = Date.now()
    await page.goto(fullUrl, {
      waitUntil: 'domcontentloaded',
      timeout: NAVIGATION.navigationTimeoutMs,
    })
    const navigationDuration = Date.now() - navigationStart

    // Check for slow navigation
    if (navigationDuration > NAVIGATION.slowLoadThresholdMs) {
      allAnomalies.push({
        type: 'slow-load',
        severity: 'medium',
        message: `Slow page load: ${navigationDuration}ms (threshold: ${NAVIGATION.slowLoadThresholdMs}ms)`,
        url: fullUrl,
        timestamp: new Date().toISOString(),
      })
    }

    // Wait for page to settle (network idle or 2s max)
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})

    // Check page content for static anomalies
    const contentAnomalies = await checkPageContent(page)
    allAnomalies.push(...contentAnomalies)

    // Collect any listener-detected anomalies
    allAnomalies.push(...detector.getAnomalies())

    // If the page has a critical error, skip actions
    if (allAnomalies.some(a => a.severity === 'critical')) {
      console.log(`[explorer] Critical anomaly on ${route.path} — skipping actions`)
      budget.recordPageVisit(fullUrl, 0, allAnomalies.length)
      return {
        url: fullUrl,
        route: route.path,
        actionsAttempted: 0,
        actionsSucceeded: 0,
        anomalies: allAnomalies,
        durationMs: Date.now() - startTime,
      }
    }

    // Ask Claude what to test on this page
    if (!budget.canContinue()) {
      console.log('[explorer] Budget exhausted before page analysis')
      budget.recordPageVisit(fullUrl, 0, allAnomalies.length)
      return {
        url: fullUrl,
        route: route.path,
        actionsAttempted: 0,
        actionsSucceeded: 0,
        anomalies: allAnomalies,
        durationMs: Date.now() - startTime,
      }
    }

    const suggestedActions = await analyzePage(page, budget)
    console.log(`[explorer] Claude suggested ${suggestedActions.length} actions for ${route.path}`)

    // Execute actions (up to max per page)
    const actionsToRun = suggestedActions.slice(0, NAVIGATION.maxActionsPerPage)

    for (const action of actionsToRun) {
      if (!budget.canContinue()) {
        console.log('[explorer] Budget exhausted during actions')
        break
      }

      console.log(`[explorer]   ${action.type}: "${action.target}" — ${action.reason}`)
      actionsAttempted++

      const beforeUrl = page.url()
      const succeeded = await executeAction(page, action)
      if (succeeded) actionsSucceeded++

      // Check for anomalies after action
      const postActionAnomalies = await checkPageContent(page)
      allAnomalies.push(...postActionAnomalies)
      allAnomalies.push(...detector.getAnomalies())

      // If we navigated away, stop testing this page
      const afterUrl = page.url()
      if (afterUrl !== beforeUrl && !afterUrl.startsWith(fullUrl)) {
        console.log(`[explorer]   Navigated away to ${afterUrl} — stopping page actions`)
        // Navigate back to continue with other pages
        try {
          await page.goBack({ timeout: 10_000 })
          await page.waitForTimeout(1000)
        } catch {
          // If we can't go back, that's ok — next page will navigate fresh
        }
        break
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log(`[explorer] Page exploration failed: ${message.slice(0, 200)}`)

    // Navigation timeout itself is an anomaly
    if (message.includes('Timeout') || message.includes('timeout')) {
      allAnomalies.push({
        type: 'slow-load',
        severity: 'high',
        message: `Page navigation timed out: ${message.slice(0, 200)}`,
        url: fullUrl,
        timestamp: new Date().toISOString(),
      })
    }
  } finally {
    detector.cleanup()
  }

  budget.recordPageVisit(fullUrl, actionsAttempted, allAnomalies.length)

  return {
    url: fullUrl,
    route: route.path,
    actionsAttempted,
    actionsSucceeded,
    anomalies: allAnomalies,
    durationMs: Date.now() - startTime,
  }
}

// ── Main Orchestrator ──

export async function main(): Promise<void> {
  const targetUrl = process.env.TARGET_URL
  if (!targetUrl) {
    console.error('[explorer] TARGET_URL environment variable is not set')
    process.exit(1)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[explorer] ANTHROPIC_API_KEY environment variable is not set')
    process.exit(1)
  }

  console.log(`[explorer] === SEIDO QA Bot — Autonomous Exploration ===`)
  console.log(`[explorer] Target: ${targetUrl}`)
  console.log(`[explorer] Commit: ${process.env.COMMIT_SHA || 'unknown'}`)
  console.log(`[explorer] Time: ${new Date().toISOString()}\n`)

  const budget = new BudgetLimiter()
  const startTime = new Date().toISOString()

  // ── Step 1: Authenticate ──
  console.log('[explorer] Step 1: Authenticating QA accounts...')
  try {
    await setupAuth(targetUrl)
  } catch (err) {
    console.error(`[explorer] Auth setup failed: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  // ── Step 2: Launch browser ──
  console.log('[explorer] Step 2: Launching browser...')
  let browser: Browser | null = null
  let context: BrowserContext | null = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    context = await browser.newContext({
      storageState: getStorageStatePath('gestionnaire'),
      viewport: { width: 1280, height: 720 },
      locale: 'fr-FR',
    })

    const page = await context.newPage()

    // ── Step 3: Prioritize routes ──
    console.log('[explorer] Step 3: Prioritizing routes...')
    const staticRoutes = getStaticRoutes('gestionnaire')
    const prioritizedRoutes = prioritizeRoutes(staticRoutes)
    console.log(`[explorer] ${prioritizedRoutes.length} static gestionnaire routes to explore`)

    // ── Step 4: Explore pages ──
    console.log('[explorer] Step 4: Starting exploration...\n')
    const results: ExplorationResult[] = []

    for (const route of prioritizedRoutes) {
      if (!budget.canContinue()) {
        console.log('\n[explorer] Budget limit reached — stopping exploration')
        break
      }

      const result = await explorePage(page, route, targetUrl, budget)
      results.push(result)

      if (result.anomalies.length > 0) {
        console.log(`[explorer] Found ${result.anomalies.length} anomaly/anomalies on ${route.path}`)
      }
    }

    // ── Step 5: Generate report ──
    console.log('\n[explorer] Step 5: Generating report...')
    const allAnomalies = results.flatMap(r => r.anomalies)
    const severityCounts = classifySeverity(allAnomalies)

    const report: ExplorationReport = {
      startTime,
      endTime: new Date().toISOString(),
      targetUrl,
      commitSha: process.env.COMMIT_SHA || 'unknown',
      results,
      budget: budget.getStats(),
      anomalySummary: severityCounts,
    }

    // Ensure reports directory exists
    const reportDir = path.dirname(path.resolve(process.cwd(), REPORT_PATHS.explorationResults))
    fs.mkdirSync(reportDir, { recursive: true })

    const reportPath = path.resolve(process.cwd(), REPORT_PATHS.explorationResults)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`[explorer] Report saved to ${reportPath}`)

    // ── Summary ──
    budget.printSummary()

    console.log('[explorer] === Exploration Complete ===')
    console.log(`[explorer] Pages explored: ${results.length}`)
    console.log(`[explorer] Total anomalies: ${allAnomalies.length}`)
    console.log(`[explorer]   Critical: ${severityCounts.critical}`)
    console.log(`[explorer]   High: ${severityCounts.high}`)
    console.log(`[explorer]   Medium: ${severityCounts.medium}`)
    console.log(`[explorer]   Low: ${severityCounts.low}`)

    // Exit with non-zero if critical anomalies found
    if (severityCounts.critical > 0) {
      console.log('\n[explorer] CRITICAL anomalies detected — failing run')
      process.exit(1)
    }

  } catch (err) {
    console.error(`[explorer] Fatal error: ${err instanceof Error ? err.message : String(err)}`)
    if (err instanceof Error && err.stack) {
      console.error(err.stack)
    }
    process.exit(1)
  } finally {
    if (context) await context.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
  }
}

// ── Entry point ──
main()
