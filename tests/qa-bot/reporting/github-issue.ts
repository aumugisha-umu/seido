/**
 * QA Bot GitHub Issue Creator — Phase 3
 *
 * Reads the generated Markdown report and creates a GitHub issue
 * if Critical or High severity anomalies are found.
 *
 * Usage: npx tsx tests/qa-bot/reporting/github-issue.ts
 *
 * Environment:
 *   GITHUB_TOKEN      — GitHub personal access token (auto-provided in Actions)
 *   GITHUB_REPOSITORY — owner/repo format (auto-provided in Actions)
 *   COMMIT_SHA        — deployed commit hash
 *   GITHUB_RUN_ID     — GitHub Actions run ID (auto-provided)
 *   GITHUB_SERVER_URL — GitHub server URL (auto-provided, defaults to https://github.com)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { SEVERITY, type Severity } from '../helpers/constants'
import { findReportPath, getShortSha } from './report-helpers'

// ─── Types ──────────────────────────────────────────────

interface ParsedAnomaly {
  severity: Severity
  title: string
  body: string
}

// ─── Report Parser ──────────────────────────────────────

function parseAnomaliesFromReport(reportContent: string): ParsedAnomaly[] {
  const anomalies: ParsedAnomaly[] = []
  const anomalyRegex = /### \[(CRITICAL|HIGH|MEDIUM|LOW)\] (.+)/g

  let match: RegExpExecArray | null
  const sections: Array<{ severity: Severity; title: string; startIndex: number }> = []

  while ((match = anomalyRegex.exec(reportContent)) !== null) {
    sections.push({
      severity: match[1] as Severity,
      title: match[2],
      startIndex: match.index,
    })
  }

  for (let i = 0; i < sections.length; i++) {
    const start = sections[i].startIndex
    const end = i + 1 < sections.length
      ? sections[i + 1].startIndex
      : reportContent.indexOf('\n## ', start + 1)

    const body = end > start
      ? reportContent.slice(start, end).trim()
      : reportContent.slice(start).trim()

    anomalies.push({
      severity: sections[i].severity,
      title: sections[i].title,
      body,
    })
  }

  return anomalies
}

// ─── GitHub API ─────────────────────────────────────────

async function createGitHubIssue(
  token: string,
  repo: string,
  title: string,
  body: string,
  labels: string[],
): Promise<{ number: number; html_url: string }> {
  const url = `https://api.github.com/repos/${repo}/issues`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, labels }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json()
  return { number: data.number, html_url: data.html_url }
}

async function ensureLabelsExist(token: string, repo: string, labels: string[]): Promise<void> {
  const labelColors: Record<string, string> = {
    'qa-bot': '7057ff',
    'bug': 'd73a4a',
    'auto-generated': 'e4e669',
  }

  for (const label of labels) {
    const url = `https://api.github.com/repos/${repo}/labels/${encodeURIComponent(label)}`
    const checkResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (checkResponse.status === 404) {
      console.log(`[github-issue] Creating label: ${label}`)
      const createUrl = `https://api.github.com/repos/${repo}/labels`
      await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: label,
          color: labelColors[label] || 'ededed',
        }),
      })
    }
  }
}

// ─── Issue Body Builder ─────────────────────────────────

function buildIssueBody(
  anomalies: ParsedAnomaly[],
  reportContent: string,
  commitSha: string,
): string {
  const shortSha = getShortSha(commitSha)
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const repo = process.env.GITHUB_REPOSITORY || ''
  const runId = process.env.GITHUB_RUN_ID || ''

  const criticalCount = anomalies.filter(a => a.severity === SEVERITY.CRITICAL).length
  const highCount = anomalies.filter(a => a.severity === SEVERITY.HIGH).length
  const mediumCount = anomalies.filter(a => a.severity === SEVERITY.MEDIUM).length
  const lowCount = anomalies.filter(a => a.severity === SEVERITY.LOW).length

  const summaryParts: string[] = []
  if (criticalCount > 0) summaryParts.push(`${criticalCount} Critical`)
  if (highCount > 0) summaryParts.push(`${highCount} High`)
  if (mediumCount > 0) summaryParts.push(`${mediumCount} Medium`)
  if (lowCount > 0) summaryParts.push(`${lowCount} Low`)

  const lines: string[] = []

  lines.push('## Summary')
  lines.push(`- **${summaryParts.join(', ')}** anomalies detected`)
  lines.push(`- **Deploy:** ${shortSha}`)
  if (runId) {
    lines.push(`- **Actions run:** [View run](${serverUrl}/${repo}/actions/runs/${runId})`)
  }
  lines.push('')

  // Include Critical and High anomalies in full detail
  const importantAnomalies = anomalies.filter(
    a => a.severity === SEVERITY.CRITICAL || a.severity === SEVERITY.HIGH,
  )

  for (const anomaly of importantAnomalies) {
    lines.push(`## ${anomaly.severity}: ${anomaly.title}`)
    lines.push('')
    // Extract the body details (skip the ### header line itself)
    const bodyLines = anomaly.body.split('\n').slice(1).join('\n').trim()
    lines.push(bodyLines)
    lines.push('')
  }

  // Summarize Medium/Low
  const minorAnomalies = anomalies.filter(
    a => a.severity === SEVERITY.MEDIUM || a.severity === SEVERITY.LOW,
  )
  if (minorAnomalies.length > 0) {
    lines.push('## Other Anomalies')
    lines.push('')
    for (const anomaly of minorAnomalies) {
      lines.push(`- **[${anomaly.severity}]** ${anomaly.title}`)
    }
    lines.push('')
  }

  // Suggested fix workflow
  lines.push('## Suggested fix workflow')
  lines.push('1. Open Claude Code')
  lines.push('2. Run: `gh issue view <this-issue-number>` to read this issue')
  lines.push('3. Claude Code can read the steps to reproduce and fix the bugs')
  lines.push('4. After fix is deployed, QA Bot will re-run automatically')
  lines.push('')

  lines.push('---')
  lines.push(`Generated by QA Bot | [GitHub Actions Run](${serverUrl}/${repo}/actions/runs/${runId})`)

  return lines.join('\n')
}

// ─── Main ───────────────────────────────────────────────

export async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY
  const commitSha = process.env.COMMIT_SHA || 'unknown'

  if (!token) {
    console.log('[github-issue] GITHUB_TOKEN not set, skipping issue creation')
    return
  }
  if (!repo) {
    console.log('[github-issue] GITHUB_REPOSITORY not set, skipping issue creation')
    return
  }

  // Find and read report
  const reportPath = findReportPath()
  if (!reportPath) {
    console.log('[github-issue] No report found, skipping issue creation')
    return
  }

  console.log(`[github-issue] Reading report: ${reportPath}`)
  const reportContent = fs.readFileSync(reportPath, 'utf-8')

  // Parse anomalies
  const anomalies = parseAnomaliesFromReport(reportContent)
  console.log(`[github-issue] Total anomalies found: ${anomalies.length}`)

  // Filter for Critical/High
  const criticalHighAnomalies = anomalies.filter(
    a => a.severity === SEVERITY.CRITICAL || a.severity === SEVERITY.HIGH,
  )

  if (criticalHighAnomalies.length === 0) {
    console.log('[github-issue] No Critical or High anomalies — skipping issue creation')
    return
  }

  console.log(`[github-issue] Critical/High anomalies: ${criticalHighAnomalies.length}`)

  // Ensure labels exist
  const labels = ['qa-bot', 'bug', 'auto-generated']
  await ensureLabelsExist(token, repo, labels)

  // Build issue
  const shortSha = getShortSha(commitSha)
  const title = `[QA Bot] ${anomalies.length} anomalies on deploy ${shortSha}`
  const body = buildIssueBody(anomalies, reportContent, commitSha)

  // Create issue
  console.log(`[github-issue] Creating issue: ${title}`)
  const issue = await createGitHubIssue(token, repo, title, body, labels)
  console.log(`[github-issue] Issue created: ${issue.html_url}`)

  // Write issue URL to file for downstream scripts (email-notifier)
  const issueInfoPath = path.join(process.cwd(), 'reports', 'github-issue.json')
  fs.writeFileSync(issueInfoPath, JSON.stringify({
    number: issue.number,
    url: issue.html_url,
  }, null, 2), 'utf-8')
}

main().catch(console.error)
