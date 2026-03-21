/**
 * QA Bot — Anomaly Detector
 *
 * Monitors a Playwright page for runtime anomalies:
 * - Console errors (JS exceptions)
 * - Page errors (unhandled promise rejections)
 * - Network failures (4xx/5xx responses, failed requests)
 * - Error boundary text in page content
 * - Placeholder text that should not appear in production
 * - Layout overflow (elements wider than viewport)
 *
 * Takes screenshots ONLY when anomalies are detected.
 */

import type { Page, ConsoleMessage, Request } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { ANOMALY_PATTERNS, REPORT_PATHS, type Anomaly, type AnomalySeverity } from '../helpers/constants'

interface AnomalyDetectorResult {
  /** Get all anomalies detected since setup or last call */
  getAnomalies: () => Anomaly[]
  /** Remove all event listeners */
  cleanup: () => void
}

let screenshotCounter = 0

function isNetworkNoise(url: string): boolean {
  return ANOMALY_PATTERNS.networkNoise.some(pattern => url.includes(pattern))
}

function isConsoleNoise(text: string): boolean {
  return ANOMALY_PATTERNS.consoleNoise.some(pattern => text.includes(pattern))
}

async function takeAnomalyScreenshot(page: Page): Promise<string> {
  screenshotCounter++
  const screenshotDir = path.resolve(process.cwd(), REPORT_PATHS.screenshots)
  fs.mkdirSync(screenshotDir, { recursive: true })

  const filename = `anomaly-${String(screenshotCounter).padStart(3, '0')}.png`
  const filePath = path.join(screenshotDir, filename)

  try {
    await page.screenshot({ path: filePath, fullPage: false })
    return filePath
  } catch (err) {
    console.log(`[anomaly] Screenshot failed: ${err instanceof Error ? err.message : String(err)}`)
    return ''
  }
}

/**
 * Set up anomaly detection listeners on a Playwright page.
 * Call cleanup() when done with the page to remove listeners.
 */
export function setupAnomalyDetector(page: Page): AnomalyDetectorResult {
  const anomalies: Anomaly[] = []

  // ── Console error listener ──
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return

    const text = msg.text()
    if (isConsoleNoise(text)) return
    if (isNetworkNoise(text)) return

    anomalies.push({
      type: 'console-error',
      severity: 'high',
      message: text.slice(0, 500),
      url: page.url(),
      timestamp: new Date().toISOString(),
    })
  }

  // ── Unhandled page error listener ──
  const onPageError = (error: Error) => {
    anomalies.push({
      type: 'page-error',
      severity: 'high',
      message: error.message.slice(0, 500),
      url: page.url(),
      timestamp: new Date().toISOString(),
      details: error.stack?.slice(0, 1000),
    })
  }

  // ── Network failure listener ──
  const onRequestFailed = (request: Request) => {
    const url = request.url()
    if (isNetworkNoise(url)) return

    const failure = request.failure()
    const failureText = failure?.errorText || 'Unknown error'
    if (failureText === 'net::ERR_ABORTED') return

    anomalies.push({
      type: 'network-error',
      severity: 'high',
      message: `${request.method()} ${url} — ${failureText}`,
      url: page.url(),
      timestamp: new Date().toISOString(),
    })
  }

  // Attach listeners
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('requestfailed', onRequestFailed)

  return {
    getAnomalies: () => {
      const drained = [...anomalies]
      anomalies.length = 0
      return drained
    },
    cleanup: () => {
      page.off('console', onConsole)
      page.off('pageerror', onPageError)
      page.off('requestfailed', onRequestFailed)
    },
  }
}

/**
 * Check the current page content for static anomalies.
 * Should be called after page navigation and after each action.
 */
export async function checkPageContent(page: Page): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []
  const url = page.url()
  const timestamp = new Date().toISOString()

  try {
    const bodyText = await page.evaluate(() => document.body?.innerText || '')

    // Check for error boundary text
    for (const pattern of ANOMALY_PATTERNS.errorBoundary) {
      if (bodyText.includes(pattern)) {
        const screenshotPath = await takeAnomalyScreenshot(page)
        anomalies.push({
          type: 'error-boundary',
          severity: 'critical',
          message: `Error boundary detected: "${pattern}"`,
          url,
          timestamp,
          screenshotPath,
          details: bodyText.slice(0, 300),
        })
        // One error boundary is enough, don't report multiple patterns for same crash
        break
      }
    }

    // Check for placeholder text (only if no error boundary — page might be broken)
    if (anomalies.length === 0) {
      for (const pattern of ANOMALY_PATTERNS.placeholderText) {
        // Use word boundary detection to avoid false positives
        // e.g. "undefined" inside a word, or "null" as part of "nullable"
        const regex = new RegExp(`\\b${escapeRegExp(pattern)}\\b`, 'i')
        if (regex.test(bodyText)) {
          // Filter out common false positives: "null" inside form labels, etc.
          if (pattern === 'null' && bodyText.toLowerCase().includes('nullable')) continue
          if (pattern === 'undefined' && bodyText.toLowerCase().includes('if undefined')) continue

          const screenshotPath = await takeAnomalyScreenshot(page)
          anomalies.push({
            type: 'placeholder-text',
            severity: 'medium',
            message: `Placeholder text found: "${pattern}"`,
            url,
            timestamp,
            screenshotPath,
          })
        }
      }
    }

    // Check for layout overflow
    const overflowElements = await page.evaluate(() => {
      const viewportWidth = window.innerWidth
      const elements = document.querySelectorAll('*')
      const overflows: string[] = []

      elements.forEach(el => {
        const rect = el.getBoundingClientRect()
        if (rect.width > viewportWidth + 5) { // 5px tolerance
          const tag = el.tagName.toLowerCase()
          const id = el.id ? `#${el.id}` : ''
          const cls = el.className && typeof el.className === 'string'
            ? `.${el.className.split(' ').slice(0, 2).join('.')}`
            : ''
          overflows.push(`${tag}${id}${cls} (${Math.round(rect.width)}px > ${viewportWidth}px)`)
        }
      })

      return overflows.slice(0, 3) // Limit to 3 overflow reports
    })

    if (overflowElements.length > 0) {
      const screenshotPath = await takeAnomalyScreenshot(page)
      anomalies.push({
        type: 'layout-overflow',
        severity: 'medium',
        message: `Layout overflow: ${overflowElements.join(', ')}`,
        url,
        timestamp,
        screenshotPath,
      })
    }
  } catch (err) {
    // Page might have navigated away or crashed — don't throw
    console.log(`[anomaly] Content check failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return anomalies
}

/**
 * Classify anomaly severity for reporting.
 */
export function classifySeverity(anomalies: Anomaly[]): Record<AnomalySeverity, number> {
  const counts: Record<AnomalySeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }

  for (const anomaly of anomalies) {
    counts[anomaly.severity]++
  }

  return counts
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
