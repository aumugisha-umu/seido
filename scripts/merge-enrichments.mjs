/**
 * Merge all enrichment sources into final enriched CSVs
 *
 * Inputs:
 *   - docs/Sales/PROSPECTS_QUALIFIES_BRUXELLES.csv  (1749 agents, master)
 *   - docs/Sales/_enrichment_ipi_contacts.json       (per-agent phones/emails from IPI pages)
 *   - docs/Sales/_enrichment_websites.json            (per-company phones/emails from websites)
 *   - docs/Sales/_prospects_scored.json               (per-company aggregated data)
 *
 * Outputs:
 *   - docs/Sales/PROSPECTS_ENRICHIS_BRUXELLES.csv     (1 line per agent, enriched)
 *   - docs/Sales/SOCIETES_IMMOBILIERES_BRUXELLES.csv  (1 line per société, aggregated)
 *
 * New columns added:
 *   Agent-level:  Tel_Agent_IPI, Email_Agent_IPI
 *   Company-level: Tel_Societe, Email_Societe, Tel_Societe_All, Email_Societe_All
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_FILE = resolve(__dirname, "../docs/Sales/PROSPECTS_QUALIFIES_BRUXELLES.csv");
const IPI_FILE = resolve(__dirname, "../docs/Sales/_enrichment_ipi_contacts.json");
const WEBSITES_FILE = resolve(__dirname, "../docs/Sales/_enrichment_websites.json");
const SCORED_FILE = resolve(__dirname, "../docs/Sales/_prospects_scored.json");
const OUT_AGENTS = resolve(__dirname, "../docs/Sales/PROSPECTS_ENRICHIS_BRUXELLES.csv");
const OUT_SOCIETES = resolve(__dirname, "../docs/Sales/SOCIETES_IMMOBILIERES_BRUXELLES.csv");

// --- CSV helpers ---
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

function escapeCsv(val) {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsvLine(fields) {
  return fields.map(escapeCsv).join(",");
}

// --- Normalize Belgian phone to +32 international format ---
// Belgian structure: +32 + 8 digits (landline) or +32 + 9 digits (mobile 04XX)
function normalizePhone(phone) {
  // Strip all non-digit except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Handle various prefixes → get to "32XXXXXXXX" form
  if (cleaned.startsWith("+32")) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("0032")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length >= 9 && cleaned.length <= 10) {
    // Local Belgian format: 02 XXX XX XX (9 digits) or 04XX XX XX XX (10 digits)
    cleaned = "32" + cleaned.slice(1);
  } else {
    return null;
  }

  const afterPrefix = cleaned.slice(2); // digits after "32"

  // Landline: 8 digits, first digit 2-9
  if (afterPrefix.length === 8 && /^[2-9]/.test(afterPrefix)) {
    // Valid landline
  }
  // Mobile: 9 digits, starts with 4 (045X-049X)
  else if (afterPrefix.length === 9 && /^4[5-9]/.test(afterPrefix)) {
    // Valid mobile
  }
  // Special: 0800/0900/070 → 800/900/70 + rest
  else if (afterPrefix.length === 9 && /^(800|900|70)/.test(afterPrefix)) {
    // Valid special number
  }
  else {
    return null; // Invalid length or prefix combination
  }

  // Filter repeated digits (garbage like 32222222222)
  if (/^(\d)\1{6,}$/.test(afterPrefix)) return null;

  return "+" + cleaned;
}

// --- Format phone for display in CSV (prevents Excel number conversion) ---
function formatPhoneForCsv(phone) {
  if (!phone) return "";
  // Ensure it starts with + so Excel treats as text
  return phone.startsWith("+") ? phone : "+" + phone;
}

// --- Load data ---
console.log("=== Merge Enrichments ===\n");

// 1. CSV
const csvContent = readFileSync(CSV_FILE, "utf8");
const csvLines = csvContent.trim().split("\n");
const header = parseCsvLine(csvLines[0]);
const idx = {};
header.forEach((h, i) => (idx[h] = i));

const agents = [];
for (let i = 1; i < csvLines.length; i++) {
  agents.push(parseCsvLine(csvLines[i]));
}
console.log(`CSV: ${agents.length} agents, ${header.length} columns`);

// 2. IPI enrichment (keyed by agent ID)
const ipiData = JSON.parse(readFileSync(IPI_FILE, "utf8"));
const ipiByAgent = new Map();
for (const r of ipiData) {
  if (r.id) ipiByAgent.set(r.id, r);
}
console.log(`IPI: ${ipiData.length} entries, ${ipiByAgent.size} unique agents`);

// 3. Website enrichment (keyed by id = BCE number or site URL)
const websiteData = JSON.parse(readFileSync(WEBSITES_FILE, "utf8"));
const websiteBySite = new Map();
for (const r of websiteData) {
  if (r.site_web) websiteBySite.set(r.site_web, r);
}
console.log(`Websites: ${websiteData.length} entries`);

// 4. Scored prospects (keyed by normalizedName)
const scored = JSON.parse(readFileSync(SCORED_FILE, "utf8"));
const scoredByName = new Map();
for (const co of scored) {
  if (co.normalizedName) scoredByName.set(co.normalizedName, co);
}
console.log(`Scored: ${scored.length} companies\n`);

// --- Build enriched agent rows ---
const newHeader = [
  ...header,
  "Tel_Agent_IPI",
  "Email_Agent_IPI",
  "Tel_Societe",
  "Email_Societe",
  "Tel_Societe_All",
  "Email_Societe_All",
];

let ipiPhoneHits = 0;
let ipiEmailHits = 0;
let sitePhoneHits = 0;
let siteEmailHits = 0;

const enrichedRows = agents.map((row) => {
  const agentId = row[idx.Agent_ID] || "";
  const siteWeb = row[idx.Site_Web] || "";
  const entreprise = row[idx.Entreprise] || "";

  // IPI enrichment — normalize phones
  const ipi = ipiByAgent.get(agentId);
  const ipiPhoneRaw = ipi?.phones?.[0] || "";
  const ipiPhone = (ipiPhoneRaw ? normalizePhone(ipiPhoneRaw) : null) || "";
  const ipiEmail = ipi?.emails?.[0] || "";
  if (ipiPhone) ipiPhoneHits++;
  if (ipiEmail) ipiEmailHits++;

  // Website enrichment (société-level) — normalize and filter invalid phones
  const web = websiteBySite.get(siteWeb);
  const webPhones = web?.extra_contacts?.phones || [];
  const webEmails = web?.extra_contacts?.emails || [];

  // Normalize, filter nulls (invalid), deduplicate
  const normalizedPhones = webPhones.map(normalizePhone).filter(Boolean);
  const uniquePhones = [...new Set(normalizedPhones)];
  const uniqueEmails = [...new Set(webEmails.map((e) => e.toLowerCase()))];

  const telSociete = formatPhoneForCsv(uniquePhones[0] || "");
  const emailSociete = uniqueEmails[0] || "";
  const telSocieteAll = uniquePhones.map(formatPhoneForCsv).join(" | ");
  const emailSocieteAll = uniqueEmails.join(" | ");

  if (telSociete) sitePhoneHits++;
  if (emailSociete) siteEmailHits++;

  return [...row, formatPhoneForCsv(ipiPhone), ipiEmail, telSociete, emailSociete, telSocieteAll, emailSocieteAll];
});

// --- Write enriched agents CSV ---
const agentsCsv = [toCsvLine(newHeader), ...enrichedRows.map(toCsvLine)].join("\n");
writeFileSync(OUT_AGENTS, agentsCsv, "utf8");
console.log(`Wrote ${OUT_AGENTS}`);
console.log(`  IPI phones added: ${ipiPhoneHits}, emails: ${ipiEmailHits}`);
console.log(`  Website phones added: ${sitePhoneHits}, emails: ${siteEmailHits}\n`);

// --- Build société-level CSV ---
function normalizeName(name) {
  return name
    .toUpperCase()
    .replace(/&/g, "ET")
    .replace(/\b(SRL|SPRL|SA|SCRL|SC|SCS|ASBL|BV|NV|BVBA|CVBA|VOF)\b/gi, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Group agents by normalized company name
const companyGroups = new Map();
for (const row of enrichedRows) {
  const entreprise = row[idx.Entreprise] || "INCONNU";
  const key = normalizeName(entreprise);
  if (!companyGroups.has(key)) companyGroups.set(key, []);
  companyGroups.get(key).push(row);
}

const societeHeader = [
  "Entreprise",
  "Entreprise_Normalisee",
  "Score_Max",
  "Tier",
  "Commune",
  "Nb_Agents",
  "Agents",
  "Tel_Societe",
  "Email_Societe",
  "Tel_Societe_All",
  "Email_Societe_All",
  "Tel_Agents_IPI",
  "Email_Agents_IPI",
  "Tel_Agents_Existants",
  "Email_Agents_Existants",
  "Site_Web",
  "Google_Business",
  "Google_Note",
  "Google_Nb_Avis",
  "Services",
  "Gestion_Locative",
  "Syndic",
  "Vente",
  "Location",
  "Commercial",
  "Logiciel_Actuel",
  "Immoweb_Annonces_Total",
  "Immoweb_Location",
  "Immoweb_Vente",
  "Portfolio_Estime",
  "BCE_Numero",
  "BCE_Forme_Juridique",
  "BCE_Date_Creation",
  "Pain_Points",
  "Angle_SPIN",
];

const societeRows = [];
for (const [key, rows] of companyGroups) {
  // Pick best row (highest score) as representative
  const best = rows.reduce((a, b) =>
    parseInt(b[idx.Score] || "0") > parseInt(a[idx.Score] || "0") ? b : a
  );

  // Aggregate all agent phones/emails from IPI
  const allIpiPhones = new Set();
  const allIpiEmails = new Set();
  const allExistingPhones = new Set();
  const allExistingEmails = new Set();

  for (const row of rows) {
    const ipiPhone = row[header.length]; // Tel_Agent_IPI (already normalized)
    const ipiEmail = row[header.length + 1]; // Email_Agent_IPI
    const existingPhone = row[idx.Agent_Telephone] || "";
    const existingEmail = row[idx.Agent_Email] || "";

    if (ipiPhone) allIpiPhones.add(ipiPhone);
    if (ipiEmail) allIpiEmails.add(ipiEmail);
    // Normalize existing phones too
    if (existingPhone) {
      const norm = normalizePhone(existingPhone);
      if (norm) allExistingPhones.add(formatPhoneForCsv(norm));
    }
    if (existingEmail) allExistingEmails.add(existingEmail);
  }

  const agentNames = rows.map((r) => r[idx.Agent_Nom]).filter(Boolean).join(" | ");

  societeRows.push([
    best[idx.Entreprise],
    key,
    best[idx.Score],
    best[idx.Tier],
    best[idx.Commune],
    rows.length,
    agentNames,
    best[header.length + 2] || "", // Tel_Societe
    best[header.length + 3] || "", // Email_Societe
    best[header.length + 4] || "", // Tel_Societe_All
    best[header.length + 5] || "", // Email_Societe_All
    [...allIpiPhones].join(" | "),
    [...allIpiEmails].join(" | "),
    [...allExistingPhones].join(" | "),
    [...allExistingEmails].join(" | "),
    best[idx.Site_Web],
    best[idx.Google_Business],
    best[idx.Google_Note],
    best[idx.Google_Nb_Avis],
    best[idx.Services],
    best[idx.Gestion_Locative],
    best[idx.Syndic],
    best[idx.Vente],
    best[idx.Location],
    best[idx.Commercial],
    best[idx.Logiciel_Actuel],
    best[idx.Immoweb_Annonces_Total],
    best[idx.Immoweb_Location],
    best[idx.Immoweb_Vente],
    best[idx.Portfolio_Estime],
    best[idx.BCE_Numero],
    best[idx.BCE_Forme_Juridique],
    best[idx.BCE_Date_Creation],
    best[idx.Pain_Points],
    best[idx.Angle_SPIN],
  ]);
}

// Sort by score descending
societeRows.sort((a, b) => parseInt(b[2] || "0") - parseInt(a[2] || "0"));

const societesCsv = [toCsvLine(societeHeader), ...societeRows.map(toCsvLine)].join("\n");
writeFileSync(OUT_SOCIETES, societesCsv, "utf8");
console.log(`Wrote ${OUT_SOCIETES}`);
console.log(`  ${societeRows.length} sociétés`);

// --- Final coverage stats ---
console.log("\n=== Coverage Analysis ===");
const totalAgents = enrichedRows.length;
const withAnyPhone = enrichedRows.filter(
  (r) => r[idx.Agent_Telephone] || r[header.length] || r[header.length + 2]
).length;
const withAnyEmail = enrichedRows.filter(
  (r) => r[idx.Agent_Email] || r[header.length + 1] || r[header.length + 3]
).length;

console.log(`Agents with ANY phone: ${withAnyPhone}/${totalAgents} (${(withAnyPhone / totalAgents * 100).toFixed(1)}%)`);
console.log(`Agents with ANY email: ${withAnyEmail}/${totalAgents} (${(withAnyEmail / totalAgents * 100).toFixed(1)}%)`);

const totalSocietes = societeRows.length;
const socWithPhone = societeRows.filter((r) => r[7] || r[11] || r[13]).length;
const socWithEmail = societeRows.filter((r) => r[8] || r[12] || r[14]).length;
console.log(`\nSociétés with ANY phone: ${socWithPhone}/${totalSocietes} (${(socWithPhone / totalSocietes * 100).toFixed(1)}%)`);
console.log(`Sociétés with ANY email: ${socWithEmail}/${totalSocietes} (${(socWithEmail / totalSocietes * 100).toFixed(1)}%)`);
