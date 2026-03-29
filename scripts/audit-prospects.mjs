/**
 * Full audit of PROSPECTS_QUALIFIES_BRUXELLES.md and .csv
 *
 * Pass 1: Data integrity (hallucination detection, cross-references)
 * Pass 2: Encoding & format (CSV parsability, special chars, broken fields)
 * Pass 3: Scoring verification (recalculate scores, check tier assignments)
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const SALES_DIR = join(process.cwd(), 'docs/sales')

const issues = []
const warnings = []
const stats = { checks: 0, passed: 0, failed: 0, warnings: 0 }

function check(name, condition, detail) {
  stats.checks++
  if (condition) { stats.passed++; return true }
  stats.failed++
  issues.push(`FAIL: ${name} — ${detail}`)
  return false
}

function warn(name, detail) {
  stats.warnings++
  warnings.push(`WARN: ${name} — ${detail}`)
}

// ═══════════════════════════════════════════════════════════════
// PASS 1: Data Integrity
// ═══════════════════════════════════════════════════════════════
console.log('═══ PASS 1: Data Integrity ═══\n')

// Load consolidated base (source of truth)
const consolMD = readFileSync(join(SALES_DIR, 'AGENTS_IMMOBILIERS_BRUXELLES_CONSOLIDE.md'), 'utf-8')
const baseAgents = new Map()
let curPage = 0
for (const line of consolMD.split('\n')) {
  const pm = line.match(/^## Page (\d+)/)
  if (pm) { curPage = parseInt(pm[1]); continue }
  const fm = line.match(/\[Fiche\]\((https:\/\/[^)]+)\)/)
  if (!fm || !line.startsWith('|')) continue
  const raw = line.slice(1, line.lastIndexOf('|')).split('|')
  if (raw.length < 8) continue
  baseAgents.set(raw[1].trim(), {
    nom: raw[0].trim(),
    id: raw[1].trim(),
    entreprise: raw[2].trim(),
    telephone: raw[4].trim(),
    email: raw[5].trim(),
    site_web: raw[6].trim()
  })
}
console.log(`  Base agents loaded: ${baseAgents.size}`)

// Load CSV
const csv = readFileSync(join(SALES_DIR, 'PROSPECTS_QUALIFIES_BRUXELLES.csv'), 'utf-8')
const csvLines = csv.split('\n').filter(l => l.trim())
const csvHeaders = csvLines[0].split(',')
const csvRows = []

// Header-based column index lookup (resilient to column additions)
const col = {}
for (let i = 0; i < csvHeaders.length; i++) col[csvHeaders[i]] = i
const C = {
  score: col.Score ?? 0, tier: col.Tier ?? 1, company: col.Entreprise ?? 2,
  agentName: col.Agent_Nom ?? 3, agentId: col.Agent_ID ?? 4, statut: col.Agent_Statut ?? col.Statut_IPI ?? 5,
  phone: col.Agent_Telephone ?? col.Telephone_Principal ?? 6, email: col.Agent_Email ?? col.Email_Principal ?? 7,
  address: col.Agent_Adresse ?? 8, commune: col.Commune ?? 9, nbAgents: col.Nb_Agents_Societe ?? 10,
  siteWeb: col.Site_Web ?? 11, googleBiz: col.Google_Business,
  gestionLocative: col.Gestion_Locative ?? 14, syndic: col.Syndic ?? 15,
  vente: col.Vente ?? 16, location: col.Location ?? 17, commercial: col.Commercial ?? 18,
  googleNote: col.Google_Note, googleAvis: col.Google_Nb_Avis,
  scoreStatut: col.Score_Statut, scoreTaille: col.Score_Taille,
  scorePain: col.Score_PainPoints, scoreDigital: col.Score_Digital, scoreContact: col.Score_Contact,
  spinAngle: col.Angle_SPIN, ficheIPI: col.Fiche_IPI,
}
console.log(`  CSV headers: ${csvHeaders.length} columns (format: 1 row per agent)`)

// Simple CSV parser (handles quoted fields)
function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"' && (i === 0 || line[i-1] === ',') && !inQuotes) {
      inQuotes = true
    } else if (c === '"' && inQuotes) {
      if (i + 1 < line.length && line[i+1] === '"') {
        current += '"'; i++
      } else {
        inQuotes = false
      }
    } else if (c === ',' && !inQuotes) {
      fields.push(current); current = ''
    } else {
      current += c
    }
  }
  fields.push(current)
  return fields
}

for (let i = 1; i < csvLines.length; i++) {
  csvRows.push(parseCSVLine(csvLines[i]))
}
console.log(`  CSV rows loaded: ${csvRows.length}`)

// Load MD
const prospectMD = readFileSync(join(SALES_DIR, 'PROSPECTS_QUALIFIES_BRUXELLES.md'), 'utf-8')

// 1.1 Check all CSV company names exist as real IPI entreprises
console.log('\n  1.1 Checking company names against IPI base...')
const ipiCompanies = new Set()
for (const [, a] of baseAgents) {
  if (a.entreprise && a.entreprise !== '—') ipiCompanies.add(a.entreprise.toLowerCase().trim())
}
const companiesNotInIPI = []
for (const row of csvRows) {
  const company = row[C.company]
  if (!company) continue
  const normalized = company.toLowerCase().trim()
  // Check if company or a close variant exists in IPI (handle decoded entities like & vs &amp;)
  let found = ipiCompanies.has(normalized)
  if (!found) {
    // Try with HTML entities decoded/encoded and quote variants
    const decoded = normalized.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    const encoded = normalized.replace(/&/g, '&amp;').replace(/'/g, '&#039;').replace(/"/g, '&quot;')
    const noQuotes = normalized.replace(/["']/g, '').replace(/\s+/g, ' ').trim()
    found = ipiCompanies.has(decoded) || ipiCompanies.has(encoded)
    if (!found) {
      for (const ipi of ipiCompanies) {
        const ipiNoQuotes = ipi.replace(/["'&;#0-9]/g, '').replace(/\s+/g, ' ').trim()
        if (ipiNoQuotes === noQuotes || ipi.replace(/&quot;/g, '"') === normalized) { found = true; break }
      }
    }
  }
  if (!found) {
    // Try partial match
    for (const ipi of ipiCompanies) {
      const decodedIpi = ipi.replace(/&amp;/g, '&').replace(/&#039;/g, "'")
      if (decodedIpi.includes(normalized) || normalized.includes(decodedIpi) || ipi.includes(normalized) || normalized.includes(ipi)) { found = true; break }
    }
  }
  if (!found) companiesNotInIPI.push(company)
}
check('Companies match IPI base', companiesNotInIPI.length === 0,
  `${companiesNotInIPI.length} companies not found in IPI: ${companiesNotInIPI.slice(0, 10).join(', ')}`)
if (companiesNotInIPI.length > 0 && companiesNotInIPI.length <= 20) {
  warn('Unmatched companies (may be solo agents)', companiesNotInIPI.join(', '))
}

// 1.2 Check agent IDs referenced in CSV exist in base
console.log('  1.2 Checking agent IDs against IPI base...')
let missingIds = 0
let checkedIds = 0
for (const row of csvRows) {
  const agentId = row[C.agentId]
  if (agentId && /^\d+$/.test(agentId)) {
    checkedIds++
    if (!baseAgents.has(agentId)) missingIds++
  }
}
check('Agent IDs exist in IPI base', missingIds === 0,
  `${missingIds}/${checkedIds} agent IDs not found in consolidated base`)
console.log(`    Checked ${checkedIds} agent IDs`)

// 1.3 Check for hallucination patterns
console.log('  1.3 Checking for hallucination patterns...')
const suspiciousCompanies = []
// Only flag truly suspicious AI-generated names (generic combinations)
// Belgian real estate companies legitimately use "Real Estate", "Properties" etc.
const hallPatterns = [
  /^(Vertex|Summit|Pinnacle|Apex|Prime|Elite|Universal) (Properties|Realty|Estates)$/
]
const seenForHall = new Set()
for (const row of csvRows) {
  const company = row[C.company]
  if (seenForHall.has(company)) continue
  seenForHall.add(company)
  for (const pat of hallPatterns) {
    if (pat.test(company)) suspiciousCompanies.push(company)
  }
}
check('No hallucination pattern companies', suspiciousCompanies.length === 0,
  `Found ${suspiciousCompanies.length} suspicious: ${suspiciousCompanies.join(', ')}`)

// 1.4 Check agent count consistency
console.log('  1.4 Checking agent counts...')
const totalAgentsCSV = csvRows.length // 1 row per agent
// Allow up to ~15% difference since solo agents (no company) are excluded from prospects
check('Total agents matches IPI base', totalAgentsCSV >= baseAgents.size * 0.85,
  `CSV total agents: ${totalAgentsCSV}, IPI base: ${baseAgents.size} (diff: ${Math.abs(totalAgentsCSV - baseAgents.size)}, ${(totalAgentsCSV/baseAgents.size*100).toFixed(1)}%)`)

// 1.5 Check no duplicate agent IDs (same agent should not appear twice)
console.log('  1.5 Checking for duplicate agent IDs...')
const seenAgentIds = new Map()
const duplicateAgents = []
for (const row of csvRows) {
  const id = row[C.agentId]
  if (!id) continue
  if (seenAgentIds.has(id)) {
    duplicateAgents.push(id)
  }
  seenAgentIds.set(id, (seenAgentIds.get(id) || 0) + 1)
}
check('No duplicate agent IDs in CSV', duplicateAgents.length === 0,
  `${duplicateAgents.length} duplicate agent IDs: ${duplicateAgents.slice(0, 10).join(', ')}`)

// ═══════════════════════════════════════════════════════════════
// PASS 2: Encoding & Format
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ PASS 2: Encoding & Format ═══\n')

// 2.1 CSV column count consistency
console.log('  2.1 Checking CSV column consistency...')
const expectedCols = csvHeaders.length
let badColCount = 0
const badColRows = []
for (let i = 0; i < csvRows.length; i++) {
  if (csvRows[i].length !== expectedCols) {
    badColCount++
    if (badColRows.length < 5) badColRows.push({ row: i + 2, got: csvRows[i].length, company: csvRows[i][2] })
  }
}
check('CSV column count consistent', badColCount === 0,
  `${badColCount} rows with wrong column count (expected ${expectedCols}): ${JSON.stringify(badColRows)}`)

// 2.2 Check for HTML entities in output
console.log('  2.2 Checking for unescaped HTML entities...')
const htmlEntityPattern = /&(amp|lt|gt|quot|#039|#x27);/
let htmlEntitiesInCSV = 0
let htmlEntityExamples = []
for (const row of csvRows) {
  for (const field of row) {
    if (htmlEntityPattern.test(field)) {
      htmlEntitiesInCSV++
      if (htmlEntityExamples.length < 5) htmlEntityExamples.push(field.slice(0, 80))
    }
  }
}
if (htmlEntitiesInCSV > 0) {
  warn('HTML entities in CSV', `${htmlEntitiesInCSV} fields contain HTML entities: ${htmlEntityExamples.join(' | ')}`)
}

let htmlEntitiesInMD = 0
const mdEntityMatches = prospectMD.match(/&(amp|lt|gt|quot|#039|#x27);/g)
if (mdEntityMatches) htmlEntitiesInMD = mdEntityMatches.length
if (htmlEntitiesInMD > 0) {
  warn('HTML entities in MD', `${htmlEntitiesInMD} occurrences of HTML entities in MD`)
}

// 2.3 Check for broken UTF-8 / mojibake
console.log('  2.3 Checking for encoding issues...')
const mojibakePattern = /Ã©|Ã¨|Ã |Ã§|Ã´|Ã®|Ã¹|Ã¼|â€™|â€"|Ã‰/
let mojibakeCount = 0
for (const row of csvRows) {
  for (const field of row) {
    if (mojibakePattern.test(field)) mojibakeCount++
  }
}
check('No UTF-8 mojibake', mojibakeCount === 0, `${mojibakeCount} fields with encoding issues`)

// Check MD too
const mdMojibake = prospectMD.match(mojibakePattern)
check('No UTF-8 mojibake in MD', !mdMojibake, 'Mojibake detected in MD')

// 2.4 Check phone number formats
console.log('  2.4 Checking phone number formats...')
let validPhones = 0, invalidPhones = 0
const invalidPhoneExamples = []
for (const row of csvRows) {
  const phone = row[C.phone]
  if (!phone) continue
  // Belgian phone: +32 with digits and spaces/dots/dashes/parens
  if (/^\+32[\s\d().\-]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10) {
    validPhones++
  } else {
    invalidPhones++
    if (invalidPhoneExamples.length < 5) invalidPhoneExamples.push(`${row[C.company]}: ${phone}`)
  }
}
check('Phone format valid', invalidPhones === 0,
  `${invalidPhones} invalid phones: ${invalidPhoneExamples.join(' | ')}`)
console.log(`    Valid: ${validPhones}, Invalid: ${invalidPhones}`)

// 2.5 Check email formats
console.log('  2.5 Checking email formats...')
let validEmails = 0, invalidEmails = 0
const invalidEmailExamples = []
for (const row of csvRows) {
  const email = row[C.email]
  if (!email) continue
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    validEmails++
  } else {
    invalidEmails++
    if (invalidEmailExamples.length < 5) invalidEmailExamples.push(`${row[C.company]}: ${email}`)
  }
}
check('Email format valid', invalidEmails === 0,
  `${invalidEmails} invalid emails: ${invalidEmailExamples.join(' | ')}`)
console.log(`    Valid: ${validEmails}, Invalid: ${invalidEmails}`)

// 2.6 Check URL formats
console.log('  2.6 Checking URL formats...')
let validUrls = 0, invalidUrls = 0
const invalidUrlExamples = []
for (const row of csvRows) {
  const url = row[C.siteWeb]
  if (!url) continue
  if (/^https?:\/\/.+\..+/.test(url)) {
    validUrls++
  } else {
    invalidUrls++
    if (invalidUrlExamples.length < 5) invalidUrlExamples.push(`${row[C.company]}: ${url}`)
  }
}
check('URL format valid', invalidUrls === 0,
  `${invalidUrls} invalid URLs: ${invalidUrlExamples.join(' | ')}`)

// 2.7 Check boolean columns
console.log('  2.7 Checking boolean columns...')
let badBooleans = 0
const boolCols = [C.gestionLocative, C.syndic, C.vente, C.location, C.commercial].filter(x => x !== undefined)
for (const row of csvRows) {
  for (const ci of boolCols) {
    if (row[ci] !== 'Oui' && row[ci] !== 'Non') badBooleans++
  }
}
check('Boolean columns valid', badBooleans === 0, `${badBooleans} non-Oui/Non values in boolean columns`)

// ═══════════════════════════════════════════════════════════════
// PASS 3: Scoring Verification
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ PASS 3: Scoring Verification ═══\n')

// 3.1 Check score ranges
console.log('  3.1 Checking score ranges...')
let outOfRange = 0
for (const row of csvRows) {
  const score = parseInt(row[C.score])
  if (score < 0 || score > 100 || isNaN(score)) outOfRange++
}
check('Scores in 0-100 range', outOfRange === 0, `${outOfRange} scores out of range`)

// 3.2 Check tier assignments match scores
console.log('  3.2 Checking tier assignments...')
let wrongTier = 0
const wrongTierExamples = []
for (const row of csvRows) {
  const score = parseInt(row[C.score])
  const tier = row[C.tier]
  const expected = score >= 70 ? 'A' : score >= 45 ? 'B' : score >= 25 ? 'C' : 'D'
  if (tier !== expected) {
    wrongTier++
    if (wrongTierExamples.length < 5) wrongTierExamples.push(`${row[C.company]}: score=${score}, tier=${tier}, expected=${expected}`)
  }
}
check('Tier assignments correct', wrongTier === 0,
  `${wrongTier} wrong tiers: ${wrongTierExamples.join(' | ')}`)

// 3.3 Check score breakdown sums
console.log('  3.3 Checking score breakdown sums...')
let wrongSum = 0
const wrongSumExamples = []
for (const row of csvRows) {
  const total = parseInt(row[C.score])
  const parts = [C.scoreStatut, C.scoreTaille, C.scorePain, C.scoreDigital, C.scoreContact].map(i => parseInt(row[i]) || 0)
  const sum = parts.reduce((a, b) => a + b, 0)
  if (sum !== total) {
    wrongSum++
    if (wrongSumExamples.length < 5) wrongSumExamples.push(`${row[C.company]}: total=${total}, sum=${sum} (${parts.join('+')})`)
  }
}
check('Score breakdowns sum correctly', wrongSum === 0,
  `${wrongSum} wrong sums: ${wrongSumExamples.join(' | ')}`)

// 3.4 Check sub-scores don't exceed maximums
console.log('  3.4 Checking sub-score maximums...')
const maxScores = { [C.scoreStatut]: 30, [C.scoreTaille]: 25, [C.scorePain]: 15, [C.scoreDigital]: 15, [C.scoreContact]: 15 }
const maxLabels = { [C.scoreStatut]: 'Statut', [C.scoreTaille]: 'Taille', [C.scorePain]: 'PainPoints', [C.scoreDigital]: 'Digital', [C.scoreContact]: 'Contact' }
let overMax = 0
for (const row of csvRows) {
  for (const [col, max] of Object.entries(maxScores)) {
    const val = parseInt(row[col]) || 0
    if (val > max) {
      overMax++
      if (overMax <= 3) warn('Sub-score exceeds max', `${row[C.company]}: ${maxLabels[col]}=${val} > max ${max}`)
    }
  }
}
check('Sub-scores within maximums', overMax === 0, `${overMax} sub-scores exceed their maximum`)

// 3.5 Check sort order (scores should be descending)
console.log('  3.5 Checking sort order...')
let outOfOrder = 0
for (let i = 1; i < csvRows.length; i++) {
  if (parseInt(csvRows[i][C.score]) > parseInt(csvRows[i-1][C.score])) outOfOrder++
}
check('CSV sorted by score descending', outOfOrder === 0, `${outOfOrder} rows out of order`)

// 3.6 Verify statut scoring logic on sample
console.log('  3.6 Verifying statut scoring on sample...')
let statutMismatches = 0
for (const row of csvRows.slice(0, 50)) {
  const statut = row[C.statut]
  const statutScore = parseInt(row[C.scoreStatut])
  let expected
  if (statut.includes('Syndic') && statut.includes('Courtier') && statut.includes('titulaire')) expected = 30
  else if (statut.includes('Syndic') && statut.includes('titulaire')) expected = 25
  else if (statut.includes('Courtier') && statut.includes('titulaire')) expected = 15
  else if (statut.includes('stagiaire')) expected = 5
  else expected = null // can't determine

  if (expected !== null && statutScore !== expected) {
    statutMismatches++
    if (statutMismatches <= 3) warn('Statut score mismatch', `${row[C.company]}: statut="${statut}", score=${statutScore}, expected=${expected}`)
  }
}
if (statutMismatches === 0) console.log('    Statut scoring verified on top 50')

// ═══════════════════════════════════════════════════════════════
// PASS 4: MD ↔ CSV Consistency
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ PASS 4: MD ↔ CSV Consistency ═══\n')

// 4.1 Count companies in MD vs CSV
// Count unique companies in CSV (1-row-per-agent format)
const uniqueCompaniesCSV = new Set(csvRows.map(r => r[C.company].toLowerCase().trim()))
// Count companies by looking for "### CompanyName" followed by "**Score :" pattern
const mdCompanyPattern = /^### .+\n\*\*Score/gm
const mdCompanies = prospectMD.match(mdCompanyPattern) || []
console.log(`  4.1 Company count: MD=${mdCompanies.length}, CSV=${uniqueCompaniesCSV.size} (${csvRows.length} agent rows)`)
check('Company count matches', mdCompanies.length === uniqueCompaniesCSV.size,
  `MD has ${mdCompanies.length} companies, CSV has ${uniqueCompaniesCSV.size}`)

// 4.2 Verify tier counts in MD match actual
const tierAHeader = prospectMD.match(/Tier A.*?(\d+) entreprises/)
const tierBHeader = prospectMD.match(/Tier B.*?(\d+) entreprises/)
const tierCHeader = prospectMD.match(/Tier C.*?(\d+) entreprises/)
const tierDHeader = prospectMD.match(/Tier D.*?(\d+) entreprises/)

// Count unique companies per tier (not agent rows)
const csvTierCounts = { A: 0, B: 0, C: 0, D: 0 }
const seenCompanyTier = new Set()
for (const row of csvRows) {
  const key = row[C.company].toLowerCase().trim() + '|' + row[C.tier]
  if (seenCompanyTier.has(key)) continue
  seenCompanyTier.add(key)
  csvTierCounts[row[C.tier]]++
}

if (tierAHeader) check('Tier A count matches', parseInt(tierAHeader[1]) === csvTierCounts.A,
  `MD says ${tierAHeader[1]}, CSV has ${csvTierCounts.A}`)
if (tierBHeader) check('Tier B count matches', parseInt(tierBHeader[1]) === csvTierCounts.B,
  `MD says ${tierBHeader[1]}, CSV has ${csvTierCounts.B}`)

// 4.3 Check top 10 in MD matches CSV order
console.log('  4.3 Checking top 10 order...')
// Get first 10 unique companies from CSV
const top10CSVSet = []
const seenTop10 = new Set()
for (const r of csvRows) {
  const name = r[C.company].toLowerCase().trim()
  if (seenTop10.has(name)) continue
  seenTop10.add(name)
  top10CSVSet.push(name)
  if (top10CSVSet.length >= 10) break
}
const top10CSV = top10CSVSet
const top10Table = prospectMD.match(/\| \d+ \| \d+ \| (.+?) \|/g)
if (top10Table) {
  const top10MD = top10Table.map(m => m.match(/\| \d+ \| \d+ \| (.+?) \|/)[1].toLowerCase().trim())
  let orderMatch = true
  for (let i = 0; i < Math.min(10, top10MD.length); i++) {
    if (top10MD[i] !== top10CSV[i]) {
      orderMatch = false
      warn('Top 10 order mismatch', `Position ${i+1}: MD="${top10MD[i]}", CSV="${top10CSV[i]}"`)
    }
  }
  if (orderMatch) console.log('    Top 10 order verified')
}

// ═══════════════════════════════════════════════════════════════
// PASS 5: Content Quality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ PASS 5: Content Quality ═══\n')

// 5.1 Check for empty critical fields in Tier A
console.log('  5.1 Checking Tier A completeness...')
// Check Tier A completeness (per unique company, not per agent row)
let tierANoPhone = 0, tierANoEmail = 0, tierANoSite = 0
const tierACompanies = new Map()
for (const row of csvRows) {
  if (row[C.tier] !== 'A') continue
  const name = row[C.company].toLowerCase().trim()
  if (!tierACompanies.has(name)) tierACompanies.set(name, { hasPhone: false, hasEmail: false, hasSite: false })
  const c = tierACompanies.get(name)
  if (row[C.phone]) c.hasPhone = true
  if (row[C.email]) c.hasEmail = true
  if (row[C.siteWeb]) c.hasSite = true
}
for (const [, c] of tierACompanies) {
  if (!c.hasPhone) tierANoPhone++
  if (!c.hasEmail) tierANoEmail++
  if (!c.hasSite) tierANoSite++
}
console.log(`    Tier A: ${csvTierCounts.A} companies`)
console.log(`    Without phone: ${tierANoPhone}`)
console.log(`    Without email: ${tierANoEmail}`)
console.log(`    Without site: ${tierANoSite}`)
if (tierANoPhone > csvTierCounts.A * 0.1) warn('Tier A phone coverage low', `${tierANoPhone}/${csvTierCounts.A} without phone`)

// 5.2 Check SPIN angles exist for all Tier A (check unique companies)
let tierANoSpin = 0
const seenSpinCheck = new Set()
for (const row of csvRows) {
  const name = row[C.company].toLowerCase().trim()
  if (row[C.tier] === 'A' && !seenSpinCheck.has(name)) {
    seenSpinCheck.add(name)
    if (!row[C.spinAngle] || row[C.spinAngle].length < 10) tierANoSpin++
  }
}
check('All Tier A have SPIN angles', tierANoSpin === 0, `${tierANoSpin} Tier A without SPIN angle`)

// 5.3 Check for suspiciously high scores (unique companies)
const perfectCompanies = new Set()
for (const r of csvRows) { if (parseInt(r[C.score]) === 100) perfectCompanies.add(r[C.company]) }
if (perfectCompanies.size > 5) warn('Many perfect scores', `${perfectCompanies.size} companies with score 100`)
console.log(`  5.3 Perfect scores (100): ${perfectCompanies.size}`)

// 5.4 Check for Google data in SPIN angles mentioning pain points that don't exist
console.log('  5.4 Checking SPIN angle consistency...')
let spinMismatch = 0
const seenSpinConsistency = new Set()
const painCol = col.Pain_Points
for (const row of csvRows) {
  const name = row[C.company].toLowerCase().trim()
  if (seenSpinConsistency.has(name)) continue
  seenSpinConsistency.add(name)
  const spin = row[C.spinAngle] || ''
  const painPoints = painCol !== undefined ? (row[painCol] || '') : ''
  if (spin.includes('mentionnent') && !painPoints) {
    spinMismatch++
    if (spinMismatch <= 3) warn('SPIN references pain points but none exist', `${row[C.company]}: "${spin.slice(0, 60)}..."`)
  }
}

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(70))
console.log('AUDIT REPORT')
console.log('═'.repeat(70))
console.log(`\nChecks: ${stats.checks}`)
console.log(`Passed: ${stats.passed} ✓`)
console.log(`Failed: ${stats.failed} ✗`)
console.log(`Warnings: ${stats.warnings} ⚠`)

if (issues.length > 0) {
  console.log(`\n--- ISSUES (${issues.length}) ---`)
  for (const i of issues) console.log(`  ${i}`)
}

if (warnings.length > 0) {
  console.log(`\n--- WARNINGS (${warnings.length}) ---`)
  for (const w of warnings) console.log(`  ${w}`)
}

const grade = stats.failed === 0 ? 'A' : stats.failed <= 2 ? 'B' : stats.failed <= 5 ? 'C' : 'D'
console.log(`\nGRADE: ${grade}`)
console.log(`\nSummary: ${stats.passed}/${stats.checks} checks passed, ${warnings.length} warnings`)
