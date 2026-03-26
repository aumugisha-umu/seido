/**
 * QA Bot Telegram Notifier — Phase 3
 *
 * Sends a compact Telegram summary of the QA report via Telegram Bot API.
 * Direct HTTP call to api.telegram.org — no OpenClaw dependency.
 *
 * Usage: npx tsx tests/qa-bot/reporting/telegram-notifier.ts
 *
 * Environment:
 *   TELEGRAM_BOT_TOKEN  — Telegram bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — recipient chat ID (your user ID)
 *   COMMIT_SHA          — deployed commit hash
 *   TARGET_URL          — URL that was tested
 */

import * as fs from 'node:fs'

import { SEVERITY, type Severity } from '../helpers/constants'
import { findReportPath, getShortSha } from './report-helpers'

// ─── Helpers ────────────────────────────────────────────

function severityEmoji(severity: Severity): string {
  switch (severity) {
    case SEVERITY.CRITICAL: return '\u{1F534}'
    case SEVERITY.HIGH: return '\u{1F7E0}'
    case SEVERITY.MEDIUM: return '\u{1F7E1}'
    case SEVERITY.LOW: return '\u{1F535}'
    default: return '\u{26AA}'
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

      if (summary.topIssues.length < 5) {
        summary.topIssues.push(`${severityEmoji(severity)} ${title}`)
      }
    }
  }

  return summary
}

function buildTelegramMessage(
  summary: AnomalySummary,
  shortSha: string,
  targetUrl: string,
  issueUrl: string | null,
): string {
  const parts: string[] = []

  if (summary.total === 0) {
    parts.push(`\u{2705} <b>SEIDO QA \u2014 All Clear</b>`)
    parts.push(`Deploy <code>${shortSha}</code> passed all checks.`)
    parts.push(`Target: ${targetUrl}`)
    return parts.join('\n')
  }

  parts.push(`\u{1F6A8} <b>SEIDO QA Report \u2014 ${summary.total} anomalies</b>`)
  parts.push(`Deploy: <code>${shortSha}</code>`)

  const counts: string[] = []
  if (summary.critical > 0) counts.push(`${severityEmoji(SEVERITY.CRITICAL)} ${summary.critical} Critical`)
  if (summary.high > 0) counts.push(`${severityEmoji(SEVERITY.HIGH)} ${summary.high} High`)
  if (summary.medium > 0) counts.push(`${severityEmoji(SEVERITY.MEDIUM)} ${summary.medium} Medium`)
  if (summary.low > 0) counts.push(`${severityEmoji(SEVERITY.LOW)} ${summary.low} Low`)
  parts.push(counts.join(' | '))

  if (summary.topIssues.length > 0) {
    parts.push('')
    parts.push('<b>Top issues:</b>')
    for (const issue of summary.topIssues) {
      parts.push(`  ${issue}`)
    }
    if (summary.total > 5) {
      parts.push(`  <i>... and ${summary.total - 5} more</i>`)
    }
  }

  parts.push('')
  parts.push(`Target: ${targetUrl}`)
  if (issueUrl) {
    parts.push(`GitHub Issue: ${issueUrl}`)
  }

  return parts.join('\n')
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (response.ok) {
      const data = await response.json() as { ok: boolean; result?: { message_id: number } }
      console.log(`[telegram] Message sent, ID: ${data.result?.message_id}`)
      return
    }

    // Rate limited — Telegram returns 429 with retry_after
    if (response.status === 429) {
      const body = await response.json() as { parameters?: { retry_after?: number } }
      const retryAfter = body.parameters?.retry_after || attempt * 2
      console.log(`[telegram] Rate limited, retrying in ${retryAfter}s (attempt ${attempt}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
      continue
    }

    const errorBody = await response.text()
    throw new Error(`Telegram API error ${response.status}: ${errorBody}`)
  }

  throw new Error(`Telegram API: still rate limited after ${maxRetries} retries`)
}

// ─── Main ───────────────────────────────────────────────

export async function main(): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  const commitSha = process.env.COMMIT_SHA || 'unknown'
  const targetUrl = process.env.TARGET_URL || 'https://preview.seido-app.com'
  const shortSha = getShortSha(commitSha)

  if (!botToken) {
    console.log('[telegram] TELEGRAM_BOT_TOKEN not set, skipping Telegram notification')
    return
  }
  if (!chatId) {
    console.log('[telegram] TELEGRAM_CHAT_ID not set, skipping Telegram notification')
    return
  }

  const reportPath = findReportPath()
  if (!reportPath) {
    console.log('[telegram] No report found, skipping Telegram notification')
    return
  }

  console.log(`[telegram] Reading report: ${reportPath}`)
  const reportContent = fs.readFileSync(reportPath, 'utf-8')

  const summary = parseReportSummary(reportContent)
  console.log(`[telegram] Anomalies: ${summary.total} (${summary.critical}C/${summary.high}H/${summary.medium}M/${summary.low}L)`)

  let issueUrl: string | null = null
  try {
    const issueInfoPath = `${process.cwd()}/reports/github-issue.json`
    if (fs.existsSync(issueInfoPath)) {
      const issueInfo = JSON.parse(fs.readFileSync(issueInfoPath, 'utf-8'))
      issueUrl = issueInfo.url || null
    }
  } catch { /* ignore */ }

  const message = buildTelegramMessage(summary, shortSha, targetUrl, issueUrl)
  console.log(`[telegram] Sending to chat ${chatId}...`)

  await sendTelegramMessage(botToken, chatId, message)
  console.log('[telegram] Notification sent successfully')
}

main().catch(console.error)
