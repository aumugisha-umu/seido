/**
 * Shared helpers for QA Bot reporting scripts.
 *
 * Extracted from email-notifier.ts, github-issue.ts, and regression-tracker.ts
 * to avoid copy-paste duplication.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

/** Return the first 7 characters of a commit SHA. */
export function getShortSha(sha: string): string {
  return sha.slice(0, 7)
}

/**
 * Locate the most recent QA report Markdown file.
 * Checks for `qa-report-latest.md` first, then falls back to the most recent
 * date-stamped `qa-report-*.md` file in the `reports/` directory.
 */
export function findReportPath(): string | null {
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
