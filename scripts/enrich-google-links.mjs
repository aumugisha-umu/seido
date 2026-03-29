/**
 * Enrich prospects with Google Business Profile links
 * Searches Google for each company + "Bruxelles" and extracts the Google Maps/Business URL
 *
 * Usage: node scripts/enrich-google-links.mjs [--start N] [--end M]
 *   --start N : start at index N (0-based, default 0)
 *   --end M   : end at index M (exclusive, default all)
 *
 * Produces: docs/sales/_enrichment_google_links.json
 * Resume-capable: skips companies already in output file
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const SALES_DIR = join(process.cwd(), 'docs/sales')
const OUTPUT = join(SALES_DIR, '_enrichment_google_links.json')

// Parse CLI args
const args = process.argv.slice(2)
const startIdx = parseInt(args[args.indexOf('--start') + 1]) || 0
const endIdx = args.includes('--end') ? parseInt(args[args.indexOf('--end') + 1]) : Infinity

// Load prospects
const prospects = JSON.parse(readFileSync(join(SALES_DIR, '_prospects_scored.json'), 'utf-8'))
console.log(`Loaded ${prospects.length} companies`)

// Load existing results for resume
let results = {}
if (existsSync(OUTPUT)) {
  try {
    const existing = JSON.parse(readFileSync(OUTPUT, 'utf-8'))
    for (const r of existing) results[r.company] = r
    console.log(`Resuming: ${Object.keys(results).length} already processed`)
  } catch { /* start fresh */ }
}

// Slice for this agent's range
const slice = prospects.slice(startIdx, Math.min(endIdx, prospects.length))
const toProcess = slice.filter(p => !results[p.name])
console.log(`Range: ${startIdx}-${Math.min(endIdx, prospects.length)} | To process: ${toProcess.length}`)

// Verify first 3 samples
console.log('Samples:', toProcess.slice(0, 3).map(p => ({ name: p.name, commune: p.commune })))

// Google search URL builder
function buildSearchUrl(company, commune) {
  const query = encodeURIComponent(`${company} agence immobilière ${commune || 'Bruxelles'}`)
  return `https://www.google.com/search?q=${query}&hl=fr`
}

// Extract Google Maps/Business URL from search result HTML
function extractGoogleUrl(html, company) {
  // Look for Google Maps link
  const mapsPatterns = [
    /https:\/\/www\.google\.com\/maps\/place\/[^"'\s<>]+/g,
    /https:\/\/maps\.google\.com\/[^"'\s<>]+/g,
    /\/maps\/place\/[^"'\s<>]+/g,
  ]

  for (const pat of mapsPatterns) {
    const matches = html.match(pat)
    if (matches && matches.length > 0) {
      let url = matches[0]
      if (url.startsWith('/')) url = 'https://www.google.com' + url
      // Decode HTML entities in URL
      url = url.replace(/&amp;/g, '&')
      return url
    }
  }

  return null
}

// Extract Google rating from search result
function extractRating(html) {
  // Pattern: "X,Y" or "X.Y" followed by star-related content
  const ratingMatch = html.match(/(\d[.,]\d)\s*(?:\/\s*5|étoile|star|⭐)/i)
  if (ratingMatch) {
    return parseFloat(ratingMatch[1].replace(',', '.'))
  }
  // Alternative: aria-label pattern
  const ariaMatch = html.match(/aria-label="[^"]*?(\d[.,]\d)[^"]*?(?:star|étoile)/i)
  if (ariaMatch) {
    return parseFloat(ariaMatch[1].replace(',', '.'))
  }
  return null
}

// Extract review count
function extractReviewCount(html) {
  const countMatch = html.match(/(\d[\d\s.,]*)\s*(?:avis|reviews?|Google\s*reviews?)/i)
  if (countMatch) {
    return parseInt(countMatch[1].replace(/[\s.,]/g, ''))
  }
  return null
}

// Fetch with timeout + retry
async function fetchWithRetry(url, retries = 2, timeoutMs = 15000) {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-BE,fr;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      })
      clearTimeout(timer)
      if (resp.status === 429) {
        // Rate limited — wait and retry
        console.log(`  Rate limited, waiting ${(i + 1) * 5}s...`)
        await new Promise(r => setTimeout(r, (i + 1) * 5000))
        continue
      }
      return await resp.text()
    } catch (err) {
      clearTimeout(timer)
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, 2000))
    }
  }
}

// Process one company
async function processCompany(prospect) {
  const result = {
    company: prospect.name,
    commune: prospect.commune || '',
    google_maps_url: null,
    google_rating: prospect.googleData?.google_rating || null,
    google_review_count: prospect.googleData?.google_review_count || null,
    error: null,
  }

  try {
    const searchUrl = buildSearchUrl(prospect.name, prospect.commune)
    const html = await fetchWithRetry(searchUrl)

    // Extract Maps URL
    result.google_maps_url = extractGoogleUrl(html, prospect.name)

    // Try to get/update rating and review count from search results
    const foundRating = extractRating(html)
    const foundCount = extractReviewCount(html)
    if (foundRating) result.google_rating = foundRating
    if (foundCount) result.google_review_count = foundCount

  } catch (err) {
    result.error = err.name === 'AbortError' ? 'timeout' : (err.message?.slice(0, 100) || 'unknown')
  }

  return result
}

// Main
async function main() {
  const BATCH_SIZE = 3  // Conservative for Google
  const DELAY_MS = 3000 // 3s between batches to avoid rate limiting
  let processed = 0

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map(p => processCompany(p)))

    for (const r of batchResults) {
      results[r.company] = r
      processed++
    }

    // Save every 15 companies
    if (processed % 15 < BATCH_SIZE || i + BATCH_SIZE >= toProcess.length) {
      writeFileSync(OUTPUT, JSON.stringify(Object.values(results), null, 2), 'utf-8')
    }

    // Progress
    const done = Math.min(i + BATCH_SIZE, toProcess.length)
    if (done % 30 < BATCH_SIZE || done === toProcess.length) {
      const withUrl = Object.values(results).filter(r => r.google_maps_url).length
      console.log(`  Progress: ${done}/${toProcess.length} | Total results: ${Object.keys(results).length} | With Maps URL: ${withUrl}`)
    }

    // Delay between batches
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  // Final save
  const allResults = Object.values(results)
  writeFileSync(OUTPUT, JSON.stringify(allResults, null, 2), 'utf-8')

  // Stats
  const withUrl = allResults.filter(r => r.google_maps_url).length
  const withRating = allResults.filter(r => r.google_rating).length
  const errors = allResults.filter(r => r.error).length

  console.log('\n=== FINAL STATS ===')
  console.log(`Total: ${allResults.length}`)
  console.log(`With Google Maps URL: ${withUrl} (${(withUrl/allResults.length*100).toFixed(1)}%)`)
  console.log(`With rating: ${withRating}`)
  console.log(`Errors: ${errors}`)
}

main().catch(console.error)
