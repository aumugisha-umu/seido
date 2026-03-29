/**
 * Enrich company contacts from Belgian online directories using Playwright
 *
 * Tries goldenpages.be (Pages d'Or) which has good coverage of Belgian businesses.
 *
 * Usage:
 *   node scripts/enrich-directory-contacts.mjs [--limit N] [--resume]
 *
 * Output: docs/Sales/_enrichment_directory_contacts.json
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORED_FILE = resolve(__dirname, "../docs/Sales/_prospects_scored.json");
const OUTPUT_FILE = resolve(__dirname, "../docs/Sales/_enrichment_directory_contacts.json");

const DELAY_MS = 2000;
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0");
const RESUME = process.argv.includes("--resume");

// --- Extract from search results page (runs in browser) ---
function extractResults() {
  const results = [];

  // GoldenPages result cards
  const cards = document.querySelectorAll(".result, .listing-item, [data-listing], .business-card, article");
  for (const card of cards) {
    const entry = { name: null, phone: null, address: null, website: null };

    // Name
    const nameEl = card.querySelector("h2, h3, .business-name, .listing-name, a[href*='/detail/']");
    if (nameEl) entry.name = nameEl.textContent?.trim();

    // Phone from tel: link
    const telLink = card.querySelector('a[href^="tel:"]');
    if (telLink) entry.phone = telLink.href.replace("tel:", "").trim();

    // Phone from data attributes
    if (!entry.phone) {
      const phoneEl = card.querySelector("[data-phone], [data-tel]");
      if (phoneEl) entry.phone = phoneEl.getAttribute("data-phone") || phoneEl.getAttribute("data-tel");
    }

    // Phone from visible text
    if (!entry.phone) {
      const text = card.textContent || "";
      const m = text.match(/(\+32[\s.\-()0-9]{8,15})/) || text.match(/(0[1-9][\s.\-/()0-9]{7,14})/);
      if (m) entry.phone = m[1].trim();
    }

    // Address
    const addrEl = card.querySelector(".address, .location, [itemprop='address']");
    if (addrEl) entry.address = addrEl.textContent?.trim();

    // Website
    const siteLink = card.querySelector("a[href*='http']:not([href*='goldenpages']):not([href*='google'])");
    if (siteLink) entry.website = siteLink.href;

    if (entry.name || entry.phone) results.push(entry);
  }

  // Also grab any tel: links on the page if no structured results
  if (results.length === 0) {
    const allTelLinks = document.querySelectorAll('a[href^="tel:"]');
    for (const link of allTelLinks) {
      const phone = link.href.replace("tel:", "").trim();
      if (phone.length >= 8) {
        results.push({
          name: link.closest("div, li, article")?.querySelector("h2, h3, strong, b")?.textContent?.trim() || null,
          phone,
          address: null,
          website: null,
        });
      }
    }
  }

  return results;
}

// --- Fuzzy company name match ---
function normalizeForMatch(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMatch(searchName, resultName) {
  if (!resultName) return false;
  const a = normalizeForMatch(searchName);
  const b = normalizeForMatch(resultName);
  // Exact or contains
  if (a === b || b.includes(a) || a.includes(b)) return true;
  // First 2 words match
  const aWords = a.split(" ").slice(0, 2).join(" ");
  const bWords = b.split(" ").slice(0, 2).join(" ");
  return aWords.length > 3 && (bWords.includes(aWords) || aWords.includes(bWords));
}

async function main() {
  console.log("=== Directory Contact Enrichment (Playwright) ===\n");

  const scored = JSON.parse(readFileSync(SCORED_FILE, "utf8"));

  // Focus on companies WITHOUT a phone number
  let companies = scored
    .filter((co) => co.name && co.commune)
    .map((co) => ({
      name: co.name,
      normalizedName: co.normalizedName,
      commune: co.commune,
      hasPhone: co.contact?.allPhones?.length > 0,
    }));

  const noPhone = companies.filter((c) => !c.hasPhone);
  console.log(`Total companies: ${companies.length}`);
  console.log(`Without phone: ${noPhone.length}`);
  // Prioritize companies without phone, then the rest
  companies = [...noPhone, ...companies.filter((c) => c.hasPhone)];

  // Resume
  let results = [];
  const processedNames = new Set();
  if (RESUME && existsSync(OUTPUT_FILE)) {
    results = JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
    for (const r of results) processedNames.add(r.normalizedName);
    console.log(`Resuming: ${results.length} already processed`);
  }

  companies = companies.filter((c) => !processedNames.has(c.normalizedName));
  if (LIMIT > 0) companies = companies.slice(0, LIMIT);
  console.log(`Processing: ${companies.length} companies\n`);

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "fr-BE",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();

  // Test with goldenpages first
  console.log("  Testing goldenpages.be...");
  try {
    await page.goto("https://www.goldenpages.be/", { waitUntil: "domcontentloaded", timeout: 10000 });
    console.log("  GoldenPages loaded:", await page.title());

    // Accept cookies if needed
    try {
      await page.click('button:has-text("Accepter"), button:has-text("Accept"), #onetrust-accept-btn-handler', { timeout: 3000 });
      console.log("  Cookies accepted");
      await page.waitForTimeout(1000);
    } catch { /* no cookie banner */ }
  } catch (e) {
    console.log("  GoldenPages failed:", e.message);
  }

  let processed = 0;
  let phonesFound = 0;
  let consecutiveErrors = 0;

  for (const co of companies) {
    const entry = {
      name: co.name,
      normalizedName: co.normalizedName,
      commune: co.commune,
      phone: null,
      address: null,
      website: null,
      source: null,
      error: null,
    };

    // Search on goldenpages.be
    const searchQuery = encodeURIComponent(co.name);
    const searchLocation = encodeURIComponent(co.commune);
    const searchUrl = `https://www.goldenpages.be/qn/${searchQuery}/qs/${searchLocation}/`;

    try {
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(800); // let JS render

      // Check for block
      const content = await page.content();
      if (content.includes("captcha") || content.includes("blocked") || content.length < 500) {
        entry.error = "blocked";
        consecutiveErrors++;
      } else {
        consecutiveErrors = 0;

        const pageResults = await page.evaluate(extractResults);

        // Find best match
        const match = pageResults.find((r) => isMatch(co.name, r.name));
        if (match) {
          entry.phone = match.phone;
          entry.address = match.address;
          entry.website = match.website;
          entry.source = "goldenpages";
        } else if (pageResults.length > 0) {
          // Take first result if company name is very specific
          entry.phone = pageResults[0].phone;
          entry.source = "goldenpages-first";
        }
      }
    } catch (err) {
      entry.error = err.message?.slice(0, 80) || "unknown";
      consecutiveErrors++;
    }

    results.push(entry);
    processed++;
    if (entry.phone) phonesFound++;

    const info = entry.error
      ? `ERR: ${entry.error}`
      : entry.phone
        ? `${entry.phone} (${entry.source})`
        : "no match";
    console.log(`  [${processed}/${companies.length}] ${co.name} — ${info}`);

    // Save every 20
    if (processed % 20 === 0) {
      writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    }

    if (consecutiveErrors >= 5) {
      console.log("\n!!! Too many consecutive errors. Stopping. !!!");
      break;
    }

    // Rate limit
    const delay = DELAY_MS + Math.random() * 1000;
    await page.waitForTimeout(delay);
  }

  await browser.close();
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log(`\n=== Results ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Phones found: ${phonesFound} (${results.length ? (phonesFound / processed * 100).toFixed(1) : 0}%)`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main().catch(console.error);
