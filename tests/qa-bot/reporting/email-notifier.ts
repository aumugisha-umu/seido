/**
 * QA Bot Email Notifier — Phase 3
 *
 * Reads the generated report and sends an email notification via Resend.
 * Sends a detailed alert if anomalies are found, or a brief "all clear" otherwise.
 *
 * Usage: npx tsx tests/qa-bot/reporting/email-notifier.ts
 *
 * Environment:
 *   RESEND_API_KEY     — Resend API key
 *   NOTIFICATION_EMAIL — recipient email address
 *   COMMIT_SHA         — deployed commit hash
 *   TARGET_URL         — URL that was tested
 *   GITHUB_SERVER_URL  — GitHub server URL (defaults to https://github.com)
 *   GITHUB_REPOSITORY  — owner/repo format
 *   GITHUB_RUN_ID      — GitHub Actions run ID
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { SEVERITY, type Severity } from '../helpers/constants'

// ─── Types ──────────────────────────────────────────────

interface ParsedAnomaly {
  severity: Severity
  title: string
  details: string[]
}

interface GitHubIssueInfo {
  number: number
  url: string
}

// ─── Helpers ────────────────────────────────────────────

function getShortSha(sha: string): string {
  return sha.slice(0, 7)
}

function findReportPath(): string | null {
  const reportsDir = path.join(process.cwd(), 'reports')
  const latestPath = path.join(reportsDir, 'qa-report-latest.md')
  if (fs.existsSync(latestPath)) return latestPath

  if (!fs.existsSync(reportsDir)) return null
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('qa-report-') && f.endsWith('.md'))
    .sort()
    .reverse()

  return files.length > 0 ? path.join(reportsDir, files[0]) : null
}

function readGitHubIssueInfo(): GitHubIssueInfo | null {
  const issueInfoPath = path.join(process.cwd(), 'reports', 'github-issue.json')
  if (!fs.existsSync(issueInfoPath)) return null

  try {
    return JSON.parse(fs.readFileSync(issueInfoPath, 'utf-8'))
  } catch {
    return null
  }
}

function parseAnomalies(reportContent: string): ParsedAnomaly[] {
  const anomalies: ParsedAnomaly[] = []
  const lines = reportContent.split('\n')
  let currentAnomaly: ParsedAnomaly | null = null

  for (const line of lines) {
    const headerMatch = line.match(/^### \[(CRITICAL|HIGH|MEDIUM|LOW)\] (.+)/)
    if (headerMatch) {
      if (currentAnomaly) anomalies.push(currentAnomaly)
      currentAnomaly = {
        severity: headerMatch[1] as Severity,
        title: headerMatch[2],
        details: [],
      }
      continue
    }

    // Stop collecting anomaly details at next ## section
    if (line.startsWith('## ') && currentAnomaly) {
      anomalies.push(currentAnomaly)
      currentAnomaly = null
      continue
    }

    if (currentAnomaly && line.trim()) {
      currentAnomaly.details.push(line)
    }
  }

  if (currentAnomaly) anomalies.push(currentAnomaly)
  return anomalies
}

function getHighestSeverity(anomalies: ParsedAnomaly[]): Severity {
  const order: Severity[] = [SEVERITY.CRITICAL, SEVERITY.HIGH, SEVERITY.MEDIUM, SEVERITY.LOW]
  for (const sev of order) {
    if (anomalies.some(a => a.severity === sev)) return sev
  }
  return SEVERITY.LOW
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Email Builders ─────────────────────────────────────

function severityColor(severity: Severity): string {
  switch (severity) {
    case SEVERITY.CRITICAL: return '#dc2626'
    case SEVERITY.HIGH: return '#ea580c'
    case SEVERITY.MEDIUM: return '#ca8a04'
    case SEVERITY.LOW: return '#2563eb'
    default: return '#6b7280'
  }
}

function buildAnomalyEmailHtml(
  anomalies: ParsedAnomaly[],
  shortSha: string,
  targetUrl: string,
  issueInfo: GitHubIssueInfo | null,
): string {
  const criticalCount = anomalies.filter(a => a.severity === SEVERITY.CRITICAL).length
  const highCount = anomalies.filter(a => a.severity === SEVERITY.HIGH).length
  const mediumCount = anomalies.filter(a => a.severity === SEVERITY.MEDIUM).length
  const lowCount = anomalies.filter(a => a.severity === SEVERITY.LOW).length

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const repo = process.env.GITHUB_REPOSITORY || ''
  const runId = process.env.GITHUB_RUN_ID || ''
  const actionsUrl = runId ? `${serverUrl}/${repo}/actions/runs/${runId}` : ''

  const summaryParts: string[] = []
  if (criticalCount > 0) summaryParts.push(`<strong>${criticalCount} Critical</strong>`)
  if (highCount > 0) summaryParts.push(`<strong>${highCount} High</strong>`)
  if (mediumCount > 0) summaryParts.push(`${mediumCount} Medium`)
  if (lowCount > 0) summaryParts.push(`${lowCount} Low`)

  let html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
    SEIDO QA Bot Report
  </h1>

  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <strong>Anomalies detected:</strong> ${summaryParts.join(', ')}
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 8px; color: #6b7280;">Deploy</td><td style="padding: 4px 8px;"><code>${shortSha}</code></td></tr>
    <tr><td style="padding: 4px 8px; color: #6b7280;">Target</td><td style="padding: 4px 8px;"><a href="${escapeHtml(targetUrl)}">${escapeHtml(targetUrl)}</a></td></tr>
  </table>

  <h2 style="color: #1a1a1a; margin-top: 24px;">Anomaly Details</h2>
`

  for (const anomaly of anomalies) {
    const color = severityColor(anomaly.severity)
    html += `
  <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <span style="background: ${color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${anomaly.severity}</span>
      <strong>${escapeHtml(anomaly.title)}</strong>
    </div>
    <div style="font-size: 14px; color: #374151;">
      ${anomaly.details.map(d => `<div style="margin: 2px 0;">${escapeHtml(d)}</div>`).join('\n')}
    </div>
  </div>
`
  }

  // Links section
  html += '\n  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">'
  if (issueInfo) {
    html += `\n    <p><a href="${issueInfo.url}" style="color: #2563eb;">GitHub Issue #${issueInfo.number}</a></p>`
  }
  if (actionsUrl) {
    html += `\n    <p><a href="${actionsUrl}" style="color: #2563eb;">GitHub Actions Run</a></p>`
  }
  html += `
  </div>

  <div style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
    Generated by SEIDO QA Bot
  </div>
</div>`

  return html
}

function buildAllClearEmailHtml(shortSha: string, targetUrl: string): string {
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const repo = process.env.GITHUB_REPOSITORY || ''
  const runId = process.env.GITHUB_RUN_ID || ''
  const actionsUrl = runId ? `${serverUrl}/${repo}/actions/runs/${runId}` : ''

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
    SEIDO QA Bot Report
  </h1>

  <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <strong>All clear</strong> — No anomalies detected on deploy <code>${shortSha}</code>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 8px; color: #6b7280;">Target</td><td style="padding: 4px 8px;"><a href="${escapeHtml(targetUrl)}">${escapeHtml(targetUrl)}</a></td></tr>
  </table>

  ${actionsUrl ? `<p><a href="${actionsUrl}" style="color: #2563eb;">View GitHub Actions Run</a></p>` : ''}

  <div style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
    Generated by SEIDO QA Bot
  </div>
</div>`
}

// ─── Resend API ─────────────────────────────────────────

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SEIDO QA Bot <qa@seido-app.com>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Resend API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json()
  console.log(`[email-notifier] Email sent, ID: ${data.id}`)
}

// ─── Main ───────────────────────────────────────────────

export async function main(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const recipient = process.env.NOTIFICATION_EMAIL
  const commitSha = process.env.COMMIT_SHA || 'unknown'
  const targetUrl = process.env.TARGET_URL || 'https://preview.seido-app.com'
  const shortSha = getShortSha(commitSha)

  if (!apiKey) {
    console.log('[email-notifier] RESEND_API_KEY not set, skipping email notification')
    return
  }
  if (!recipient) {
    console.log('[email-notifier] NOTIFICATION_EMAIL not set, skipping email notification')
    return
  }

  // Read report
  const reportPath = findReportPath()
  if (!reportPath) {
    console.log('[email-notifier] No report found, skipping email notification')
    return
  }

  console.log(`[email-notifier] Reading report: ${reportPath}`)
  const reportContent = fs.readFileSync(reportPath, 'utf-8')

  // Parse anomalies
  const anomalies = parseAnomalies(reportContent)
  console.log(`[email-notifier] Anomalies found: ${anomalies.length}`)

  // Read GitHub issue info (if created by github-issue.ts)
  const issueInfo = readGitHubIssueInfo()

  let subject: string
  let html: string

  if (anomalies.length > 0) {
    const highestSeverity = getHighestSeverity(anomalies)
    subject = `[SEIDO QA] ${highestSeverity} anomalies detected — deploy ${shortSha}`
    html = buildAnomalyEmailHtml(anomalies, shortSha, targetUrl, issueInfo)
  } else {
    subject = `[SEIDO QA] All clear — deploy ${shortSha}`
    html = buildAllClearEmailHtml(shortSha, targetUrl)
  }

  console.log(`[email-notifier] Sending email to: ${recipient}`)
  console.log(`[email-notifier] Subject: ${subject}`)

  await sendEmail(apiKey, recipient, subject, html)
  console.log('[email-notifier] Email sent successfully')
}

main().catch(console.error)
