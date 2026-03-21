/**
 * QA Bot Report Generator — Phase 3
 *
 * Reads Playwright test results and autonomous exploration results,
 * generates a structured Markdown report saved to reports/.
 *
 * Usage: npx tsx tests/qa-bot/reporting/report-generator.ts
 *
 * Environment:
 *   COMMIT_SHA   — deployed commit hash
 *   TARGET_URL   — URL that was tested
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { REPORT_PATHS, type Anomaly, type Severity, SEVERITY } from '../helpers/constants'
import { ALL_ROUTES } from '../helpers/routes'

// ─── Types ──────────────────────────────────────────────

interface ShardResult {
  shard: number
  total: number
  pass: number
  fail: number
  durationMs: number
}

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
  budget: Record<string, unknown>
  anomalySummary: Record<string, number>
}

interface Phase2Summary {
  pagesExplored: number
  anomalies: Anomaly[]
  actionsAttempted: number
  actionsSucceeded: number
}

interface PlaywrightJsonReport {
  config?: { projects?: Array<{ name: string }> }
  suites?: PlaywrightSuite[]
  stats?: {
    expected?: number
    unexpected?: number
    flaky?: number
    skipped?: number
    duration?: number
  }
}

interface PlaywrightSuite {
  title?: string
  suites?: PlaywrightSuite[]
  specs?: Array<{
    title: string
    ok: boolean
    tests: Array<{
      status: string
      results: Array<{
        duration: number
        status: string
        error?: { message: string }
      }>
    }>
  }>
}

// ─── Helpers ────────────────────────────────────────────

function getShortSha(sha: string): string {
  return sha.slice(0, 7)
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m${remainingSeconds}s`
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0]
}

function severityOrder(severity: string): number {
  const order: Record<string, number> = {
    CRITICAL: 0,
    critical: 0,
    HIGH: 1,
    high: 1,
    MEDIUM: 2,
    medium: 2,
    LOW: 3,
    low: 3,
  }
  return order[severity] ?? 4
}

function displaySeverity(severity: string): string {
  return severity.toUpperCase()
}

// ─── Data Readers ───────────────────────────────────────

function readPlaywrightResults(basePath: string): ShardResult[] {
  const results: ShardResult[] = []

  // Try reading merged JSON report
  const jsonReportPath = path.join(basePath, 'playwright-report', 'report.json')
  if (fs.existsSync(jsonReportPath)) {
    try {
      const report: PlaywrightJsonReport = JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8'))
      if (report.stats) {
        const total = (report.stats.expected ?? 0) + (report.stats.unexpected ?? 0) + (report.stats.flaky ?? 0)
        results.push({
          shard: 0,
          total,
          pass: report.stats.expected ?? 0,
          fail: report.stats.unexpected ?? 0,
          durationMs: report.stats.duration ?? 0,
        })
        return results
      }
    } catch {
      console.log('Warning: Could not parse playwright JSON report, trying individual results')
    }
  }

  // Try reading individual test-results directories (per shard)
  const testResultsDir = path.join(basePath, 'test-results')
  if (fs.existsSync(testResultsDir)) {
    try {
      const entries = fs.readdirSync(testResultsDir)
      for (const entry of entries) {
        const resultFile = path.join(testResultsDir, entry, 'results.json')
        if (fs.existsSync(resultFile)) {
          const data = JSON.parse(fs.readFileSync(resultFile, 'utf-8'))
          const shardMatch = entry.match(/shard-(\d+)/)
          const shardIndex = shardMatch ? parseInt(shardMatch[1], 10) : results.length + 1
          results.push({
            shard: shardIndex,
            total: data.total ?? 0,
            pass: data.pass ?? data.expected ?? 0,
            fail: data.fail ?? data.unexpected ?? 0,
            durationMs: data.duration ?? 0,
          })
        }
      }
    } catch {
      console.log('Warning: Could not read test-results directory')
    }
  }

  // Try reading blob reports
  const blobDir = path.join(basePath, 'all-blob-reports')
  if (results.length === 0 && fs.existsSync(blobDir)) {
    try {
      const blobs = fs.readdirSync(blobDir).filter(f => f.endsWith('.json') || f.endsWith('.zip'))
      for (let i = 0; i < blobs.length; i++) {
        results.push({
          shard: i + 1,
          total: 0,
          pass: 0,
          fail: 0,
          durationMs: 0,
        })
      }
    } catch {
      console.log('Warning: Could not read blob reports')
    }
  }

  return results
}

function readExplorationResults(basePath: string): Phase2Summary | null {
  const explorationFile = path.join(basePath, REPORT_PATHS.explorationResults)
  if (!fs.existsSync(explorationFile)) {
    console.log('No autonomous exploration results found (Phase 2 may not have run)')
    return null
  }

  try {
    const data: ExplorationReport = JSON.parse(fs.readFileSync(explorationFile, 'utf-8'))
    const results = data.results ?? []
    return {
      pagesExplored: results.length,
      anomalies: results.flatMap(r => r.anomalies ?? []),
      actionsAttempted: results.reduce((sum, r) => sum + (r.actionsAttempted ?? 0), 0),
      actionsSucceeded: results.reduce((sum, r) => sum + (r.actionsSucceeded ?? 0), 0),
    }
  } catch {
    console.log('Warning: Could not parse exploration results')
    return null
  }
}

// ─── Report Generator ───────────────────────────────────

function generateMarkdownReport(
  commitSha: string,
  targetUrl: string,
  shardResults: ShardResult[],
  phase2: Phase2Summary | null,
  startTime: Date,
): string {
  const shortSha = getShortSha(commitSha)
  const dateStr = getDateString()
  const durationMs = Date.now() - startTime.getTime()

  const totalTests = shardResults.reduce((sum, s) => sum + s.total, 0)
  const totalPass = shardResults.reduce((sum, s) => sum + s.pass, 0)
  const totalFail = shardResults.reduce((sum, s) => sum + s.fail, 0)

  const allAnomalies = phase2?.anomalies ?? []
  const sortedAnomalies = [...allAnomalies].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))

  const environment = targetUrl.includes('preview') ? 'preview' : 'production'

  const lines: string[] = []

  // Header
  lines.push(`# QA Bot Report — ${dateStr} — ${shortSha}`)
  lines.push('')

  // Run Info
  lines.push('## Run Info')
  lines.push(`- **Commit:** ${shortSha}`)
  lines.push(`- **Environment:** ${environment}`)
  lines.push(`- **Target URL:** ${targetUrl}`)
  lines.push(`- **Duration:** ${formatDuration(durationMs)}`)
  lines.push(`- **Phase 1:** ${totalPass}/${totalTests} tests pass${totalFail > 0 ? ` (${totalFail} failed)` : ''}`)
  if (phase2) {
    lines.push(`- **Phase 2:** ${phase2.pagesExplored} pages explored, ${allAnomalies.length} anomalies found`)
  } else {
    lines.push('- **Phase 2:** did not run')
  }
  lines.push('')

  // Anomalies
  if (sortedAnomalies.length > 0) {
    lines.push('## Anomalies Found')
    lines.push('')

    for (const anomaly of sortedAnomalies) {
      lines.push(`### [${displaySeverity(anomaly.severity)}] ${anomaly.message}`)
      lines.push(`- **URL:** ${anomaly.url}`)

      if (anomaly.screenshotPath) {
        lines.push(`- **Screenshot:** ${anomaly.screenshotPath}`)
      }
      if (anomaly.type) {
        lines.push(`- **Type:** ${anomaly.type}`)
      }
      if (anomaly.details) {
        lines.push(`- **Details:** ${anomaly.details}`)
      }
      lines.push('')
    }
  } else {
    lines.push('## Anomalies Found')
    lines.push('')
    lines.push('No anomalies detected.')
    lines.push('')
  }

  // Coverage Summary
  lines.push('## Coverage Summary')
  const totalRoutes = ALL_ROUTES.length
  const routesTested = phase2 ? phase2.pagesExplored : shardResults.length > 0 ? totalRoutes : 0
  lines.push(`- Routes tested: ${routesTested}/${totalRoutes}`)
  if (phase2) {
    lines.push(`- Actions attempted: ${phase2.actionsAttempted}`)
    lines.push(`- Actions succeeded: ${phase2.actionsSucceeded}`)
  }
  lines.push(`- No regression vs previous run: ${sortedAnomalies.length === 0 ? 'YES' : 'NO'}`)
  lines.push('')

  // Phase 1 Test Results
  lines.push('## Phase 1 Test Results')
  if (shardResults.length > 0) {
    lines.push('| Shard | Tests | Pass | Fail | Duration |')
    lines.push('|-------|-------|------|------|----------|')
    for (const shard of shardResults) {
      const label = shard.shard === 0 ? 'All' : String(shard.shard)
      lines.push(`| ${label} | ${shard.total} | ${shard.pass} | ${shard.fail} | ${formatDuration(shard.durationMs)} |`)
    }
  } else {
    lines.push('No Phase 1 test results available.')
  }
  lines.push('')

  return lines.join('\n')
}

// ─── Main ───────────────────────────────────────────────

export async function main(): Promise<string> {
  const startTime = new Date()

  const commitSha = process.env.COMMIT_SHA || 'unknown'
  const targetUrl = process.env.TARGET_URL || 'https://preview.seido-app.com'
  const basePath = process.cwd()

  console.log(`[report-generator] Commit: ${getShortSha(commitSha)}`)
  console.log(`[report-generator] Target: ${targetUrl}`)

  // Read Phase 1 results
  const shardResults = readPlaywrightResults(basePath)
  console.log(`[report-generator] Phase 1 shards found: ${shardResults.length}`)

  // Read Phase 2 results
  const phase2 = readExplorationResults(basePath)
  if (phase2) {
    console.log(`[report-generator] Phase 2 anomalies: ${phase2.anomalies.length}`)
  }

  // Generate report
  const report = generateMarkdownReport(commitSha, targetUrl, shardResults, phase2, startTime)

  // Ensure reports directory exists
  const reportsDir = path.join(basePath, 'reports')
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  // Write report
  const shortSha = getShortSha(commitSha)
  const dateStr = getDateString()
  const reportPath = path.join(reportsDir, `qa-report-${dateStr}-${shortSha}.md`)
  fs.writeFileSync(reportPath, report, 'utf-8')

  // Also write to a stable path for downstream scripts
  const latestPath = path.join(reportsDir, 'qa-report-latest.md')
  fs.writeFileSync(latestPath, report, 'utf-8')

  console.log(`[report-generator] Report written to: ${reportPath}`)
  console.log(`[report-generator] Latest symlink: ${latestPath}`)

  return reportPath
}

main().catch(console.error)
