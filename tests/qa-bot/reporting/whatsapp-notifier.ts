/**
 * QA Bot WhatsApp Notifier — Phase 3
 *
 * Sends a compact WhatsApp summary of the QA report via OpenClaw CLI.
 * Uses `openclaw agent --to <number> --deliver` to route through the
 * linked WhatsApp channel.
 *
 * Usage: npx tsx tests/qa-bot/reporting/whatsapp-notifier.ts
 *
 * Environment:
 *   WHATSAPP_NOTIFY_NUMBER — recipient phone (E.164 format, e.g. +32474028838)
 *   COMMIT_SHA             — deployed commit hash
 *   TARGET_URL             — URL that was tested
 */

import * as fs from 'node:fs'
import { execSync } from 'node:child_process'

import { SEVERITY, type Severity } from '../helpers/constants'
import { findReportPath, getShortSha } from './report-helpers'

// ─── Helpers ────────────────────────────────────────────

function severityEmoji(severity: Severity): string {
  switch (severity) {
    case SEVERITY.CRITICAL: return '\u{1F534}' // red circle
    case SEVERITY.HIGH: return '\u{1F7E0}' // orange circle
    case SEVERITY.MEDIUM: return '\u{1F7E1}' // yellow circle
    case SEVERITY.LOW: return '\u{1F535}' // blue circle
    default: return '\u{26AA}' // white circle
  }
}

interface AnomalySummary {
  critical: number
  high: number
  medium: number
  low: number
  total: number
  topIssues: string[]
}

function parseReportSummary(reportContent: string): AnomalySummary {
  const summary: AnomalySummary = { critical: 0, high: 0, medium: 0, low: 0, total: 0, topIssues: [] }
  const lines = reportContent.split('\n')

  for (const line of lines) {
    const match = line.match(/^### \[(CRITICAL|HIGH|MEDIUM|LOW)\] (.+)/)
    if (match) {
      const severity = match[1] as Severity
      const title = match[2]
      summary.total++

      switch (severity) {
        case SEVERITY.CRITICAL: summary.critical++; break
        case SEVERITY.HIGH: summary.high++; break
        case SEVERITY.MEDIUM: summary.medium++; break
        case SEVERITY.LOW: summary.low++; break
      }

      // Keep top 5 issues for the message
      if (summary.topIssues.length < 5) {
        summary.topIssues.push(`${severityEmoji(severity)} ${title}`)
      }
    }
  }

  return summary
}

function buildWhatsAppMessage(
  summary: AnomalySummary,
  shortSha: string,
  targetUrl: string,
  issueUrl: string | null,
): string {
  const parts: string[] = []

  if (summary.total === 0) {
    parts.push(`\u{2705} *SEIDO QA — All Clear*`)
    parts.push(`Deploy \`${shortSha}\` passed all checks.`)
    parts.push(`Target: ${targetUrl}`)
    return parts.join('\n')
  }

  // Header with severity counts
  parts.push(`\u{1F6A8} *SEIDO QA Report — ${summary.total} anomalies*`)
  parts.push(`Deploy: \`${shortSha}\``)

  const counts: string[] = []
  if (summary.critical > 0) counts.push(`${severityEmoji(SEVERITY.CRITICAL)} ${summary.critical} Critical`)
  if (summary.high > 0) counts.push(`${severityEmoji(SEVERITY.HIGH)} ${summary.high} High`)
  if (summary.medium > 0) counts.push(`${severityEmoji(SEVERITY.MEDIUM)} ${summary.medium} Medium`)
  if (summary.low > 0) counts.push(`${severityEmoji(SEVERITY.LOW)} ${summary.low} Low`)
  parts.push(counts.join(' | '))

  // Top issues
  if (summary.topIssues.length > 0) {
    parts.push('')
    parts.push('*Top issues:*')
    for (const issue of summary.topIssues) {
      parts.push(`  ${issue}`)
    }
    if (summary.total > 5) {
      parts.push(`  _... and ${summary.total - 5} more_`)
    }
  }

  // Links
  parts.push('')
  parts.push(`Target: ${targetUrl}`)
  if (issueUrl) {
    parts.push(`GitHub Issue: ${issueUrl}`)
  }

  return parts.join('\n')
}

function sendViaOpenClaw(phoneNumber: string, message: string): void {
  // Escape single quotes in the message for shell safety
  const escapedMessage = message.replace(/'/g, "'\\''")

  const cmd = `openclaw agent --to ${phoneNumber} --message '${escapedMessage}' --deliver`

  try {
    execSync(cmd, { timeout: 30_000, encoding: 'utf-8', stdio: 'pipe' })
    console.log(`[whatsapp] Message sent to ${phoneNumber}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[whatsapp] Failed to send via OpenClaw CLI: ${msg.slice(0, 200)}`)

    // Fallback: try using the sessions_send tool via gateway API
    console.log('[whatsapp] Attempting fallback via gateway API...')
    sendViaGatewayApi(phoneNumber, message)
  }
}

function sendViaGatewayApi(phoneNumber: string, message: string): void {
  try {
    // Read gateway token from config
    const configPath = '/data/.openclaw/openclaw.json'
    if (!fs.existsSync(configPath)) {
      console.log('[whatsapp] No OpenClaw config found, skipping gateway fallback')
      return
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const token = config?.gateway?.auth?.token || config?.hooks?.token

    if (!token) {
      console.log('[whatsapp] No gateway token found in config')
      return
    }

    // Use the sessions_send REST API
    const payload = JSON.stringify({
      channel: 'whatsapp',
      to: phoneNumber,
      message,
    })

    execSync(
      `curl -s -X POST http://127.0.0.1:18789/api/v1/sessions/send \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d '${payload.replace(/'/g, "'\\''")}'`,
      { timeout: 15_000, encoding: 'utf-8', stdio: 'pipe' },
    )
    console.log(`[whatsapp] Message sent via gateway API to ${phoneNumber}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[whatsapp] Gateway fallback also failed: ${msg.slice(0, 200)}`)
  }
}

// ─── Main ───────────────────────────────────────────────

export async function main(): Promise<void> {
  const phoneNumber = process.env.WHATSAPP_NOTIFY_NUMBER
  const commitSha = process.env.COMMIT_SHA || 'unknown'
  const targetUrl = process.env.TARGET_URL || 'https://preview.seido-app.com'
  const shortSha = getShortSha(commitSha)

  if (!phoneNumber) {
    console.log('[whatsapp] WHATSAPP_NOTIFY_NUMBER not set, skipping WhatsApp notification')
    return
  }

  // Read report
  const reportPath = findReportPath()
  if (!reportPath) {
    console.log('[whatsapp] No report found, skipping WhatsApp notification')
    return
  }

  console.log(`[whatsapp] Reading report: ${reportPath}`)
  const reportContent = fs.readFileSync(reportPath, 'utf-8')

  // Parse summary
  const summary = parseReportSummary(reportContent)
  console.log(`[whatsapp] Anomalies: ${summary.total} (${summary.critical}C/${summary.high}H/${summary.medium}M/${summary.low}L)`)

  // Read GitHub issue URL if available
  const issueInfoPath = `${process.cwd()}/reports/github-issue.json`
  let issueUrl: string | null = null
  try {
    if (fs.existsSync(issueInfoPath)) {
      const issueInfo = JSON.parse(fs.readFileSync(issueInfoPath, 'utf-8'))
      issueUrl = issueInfo.url || null
    }
  } catch { /* ignore */ }

  // Build message
  const message = buildWhatsAppMessage(summary, shortSha, targetUrl, issueUrl)
  console.log(`[whatsapp] Sending to ${phoneNumber}...`)

  // Send
  sendViaOpenClaw(phoneNumber, message)
}

main().catch(console.error)
