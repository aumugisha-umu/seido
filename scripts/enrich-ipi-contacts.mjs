/**
 * Enrich agent contacts from individual IPI profile pages
 *
 * Each IPI page (e.g. https://www.ipi.be/agent-immobilier/john-doe-123456)
 * contains phone numbers and email addresses not available in the listing.
 *
 * Usage:
 *   node scripts/enrich-ipi-contacts.mjs [--limit N] [--resume]
 *
 * Output: docs/Sales/_enrichment_ipi_contacts.json
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORED_FILE = resolve(__dirname, "../docs/Sales/_prospects_scored.json");
const OUTPUT_FILE = resolve(__dirname, "../docs/Sales/_enrichment_ipi_contacts.json");
const CSV_FILE = resolve(__dirname, "../docs/Sales/PROSPECTS_QUALIFIES_BRUXELLES.csv");

// --- Config ---
const BATCH_SIZE = 5; // concurrent requests
const DELAY_MS = 1500; // between batches
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0");
const RESUME = process.argv.includes("--resume");

// --- Parse CSV to get all agent IPI URLs ---
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else current += ch;
  }
  result.push(current);
  return result;
}

function loadAgentsFromCsv() {
  const content = readFileSync(CSV_FILE, "utf8");
  const lines = content.trim().split("\n");
  const header = parseCsvLine(lines[0]);
  const idx = {};
  header.forEach((h, i) => (idx[h] = i));

  const agents = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const url = row[idx.Fiche_IPI] || "";
    if (!url.includes("ipi.be")) continue;
    agents.push({
      id: row[idx.Agent_ID] || "",
      nom: row[idx.Agent_Nom] || "",
      entreprise: row[idx.Entreprise] || "",
      existingTel: row[idx.Agent_Telephone] || "",
      existingEmail: row[idx.Agent_Email] || "",
      url: url.trim(),
    });
  }
  return agents;
}

// --- Extract contacts from IPI HTML ---
// Uses structured href="tel:" and href="mailto:" links (reliable, no noise)
function extractFromIPI(html) {
  const result = { phones: [], emails: [], website: null, adresse: null };

  // Extract phone from <a href="tel:..."> links
  const telMatches = html.matchAll(/href="tel:([^"]+)"/g);
  const phones = new Set();
  for (const m of telMatches) {
    const phone = m[1].trim();
    // Filter out IPI's own numbers (short/internal)
    if (phone.length >= 8) phones.add(phone);
  }
  result.phones = [...phones];

  // Extract email from <a href="mailto:..."> links
  const mailMatches = html.matchAll(/href="mailto:([^"]+)"/g);
  const emails = new Set();
  for (const m of mailMatches) {
    const email = m[1].trim().toLowerCase();
    // Filter out IPI's own emails
    if (!email.includes("ipi.be") && !email.includes("example.")) {
      emails.add(email);
    }
  }
  result.emails = [...emails];

  // Extract website from the Contact section (first external link after "Contact" heading)
  const contactSection = html.match(/<h3[^>]*>Contact<\/h3>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
  if (contactSection) {
    const siteMatch = contactSection[1].match(/href="(https?:\/\/[^"]+)"[^>]*target="_blank"/);
    if (siteMatch && !siteMatch[1].includes("ipi.be")) {
      result.website = siteMatch[1];
    }
  }

  return result;
}

// --- Fetch with timeout ---
async function fetchPage(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-BE,fr;q=0.9",
      },
      redirect: "follow",
    });
    if (resp.status !== 200) {
      return { status: resp.status, html: "" };
    }
    const html = await resp.text();
    return { status: resp.status, html };
  } finally {
    clearTimeout(timer);
  }
}

// --- Process one agent ---
async function processAgent(agent) {
  const entry = {
    id: agent.id,
    nom: agent.nom,
    entreprise: agent.entreprise,
    url: agent.url,
    phones: [],
    emails: [],
    adresse: null,
    error: null,
    had_existing_tel: !!agent.existingTel,
    had_existing_email: !!agent.existingEmail,
  };

  try {
    const { status, html } = await fetchPage(agent.url);
    if (status !== 200) {
      entry.error = `HTTP ${status}`;
      return entry;
    }
    const extracted = extractFromIPI(html);
    entry.phones = extracted.phones;
    entry.emails = extracted.emails;
    entry.adresse = extracted.adresse;
  } catch (err) {
    entry.error = err.name === "AbortError" ? "timeout" : err.message;
  }

  return entry;
}

// --- Main ---
async function main() {
  console.log("=== IPI Contact Enrichment ===\n");

  const allAgents = loadAgentsFromCsv();
  console.log(`Loaded ${allAgents.length} agents from CSV`);

  // Resume: load existing results
  let results = [];
  const processedIds = new Set();
  if (RESUME && existsSync(OUTPUT_FILE)) {
    results = JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
    for (const r of results) processedIds.add(r.id);
    console.log(`Resuming: ${results.length} already processed`);
  }

  // Filter to unprocessed agents
  let agents = allAgents.filter((a) => !processedIds.has(a.id));
  if (LIMIT > 0) agents = agents.slice(0, LIMIT);
  console.log(`Processing: ${agents.length} agents\n`);

  let processed = 0;
  let newPhones = 0;
  let newEmails = 0;

  for (let i = 0; i < agents.length; i += BATCH_SIZE) {
    const batch = agents.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processAgent));

    for (const r of batchResults) {
      results.push(r);
      processed++;
      if (r.phones.length > 0 && !r.had_existing_tel) newPhones++;
      if (r.emails.length > 0 && !r.had_existing_email) newEmails++;

      const phoneStr = r.phones.length ? `${r.phones.length} tel` : "-";
      const emailStr = r.emails.length ? `${r.emails.length} email` : "-";
      const status = r.error ? `ERR: ${r.error}` : `${phoneStr}, ${emailStr}`;
      console.log(`  [${processed}/${agents.length}] ${r.nom} — ${status}`);
    }

    // Save intermediate results every 50
    if (processed % 50 < BATCH_SIZE) {
      writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    }

    // Rate limit delay
    if (i + BATCH_SIZE < agents.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Final save
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  // Stats
  const totalWithPhone = results.filter((r) => r.phones.length > 0).length;
  const totalWithEmail = results.filter((r) => r.emails.length > 0).length;
  console.log(`\n=== Results ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Total results: ${results.length}`);
  console.log(`With phone: ${totalWithPhone} (${(totalWithPhone / results.length * 100).toFixed(1)}%)`);
  console.log(`With email: ${totalWithEmail} (${(totalWithEmail / results.length * 100).toFixed(1)}%)`);
  console.log(`NEW phones found: ${newPhones}`);
  console.log(`NEW emails found: ${newEmails}`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main().catch(console.error);
