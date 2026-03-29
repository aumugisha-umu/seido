/**
 * Scrape IPI agent listing pages 21-100 using Playwright (headless browser)
 * Then enrich each agent via direct HTTP fetch on their individual profile page
 *
 * Usage: node scripts/scrape-ipi-listing.mjs [startPage] [endPage]
 * Default: pages 21-100
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const SALES_DIR = join(process.cwd(), 'docs/sales')
const LISTING_FILE = join(SALES_DIR, '_ipi_listing_raw.json')
const ENRICHED_FILE = join(SALES_DIR, '_ipi_enrichment_new.json')

const START_PAGE = parseInt(process.argv[2]) || 21
const END_PAGE = parseInt(process.argv[3]) || 100
const BATCH_SIZE = 10

// ─── Phase 1: Scrape listing pages with Playwright ───

async function scrapeListingBatch(startPage, endPage) {
  console.log(`\n=== PHASE 1: Scraping listing pages ${startPage}-${endPage} ===\n`)

  // Load existing results for resume
  let allAgents = []
  let scrapedPages = new Set()
  if (existsSync(LISTING_FILE)) {
    const existing = JSON.parse(readFileSync(LISTING_FILE, 'utf-8'))
    allAgents = existing.agents || []
    scrapedPages = new Set(existing.scrapedPages || [])
    console.log(`Resuming: ${allAgents.length} agents from ${scrapedPages.size} pages already scraped`)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })

  try {
    const page = await context.newPage()

    // First visit: handle cookie consent on initial load
    console.log('  Initial load + cookie consent...')
    await page.goto('https://www.ipi.be/agent-immobilier?location=1000&page=0', { waitUntil: 'networkidle', timeout: 30000 })

    // Dismiss cookie consent (Cookiebot)
    try {
      const acceptBtn = await page.waitForSelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, [id*="CookiebotDialog"] button, .CybotCookiebotDialogBodyButton', { timeout: 5000 })
      if (acceptBtn) {
        await acceptBtn.click()
        console.log('  Cookie consent accepted')
        await page.waitForTimeout(2000)
      }
    } catch {
      // Try alternative: click any "accept" or "authorize" button
      try {
        await page.click('text=Tout autoriser', { timeout: 3000 })
        console.log('  Cookie consent accepted (text match)')
        await page.waitForTimeout(2000)
      } catch {
        console.log('  No cookie consent found, continuing...')
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      if (scrapedPages.has(p)) {
        console.log(`  Page ${p}: already scraped, skipping`)
        continue
      }

      const url = `https://www.ipi.be/agent-immobilier?location=1000&page=${p}`
      console.log(`  Page ${p}: fetching...`)

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

        // Wait for agent cards to appear (IPI uses client-side rendering)
        await page.waitForFunction(() => {
          const links = document.querySelectorAll('a[href*="/agent-immobilier/"]')
          return Array.from(links).some(l => /\/agent-immobilier\/.+-\d{5,6}$/.test(l.getAttribute('href')))
        }, { timeout: 15000 }).catch(() => null)

        // Extra wait for all cards to render
        await page.waitForTimeout(1500)

        // Extract agent data from the page
        const agents = await page.evaluate(() => {
          const results = []

          // Find all agent profile links
          const links = document.querySelectorAll('a[href*="/agent-immobilier/"]')
          const seen = new Set()

          for (const link of links) {
            const href = link.getAttribute('href')
            if (!href || href === '/agent-immobilier' || seen.has(href)) continue

            // Extract ID from URL pattern: /agent-immobilier/name-123456
            const idMatch = href.match(/\/agent-immobilier\/(.+)-(\d{5,6})$/)
            if (!idMatch) continue

            const id = idMatch[2]
            if (seen.has(id)) continue
            seen.add(id)

            // Try to extract info from the card context
            const card = link.closest('[class*="card"], [class*="agent"], div, li') || link.parentElement
            const fullUrl = href.startsWith('http') ? href : `https://www.ipi.be${href}`

            // Extract name from the link text or nearby heading
            let name = link.textContent.trim()
            if (!name || name.length < 2) {
              const heading = card?.querySelector('h2, h3, h4, strong, [class*="name"]')
              name = heading?.textContent?.trim() || ''
            }

            // Extract company
            let company = ''
            const companyEl = card?.querySelector('[class*="company"], [class*="entreprise"], small, .text-muted')
            if (companyEl) company = companyEl.textContent.trim()

            // Extract address
            let address = ''
            const addressEl = card?.querySelector('[class*="address"], [class*="adresse"], address')
            if (addressEl) address = addressEl.textContent.trim()

            if (name) {
              results.push({ nom: name, id, entreprise: company, adresse: address, url: fullUrl })
            }
          }
          return results
        })

        if (agents.length === 0) {
          console.log(`  Page ${p}: NO AGENTS FOUND — may be last page`)
          // Save a marker and stop
          scrapedPages.add(p)
          saveListing(allAgents, scrapedPages)
          if (p > startPage) {
            console.log(`  Stopping: empty page likely means end of results`)
            break
          }
        } else {
          console.log(`  Page ${p}: found ${agents.length} agents`)
          for (const a of agents) {
            allAgents.push({ ...a, page: p })
          }
          scrapedPages.add(p)
        }

        // Save every 5 pages
        if (p % 5 === 0) {
          saveListing(allAgents, scrapedPages)
        }

        // Polite delay between pages to avoid IP ban
        await new Promise(r => setTimeout(r, 3000))

      } catch (err) {
        console.log(`  Page ${p}: ERROR — ${err.message}`)
        // Continue to next page
      }
    }

    // Final save
    saveListing(allAgents, scrapedPages)

  } finally {
    await browser.close()
  }

  return allAgents
}

function saveListing(agents, scrapedPages) {
  writeFileSync(LISTING_FILE, JSON.stringify({
    agents,
    scrapedPages: Array.from(scrapedPages),
    total: agents.length,
    lastUpdated: new Date().toISOString()
  }, null, 2), 'utf-8')
  console.log(`  [saved] ${agents.length} agents, ${scrapedPages.size} pages`)
}

// ─── Phase 2: Enrich via direct HTTP fetch ───

function extractDataFromHTML(html) {
  const data = { telephone: '', email: '', site_web: '', statut: '' }
  let m

  // Statut from badge divs
  const statutRegex = /border-gray-150 px-2 py-1 text-primary fw-bolder fs-sm[^"]*">([^<]+)<\/div>/g
  const statuts = []
  while ((m = statutRegex.exec(html)) !== null) statuts.push(m[1].trim())
  data.statut = statuts.join(', ')

  // Email from mailto: links
  const emailRegex = /href="mailto:([^"]+)"/g
  const emails = []
  while ((m = emailRegex.exec(html)) !== null) emails.push(m[1].trim())
  data.email = [...new Set(emails)].join(', ')

  // Phone from tel: links
  const telRegex = /href="tel:([^"]+)"/g
  const phones = []
  while ((m = telRegex.exec(html)) !== null) phones.push(m[1].trim())
  data.telephone = [...new Set(phones)].join(', ')

  // Website from Contact section
  const contactSection = html.match(/Contact<\/h3>([\s\S]*?)(?:<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/)
  if (contactSection) {
    const siteRegex = /href="(https?:\/\/[^"]+)"[^>]*target="_blank"[^>]*>([^<]+)/g
    const sites = []
    while ((m = siteRegex.exec(contactSection[1])) !== null) {
      if (!m[1].includes('google.com/maps')) sites.push(m[1].trim())
    }
    data.site_web = [...new Set(sites)].join(', ')
  }

  // Extract name from <h2 class="fw-bold fs-2xl mb-0">Name</h2>
  const nameMatch = html.match(/<h2[^>]*fw-bold fs-2xl[^>]*>([^<]+)<\/h2>/)
  if (nameMatch) data._name = nameMatch[1].trim()

  // Fallback: extract from <title>Name (BIV xxx) - ...</title>
  if (!data._name) {
    const titleMatch = html.match(/<title[^>]*>([^(]+)\(BIV/)
    if (titleMatch) data._name = titleMatch[1].trim()
  }

  // Extract company from <h3 class="fw-bold fs-2xl">Company</h3>
  const companyMatch = html.match(/<h3[^>]*fw-bold fs-2xl[^>]*>([^<]+)<\/h3>/)
  if (companyMatch) data._entreprise = companyMatch[1].trim()

  // Extract address: find all text-gray-400 divs right after "Adresse</h3>"
  const addrIdx = html.indexOf('Adresse</h3>')
  if (addrIdx > -1) {
    // Grab next 300 chars after the heading (before the SVG map icon)
    const addrChunk = html.slice(addrIdx, addrIdx + 300)
    const addrDivs = addrChunk.match(/text-gray-400">([^<]+)/g)
    if (addrDivs) {
      const parts = addrDivs.map(d => d.replace('text-gray-400">', '').trim()).filter(Boolean)
      data._address = parts.join(', ')
    }
  }

  return data
}

async function enrichBatch(agents) {
  console.log(`\n=== PHASE 2: Enriching ${agents.length} agents ===\n`)

  let results = []
  if (existsSync(ENRICHED_FILE)) {
    results = JSON.parse(readFileSync(ENRICHED_FILE, 'utf-8'))
    console.log(`Resuming: ${results.length} already enriched`)
  }
  const doneIds = new Set(results.map(r => r.id))
  const remaining = agents.filter(a => !doneIds.has(a.id))

  const FETCH_BATCH = 5
  for (let i = 0; i < remaining.length; i += FETCH_BATCH) {
    const batch = remaining.slice(i, i + FETCH_BATCH)
    const batchResults = await Promise.all(batch.map(async (agent) => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const resp = await fetch(agent.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeidoBot/1.0)' }
        })
        clearTimeout(timeout)
        if (!resp.ok) return { id: agent.id, telephone: '', email: '', site_web: '', statut: '' }
        const html = await resp.text()
        const data = extractDataFromHTML(html)
        // Use profile page data to fill gaps from listing
        return {
          id: agent.id,
          nom: data._name || agent.nom,
          entreprise: data._entreprise || agent.entreprise,
          adresse: data._address || agent.adresse,
          telephone: data.telephone,
          email: data.email,
          site_web: data.site_web,
          statut: data.statut,
          url: agent.url,
          page: agent.page
        }
      } catch (err) {
        return { id: agent.id, nom: agent.nom, entreprise: agent.entreprise, adresse: agent.adresse, telephone: '', email: '', site_web: '', statut: '', url: agent.url, page: agent.page }
      }
    }))

    results.push(...batchResults)

    if (results.length % 10 < FETCH_BATCH || i + FETCH_BATCH >= remaining.length) {
      console.log(`  Enriched: ${results.length}/${agents.length}`)
    }
    if (results.length % 20 < FETCH_BATCH || i + FETCH_BATCH >= remaining.length) {
      writeFileSync(ENRICHED_FILE, JSON.stringify(results, null, 2), 'utf-8')
    }

    await new Promise(r => setTimeout(r, 1500))
  }

  writeFileSync(ENRICHED_FILE, JSON.stringify(results, null, 2), 'utf-8')
  console.log(`\nEnrichment done: ${results.length} agents`)

  const stats = {
    total: results.length,
    withPhone: results.filter(r => r.telephone).length,
    withEmail: results.filter(r => r.email).length,
    withSite: results.filter(r => r.site_web).length,
    withStatut: results.filter(r => r.statut).length,
  }
  console.log(`Stats: ${stats.withPhone} phones, ${stats.withEmail} emails, ${stats.withSite} sites, ${stats.withStatut} statuts`)
  return results
}

// ─── Main: batch by 10 pages ───

async function main() {
  console.log(`\nIPI Scraper: pages ${START_PAGE}-${END_PAGE} (batches of ${BATCH_SIZE})\n`)

  for (let batchStart = START_PAGE; batchStart <= END_PAGE; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, END_PAGE)
    console.log(`\n${'='.repeat(60)}`)
    console.log(`BATCH: Pages ${batchStart}-${batchEnd}`)
    console.log(`${'='.repeat(60)}`)

    // Phase 1: Scrape listing
    const agents = await scrapeListingBatch(batchStart, batchEnd)

    // Filter to only agents from this batch
    const batchAgents = agents.filter(a => a.page >= batchStart && a.page <= batchEnd)
    if (batchAgents.length === 0) {
      console.log(`\nNo agents found in pages ${batchStart}-${batchEnd} — stopping.`)
      break
    }

    console.log(`\nBatch ${batchStart}-${batchEnd}: ${batchAgents.length} agents to enrich`)

    // Phase 2: Enrich
    await enrichBatch(batchAgents)

    console.log(`\nBatch ${batchStart}-${batchEnd} complete.`)
  }

  // Final stats
  if (existsSync(LISTING_FILE)) {
    const listing = JSON.parse(readFileSync(LISTING_FILE, 'utf-8'))
    console.log(`\n${'='.repeat(60)}`)
    console.log(`FINAL: ${listing.total} new agents scraped from pages ${START_PAGE}-${END_PAGE}`)
    console.log(`${'='.repeat(60)}`)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
