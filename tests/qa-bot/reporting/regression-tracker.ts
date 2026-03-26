/**
 * QA Bot Regression Tracker — Phase 3
 *
 * Reads/updates reports/summary.json with run history and trend data.
 * Keeps last 30 runs, calculates 7-day anomaly trend and problematic routes.
 *
 * Usage: npx tsx tests/qa-bot/reporting/regression-tracker.ts
 *
 * Environment:
 *   COMMIT_SHA  — deployed commit hash
 *   TARGET_URL  — URL that was tested
 *   API_COST    — estimated API cost for this run (optional, in USD)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { SEVERITY, type Severity } from '../helpers/constants'
import { findReportPath, getShortSha } from './report-helpers'

// ─── Types ──────────────────────────────────────────────

interface Phase1Results {
  total: number
  pass: number
  fail: number
}

interface Phase2Results {
  pages: number
  anomalies: number
  critical: number
  high: number
  medium: number
  low: number
}

interface RunEntry {
  date: string
  commit: string
  environment: string
  phase1: Phase1Results
  phase2: Phase2Results | null
  duration_seconds: number
  api_cost_usd: number
  anomaly_routes?: string[]
}

interface Trends {
  anomalies_last_7_days: number[]
  most_problematic_routes: Array<{ route: string; failures: number }>
}

interface Summary {
  runs: RunEntry[]
  trends: Trends
}

interface ParsedAnomaly {
  severity: Severity
  title: string
  url: string
}

// ─── Helpers ────────────────────────────────────────────

function parseReportMetrics(reportContent: string): {
  phase1: Phase1Results
  phase2: Phase2Results | null
  durationSeconds: number
  anomalies: ParsedAnomaly[]
} {
  const phase1: Phase1Results = { total: 0, pass: 0, fail: 0 }
  let phase2: Phase2Results | null = null
  let durationSeconds = 0
  const anomalies: ParsedAnomaly[] = []

  // Parse Phase 1 results from "Phase 1:" line
  const phase1Match = reportContent.match(/\*\*Phase 1:\*\* (\d+)\/(\d+) tests pass(?:\s*\((\d+) failed\))?/)
  if (phase1Match) {
    phase1.pass = parseInt(phase1Match[1], 10)
    phase1.total = parseInt(phase1Match[2], 10)
    phase1.fail = phase1Match[3] ? parseInt(phase1Match[3], 10) : 0
  }

  // Parse Phase 2 results
  const phase2Match = reportContent.match(/\*\*Phase 2:\*\* (\d+) pages explored, (\d+) anomalies found/)
  if (phase2Match) {
    phase2 = {
      pages: parseInt(phase2Match[1], 10),
      anomalies: parseInt(phase2Match[2], 10),
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
  }

  // Parse duration
  const durationMatch = reportContent.match(/\*\*Duration:\*\* (?:(\d+)m)?(\d+)s/)
  if (durationMatch) {
    const minutes = durationMatch[1] ? parseInt(durationMatch[1], 10) : 0
    const seconds = parseInt(durationMatch[2], 10)
    durationSeconds = minutes * 60 + seconds
  }

  // Parse anomalies
  const anomalyRegex = /### \[(CRITICAL|HIGH|MEDIUM|LOW)\] (.+)/g
  let match: RegExpExecArray | null
  while ((match = anomalyRegex.exec(reportContent)) !== null) {
    const severity = match[1] as Severity
    anomalies.push({
      severity,
      title: match[2],
      url: '',
    })

    if (phase2) {
      if (severity === SEVERITY.CRITICAL) phase2.critical++
      else if (severity === SEVERITY.HIGH) phase2.high++
      else if (severity === SEVERITY.MEDIUM) phase2.medium++
      else if (severity === SEVERITY.LOW) phase2.low++
    }
  }

  // Extract URLs from anomaly details
  const urlRegex = /\*\*URL:\*\* (.+)/g
  let urlIdx = 0
  while ((match = urlRegex.exec(reportContent)) !== null) {
    if (urlIdx < anomalies.length) {
      anomalies[urlIdx].url = match[1].trim()
      urlIdx++
    }
  }

  return { phase1, phase2, durationSeconds, anomalies }
}

function extractRouteFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Replace UUIDs and IDs with [id] placeholder
    return parsed.pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/[id]')
      .replace(/\/\d+/g, '/[id]')
  } catch {
    return url
  }
}

// ─── Summary Management ────────────────────────────────

function readSummary(summaryPath: string): Summary {
  if (fs.existsSync(summaryPath)) {
    try {
      return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
    } catch {
      console.log('[regression-tracker] Warning: Could not parse existing summary.json, starting fresh')
    }
  }

  return {
    runs: [],
    trends: {
      anomalies_last_7_days: [],
      most_problematic_routes: [],
    },
  }
}

function calculateTrends(runs: RunEntry[]): Trends {
  // Anomalies per day for the last 7 days
  const now = new Date()
  const anomaliesLast7Days: number[] = []

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const day = new Date(now)
    day.setDate(day.getDate() - dayOffset)
    const dayStr = day.toISOString().split('T')[0]

    const dayRuns = runs.filter(r => r.date.startsWith(dayStr))
    const totalAnomalies = dayRuns.reduce((sum, r) => {
      return sum + (r.phase2?.anomalies ?? 0)
    }, 0)

    anomaliesLast7Days.push(totalAnomalies)
  }

  // Most problematic routes (aggregate across all runs)
  const routeFailures = new Map<string, number>()
  for (const run of runs) {
    if (run.anomaly_routes) {
      for (const route of run.anomaly_routes) {
        routeFailures.set(route, (routeFailures.get(route) ?? 0) + 1)
      }
    }
  }

  const mostProblematicRoutes = Array.from(routeFailures.entries())
    .map(([route, failures]) => ({ route, failures }))
    .sort((a, b) => b.failures - a.failures)
    .slice(0, 10)

  return {
    anomalies_last_7_days: anomaliesLast7Days,
    most_problematic_routes: mostProblematicRoutes,
  }
}

// ─── Main ───────────────────────────────────────────────

export async function main(): Promise<void> {
  const commitSha = process.env.COMMIT_SHA || 'unknown'
  const targetUrl = process.env.TARGET_URL || 'https://preview.seido-app.com'
  const apiCost = parseFloat(process.env.API_COST || '0') || 0
  const shortSha = getShortSha(commitSha)

  console.log(`[regression-tracker] Tracking run for commit: ${shortSha}`)

  const reportsDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  const summaryPath = path.join(reportsDir, 'summary.json')
  const summary = readSummary(summaryPath)

  // Read and parse report
  const reportPath = findReportPath()
  let phase1: Phase1Results = { total: 0, pass: 0, fail: 0 }
  let phase2: Phase2Results | null = null
  let durationSeconds = 0
  let anomalyRoutes: string[] = []

  if (reportPath) {
    console.log(`[regression-tracker] Parsing report: ${reportPath}`)
    const reportContent = fs.readFileSync(reportPath, 'utf-8')
    const metrics = parseReportMetrics(reportContent)
    phase1 = metrics.phase1
    phase2 = metrics.phase2
    durationSeconds = metrics.durationSeconds
    anomalyRoutes = metrics.anomalies
      .filter(a => a.url)
      .map(a => extractRouteFromUrl(a.url))
      .filter((route, idx, arr) => arr.indexOf(route) === idx) // dedupe
  } else {
    console.log('[regression-tracker] No report found, recording minimal entry')
  }

  // Determine environment
  const environment = targetUrl.includes('preview') ? 'preview' : 'production'

  // Create run entry
  const entry: RunEntry = {
    date: new Date().toISOString(),
    commit: shortSha,
    environment,
    phase1,
    phase2,
    duration_seconds: durationSeconds,
    api_cost_usd: apiCost,
  }

  if (anomalyRoutes.length > 0) {
    entry.anomaly_routes = anomalyRoutes
  }

  // Add to runs
  summary.runs.push(entry)

  // Prune to last 30 runs
  const MAX_RUNS = 30
  if (summary.runs.length > MAX_RUNS) {
    const pruned = summary.runs.length - MAX_RUNS
    summary.runs = summary.runs.slice(pruned)
    console.log(`[regression-tracker] Pruned ${pruned} old run(s), keeping last ${MAX_RUNS}`)
  }

  // Recalculate trends
  summary.trends = calculateTrends(summary.runs)

  // Write summary
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')

  console.log(`[regression-tracker] Summary updated: ${summaryPath}`)
  console.log(`[regression-tracker] Total runs tracked: ${summary.runs.length}`)
  console.log(`[regression-tracker] 7-day anomaly trend: [${summary.trends.anomalies_last_7_days.join(', ')}]`)

  if (summary.trends.most_problematic_routes.length > 0) {
    console.log('[regression-tracker] Most problematic routes:')
    for (const route of summary.trends.most_problematic_routes.slice(0, 5)) {
      console.log(`  ${route.route} — ${route.failures} failure(s)`)
    }
  }
}

main().catch(console.error)
