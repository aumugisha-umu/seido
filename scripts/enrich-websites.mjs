import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(__dirname, '../docs/sales/AGENTS_IMMOBILIERS_BRUXELLES_CONSOLIDE.md');
const OUTPUT = resolve(__dirname, '../docs/sales/_enrichment_websites.json');

// --- Parse agents from MD ---
function parseAgents() {
  const md = readFileSync(INPUT, 'utf-8');
  const lines = md.split('\n');
  const agents = [];

  for (const line of lines) {
    // Match data rows (not headers or separators)
    if (!line.startsWith('|')) continue;
    if (line.includes('|--')) continue;
    if (line.includes('| Nom |')) continue;

    // Split by | but keep empty columns (don't filter)
    // Line: | col1 | col2 | ... | colN |
    // split('|') gives ['', ' col1 ', ' col2 ', ..., ' colN ', '']
    const rawCols = line.split('|').map(c => c.trim());
    // Remove first and last empty entries from leading/trailing |
    const cols = rawCols.slice(1, -1);
    if (cols.length < 8) continue;

    const [nom, id, entreprise, adresse, tel, email, siteWeb, statut] = cols;
    if (!id || !/^\d+$/.test(id)) continue;

    agents.push({ nom, id, entreprise, adresse, tel, email, site_web: siteWeb || '', statut });
  }
  return agents;
}

// --- Normalize URL ---
function normalizeUrl(raw) {
  if (!raw || raw === '—' || raw === '-' || raw.trim() === '') return null;
  // Take first URL before comma or space
  let url = raw.split(/[,\s]/)[0].trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

// --- Service keywords ---
const SERVICE_KEYWORDS = {
  gestion_locative: ['gestion locative', 'gestion de biens', 'property management', 'locataire', 'loyer', 'bail'],
  syndic: ['syndic', 'copropriété', 'copropriete', 'assemblée générale', 'acp', 'copropriétaire'],
  vente: ['vente', 'à vendre', 'a vendre', 'achat', 'acquéreur'],
  location: ['à louer', 'a louer', 'location', 'louer'],
  commercial: ['bureau', 'commercial', 'retail', 'entrepôt', 'warehouse'],
};

const SOFTWARE_LIST = [
  'sweepbright', 'whise', 'omnicasa', 'bricks', 'hubspot',
  'salesforce', 'immomig', 'proprio', 'zimmo', 'logic-immo', 'immoweb'
];

function detectServices(html) {
  const lower = html.toLowerCase();
  const services = {};
  for (const [key, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    services[key] = keywords.some(kw => lower.includes(kw));
  }
  return services;
}

function detectSoftware(html) {
  const lower = html.toLowerCase();
  return SOFTWARE_LIST.filter(sw => lower.includes(sw));
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim().slice(0, 200) : null;
}

function extractContacts(html) {
  const emails = [...new Set(
    (html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])
      .map(e => e.toLowerCase())
  )];
  // Phone patterns: +32, 0032, 02/, 04xx
  const phones = [...new Set(
    (html.match(/(?:\+32|0032|(?<!\d)0[1-9])[\s./\-()]*\d[\s./\-()]*\d[\s./\-()]*\d[\s./\-()]*\d[\s./\-()]*\d[\s./\-()]*\d[\s./\-()]*\d?[\s./\-()]*\d?/g) || [])
      .map(p => p.replace(/\s+/g, ' ').trim())
  )];
  return { emails: emails.slice(0, 20), phones: phones.slice(0, 20) };
}

// --- Fetch with timeout ---
async function fetchSite(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeidoEnrich/1.0)' },
      redirect: 'follow',
    });
    const html = await resp.text();
    return { status: resp.status, html };
  } finally {
    clearTimeout(timer);
  }
}

// --- Process one agent ---
async function processAgent(agent) {
  const url = normalizeUrl(agent.site_web);
  if (!url) return null;

  const result = {
    id: agent.id,
    site_web: url,
    http_status: null,
    site_active: false,
    title: null,
    services: { gestion_locative: false, syndic: false, vente: false, location: false, commercial: false },
    software_detected: [],
    extra_contacts: { phones: [], emails: [] },
    team_size_estimate: null,
    error: null,
  };

  try {
    const { status, html } = await fetchSite(url);
    result.http_status = status;
    result.site_active = status >= 200 && status < 400;
    result.title = extractTitle(html);
    result.services = detectServices(html);
    result.software_detected = detectSoftware(html);
    result.extra_contacts = extractContacts(html);
  } catch (err) {
    if (err.name === 'AbortError') {
      result.error = 'timeout';
    } else {
      result.error = err.message?.slice(0, 200) || 'unknown error';
    }
  }
  return result;
}

// --- Main ---
async function main() {
  const agents = parseAgents();
  console.log(`Parsed ${agents.length} agents total`);

  const withSite = agents.filter(a => normalizeUrl(a.site_web));
  console.log(`Agents with site_web: ${withSite.length}`);

  // Load existing results for resume
  let results = {};
  if (existsSync(OUTPUT)) {
    try {
      const existing = JSON.parse(readFileSync(OUTPUT, 'utf-8'));
      for (const r of existing) results[r.id] = r;
      console.log(`Resuming: ${Object.keys(results).length} already processed`);
    } catch { /* start fresh */ }
  }

  const toProcess = withSite.filter(a => !results[a.id]);
  console.log(`To process: ${toProcess.length}`);

  const BATCH_SIZE = 5;
  const DELAY_MS = 1500;
  let processed = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(a => processAgent(a)));

    for (const r of batchResults) {
      if (r) {
        results[r.id] = r;
        processed++;
      }
    }

    // Save every 20 agents
    if (processed % 20 < BATCH_SIZE || i + BATCH_SIZE >= toProcess.length) {
      writeFileSync(OUTPUT, JSON.stringify(Object.values(results), null, 2), 'utf-8');
    }

    // Progress
    const done = Math.min(i + BATCH_SIZE, toProcess.length);
    if (done % 50 < BATCH_SIZE) {
      console.log(`  Progress: ${done}/${toProcess.length} (${Object.keys(results).length} total results)`);
    }

    // Delay between batches
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Final save
  const allResults = Object.values(results);
  writeFileSync(OUTPUT, JSON.stringify(allResults, null, 2), 'utf-8');

  // Stats
  const active = allResults.filter(r => r.site_active).length;
  const errors = allResults.filter(r => r.error).length;
  const withGestion = allResults.filter(r => r.services?.gestion_locative).length;
  const withSyndic = allResults.filter(r => r.services?.syndic).length;
  const withVente = allResults.filter(r => r.services?.vente).length;
  const withLocation = allResults.filter(r => r.services?.location).length;
  const withCommercial = allResults.filter(r => r.services?.commercial).length;
  const withSoftware = allResults.filter(r => r.software_detected?.length > 0).length;

  // Software breakdown
  const swCounts = {};
  for (const r of allResults) {
    for (const sw of (r.software_detected || [])) {
      swCounts[sw] = (swCounts[sw] || 0) + 1;
    }
  }

  console.log('\n=== FINAL STATS ===');
  console.log(`Total results: ${allResults.length}`);
  console.log(`Site active (2xx/3xx): ${active}`);
  console.log(`Errors/timeouts: ${errors}`);
  console.log(`\nServices detected:`);
  console.log(`  gestion_locative: ${withGestion}`);
  console.log(`  syndic: ${withSyndic}`);
  console.log(`  vente: ${withVente}`);
  console.log(`  location: ${withLocation}`);
  console.log(`  commercial: ${withCommercial}`);
  console.log(`\nSoftware detected (${withSoftware} sites total):`);
  for (const [sw, count] of Object.entries(swCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sw}: ${count}`);
  }
}

main().catch(console.error);
