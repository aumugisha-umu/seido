/**
 * Update Health Indices JSON from Statbel (SPF Economie)
 *
 * Fetches the latest Belgian health index ("indice santé") data
 * and merges it with the existing health-indices.json file.
 *
 * Usage: npx tsx scripts/update-health-indices.ts
 *
 * Sources:
 * - Primary: Statbel CSV — https://statbel.fgov.be/fr/themes/prix-la-consommation/indice-sante
 * - Alternative: NBB.Stat SDMX API — https://stat.nbb.be/
 *
 * Behavior on failure:
 * - Logs error to stderr
 * - Exits with code 1
 * - Does NOT overwrite existing file
 */

import fs from 'fs'
import path from 'path'

const INDICES_PATH = path.join(process.cwd(), 'lib/indexation/health-indices.json')

// Statbel open data URL for consumer price index / health index
// This URL may change when Statbel redesigns their portal — check manually if fetch fails.
const STATBEL_URL = 'https://statbel.fgov.be/sites/default/files/files/documents/Consumptieprijsindex/9.1_FR.xls'

// NBB.Stat alternative (SDMX format, more stable URL pattern)
const NBB_STAT_URL = 'https://stat.nbb.be/restsdmx/sdmx.ashx/GetData/HEALTHINDEX/M..INDEX/all'

interface IndexEntry {
  year: number
  month: number
  value: number
}

// ---------------------------------------------------------------------------
// Parsing strategies
// ---------------------------------------------------------------------------

/**
 * Parse CSV/TSV data from Statbel.
 * Expected format varies but typically has columns: year, month, index value.
 * This parser tries multiple common formats.
 */
function parseStatbelCsv(text: string): IndexEntry[] {
  const entries: IndexEntry[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    // Try tab-separated, then semicolon, then comma
    const parts = line.includes('\t')
      ? line.split('\t')
      : line.includes(';')
        ? line.split(';')
        : line.split(',')

    // Look for patterns: YYYY, MM, value OR YYYY-MM, value
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim()

      // Pattern: YYYY-MM format
      const dateMatch = part.match(/^(\d{4})-(\d{2})$/)
      if (dateMatch) {
        const year = parseInt(dateMatch[1])
        const month = parseInt(dateMatch[2])
        // Next numeric part is the value
        for (let j = i + 1; j < parts.length; j++) {
          const val = parseFloat(parts[j].trim().replace(',', '.'))
          if (!isNaN(val) && val > 50 && val < 200) {
            entries.push({ year, month, value: val })
            break
          }
        }
        break
      }

      // Pattern: YYYY/MM format
      const slashMatch = part.match(/^(\d{4})\/(\d{2})$/)
      if (slashMatch) {
        const year = parseInt(slashMatch[1])
        const month = parseInt(slashMatch[2])
        for (let j = i + 1; j < parts.length; j++) {
          const val = parseFloat(parts[j].trim().replace(',', '.'))
          if (!isNaN(val) && val > 50 && val < 200) {
            entries.push({ year, month, value: val })
            break
          }
        }
        break
      }
    }
  }

  return entries
}

/**
 * Parse SDMX XML response from NBB.Stat
 */
function parseNbbSdmx(xml: string): IndexEntry[] {
  const entries: IndexEntry[] = []

  // Match Obs elements with TIME_PERIOD and OBS_VALUE
  const obsRegex = /<generic:Obs>[\s\S]*?<generic:ObsDimension value="(\d{4}-\d{2})"[\s\S]*?<generic:ObsValue value="([\d.]+)"/g

  let match
  while ((match = obsRegex.exec(xml)) !== null) {
    const [year, month] = match[1].split('-').map(Number)
    const value = parseFloat(match[2])
    if (!isNaN(value) && year && month) {
      entries.push({ year, month, value })
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// Fetch with fallback
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchEntries(): Promise<IndexEntry[]> {
  // Try NBB.Stat SDMX first (more stable URL pattern)
  try {
    console.log('Fetching from NBB.Stat SDMX API...')
    const response = await fetchWithTimeout(NBB_STAT_URL)
    if (response.ok) {
      const xml = await response.text()
      const entries = parseNbbSdmx(xml)
      if (entries.length > 0) {
        console.log(`  Parsed ${entries.length} entries from NBB.Stat`)
        return entries
      }
      console.warn('  NBB.Stat returned data but parsing found 0 entries')
    } else {
      console.warn(`  NBB.Stat returned HTTP ${response.status}`)
    }
  } catch (err) {
    console.warn(`  NBB.Stat fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Fallback: Statbel CSV
  try {
    console.log('Fetching from Statbel CSV...')
    const response = await fetchWithTimeout(STATBEL_URL)
    if (response.ok) {
      const text = await response.text()
      const entries = parseStatbelCsv(text)
      if (entries.length > 0) {
        console.log(`  Parsed ${entries.length} entries from Statbel`)
        return entries
      }
      console.warn('  Statbel returned data but parsing found 0 entries')
    } else {
      console.warn(`  Statbel returned HTTP ${response.status}`)
    }
  } catch (err) {
    console.warn(`  Statbel fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return []
}

// ---------------------------------------------------------------------------
// Merge and save
// ---------------------------------------------------------------------------

function toKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

async function main(): Promise<void> {
  console.log('=== Health Indices Update Script ===\n')

  // Read existing file
  let existing: Record<string, number> = {}
  try {
    const raw = fs.readFileSync(INDICES_PATH, 'utf-8')
    existing = JSON.parse(raw)
    console.log(`Existing file: ${Object.keys(existing).length} entries`)
  } catch {
    console.warn('No existing file found, will create new one')
  }

  // Fetch new data
  const entries = await fetchEntries()

  if (entries.length === 0) {
    console.error('\nERROR: Could not fetch any index data from any source.')
    console.error('The existing file has NOT been modified.')
    console.error('\nTroubleshooting:')
    console.error('  1. Check your internet connection')
    console.error('  2. Try opening the URLs manually:')
    console.error(`     - ${NBB_STAT_URL}`)
    console.error(`     - ${STATBEL_URL}`)
    console.error('  3. URLs may have changed — update the constants in this script')
    process.exit(1)
  }

  // Merge: new entries take precedence
  const merged = { ...existing }
  let newCount = 0
  let updatedCount = 0

  for (const entry of entries) {
    const key = toKey(entry.year, entry.month)
    const rounded = Math.round(entry.value * 100) / 100

    if (!(key in merged)) {
      newCount++
    } else if (merged[key] !== rounded) {
      updatedCount++
    }
    merged[key] = rounded
  }

  // Sort keys chronologically
  const sorted: Record<string, number> = {}
  for (const key of Object.keys(merged).sort()) {
    sorted[key] = merged[key]
  }

  // Write
  fs.writeFileSync(INDICES_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')

  console.log(`\nResult:`)
  console.log(`  Total entries: ${Object.keys(sorted).length}`)
  console.log(`  New entries:   ${newCount}`)
  console.log(`  Updated:       ${updatedCount}`)
  console.log(`  File written:  ${INDICES_PATH}`)
  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
