/**
 * Enrich company contacts from Google Search using Playwright
 *
 * Uses a real headless browser to avoid Google blocking.
 * Searches "company commune" to extract phone, rating, review count
 * from the knowledge panel.
 *
 * Usage:
 *   node scripts/enrich-google-contacts.mjs [--limit N] [--resume]
 *
 * Output: docs/Sales/_enrichment_google_contacts.json
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORED_FILE = resolve(__dirname, "../docs/Sales/_prospects_scored.json");
const OUTPUT_FILE = resolve(__dirname, "../docs/Sales/_enrichment_google_contacts.json");

const DELAY_MS = 2000 + Math.random() * 1500; // 2-3.5s between searches
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0");
const RESUME = process.argv.includes("--resume");

// --- Extract data from Google search page (in browser context) ---
function extractFromPage() {
  const result = { phone: null, rating: null, reviewCount: null, address: null, website: null, hours: null };

  // Knowledge panel phone: look for tel: links or phone patterns
  const telLinks = document.querySelectorAll('a[href^="tel:"]');
  for (const link of telLinks) {
    const phone = link.href.replace("tel:", "").trim();
    if (phone.length >= 8) {
      result.phone = phone;
      break;
    }
  }

  // Also check data-phone-number attributes
  if (!result.phone) {
    const phoneEl = document.querySelector("[data-phone-number]");
    if (phoneEl) result.phone = phoneEl.getAttribute("data-phone-number");
  }

  // Check visible phone patterns in knowledge panel
  if (!result.phone) {
    const kpTexts = document.querySelectorAll('[data-attrid*="phone"], [data-attrid*="kc"]');
    for (const el of kpTexts) {
      const text = el.textContent || "";
      const m = text.match(/(\+32[\s.\-()0-9]{8,15})/);
      if (m) { result.phone = m[1].trim(); break; }
      const m2 = text.match(/(0[1-9][\s.\-/()0-9]{7,14})/);
      if (m2) { result.phone = m2[1].trim(); break; }
    }
  }

  // Rating
  const ratingEl = document.querySelector('[data-attrid*="rating"] .Aq14fc, .yi40Hd.YrbPuc, span[aria-label*="star"], span[aria-label*="étoile"]');
  if (ratingEl) {
    const rText = ratingEl.textContent || ratingEl.getAttribute("aria-label") || "";
    const rMatch = rText.match(/(\d[.,]\d)/);
    if (rMatch) result.rating = parseFloat(rMatch[1].replace(",", "."));
  }

  // Review count
  const reviewEl = document.querySelector('[data-attrid*="rating"] .hqzQac, a[href*="reviews"], span[aria-label*="avis"]');
  if (reviewEl) {
    const rvText = reviewEl.textContent || reviewEl.getAttribute("aria-label") || "";
    const rvMatch = rvText.match(/([\d\s.]+)\s*(?:avis|review|opinion|Google)/i);
    if (rvMatch) result.reviewCount = parseInt(rvMatch[1].replace(/[\s.]/g, ""));
  }

  // Website from knowledge panel
  const siteLink = document.querySelector('[data-attrid*="website"] a, a[data-ved][ping*="url"]');
  if (siteLink) {
    const href = siteLink.href;
    if (href && !href.includes("google.com") && !href.includes("goo.gl")) {
      result.website = href;
    }
  }

  // Address
  const addrEl = document.querySelector('[data-attrid*="address"] .LrzXr, [data-attrid*="kc:/location"] .LrzXr');
  if (addrEl) result.address = addrEl.textContent?.trim() || null;

  return result;
}

async function main() {
  console.log("=== Google Contact Enrichment (Playwright) ===\n");

  const scored = JSON.parse(readFileSync(SCORED_FILE, "utf8"));

  let companies = scored
    .filter((co) => co.name)
    .map((co) => ({
      name: co.name,
      normalizedName: co.normalizedName,
      commune: co.commune || "",
      hasPhone: co.contact?.allPhones?.length > 0,
    }));

  console.log(`Total companies: ${companies.length}`);

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
  // headless: "new" uses the new headless mode that's harder to detect
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "fr-BE",
    geolocation: { latitude: 50.85, longitude: 4.35 },
    permissions: ["geolocation"],
    // Remove webdriver flag
    javaScriptEnabled: true,
  });
  // Remove navigator.webdriver detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();

  // Accept Google consent on first visit
  console.log("  Initial Google load + consent...");
  try {
    await page.goto("https://www.google.com/search?q=test&hl=fr&gl=be", { waitUntil: "domcontentloaded", timeout: 15000 });
    // Try consent button
    const consentBtn = await page.$('button[id="L2AGLb"], button:has-text("Tout accepter"), button:has-text("Accept all")');
    if (consentBtn) {
      await consentBtn.click();
      console.log("  Google consent accepted");
      await page.waitForTimeout(1500);
    }
  } catch {
    console.log("  No consent needed or failed, continuing...");
  }

  let processed = 0;
  let phonesFound = 0;
  let ratingsFound = 0;
  let blocked = 0;
  let consecutiveBlocks = 0;

  for (let i = 0; i < companies.length; i++) {
    const co = companies[i];
    const entry = {
      name: co.name,
      normalizedName: co.normalizedName,
      commune: co.commune,
      phone: null,
      rating: null,
      reviewCount: null,
      address: null,
      website: null,
      error: null,
    };

    const query = `${co.name} ${co.commune}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=fr&gl=be`;

    try {
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 12000 });

      // Check for captcha/block
      const content = await page.content();
      if (content.includes("captcha") || content.includes("unusual traffic") || content.includes("are not a robot")) {
        entry.error = "captcha";
        blocked++;
        consecutiveBlocks++;
      } else {
        consecutiveBlocks = 0;
        // Wait a tiny bit for knowledge panel to render
        await page.waitForTimeout(500);

        const extracted = await page.evaluate(extractFromPage);
        entry.phone = extracted.phone;
        entry.rating = extracted.rating;
        entry.reviewCount = extracted.reviewCount;
        entry.address = extracted.address;
        entry.website = extracted.website;
      }
    } catch (err) {
      entry.error = err.message?.slice(0, 100) || "unknown";
    }

    results.push(entry);
    processed++;
    if (entry.phone) phonesFound++;
    if (entry.rating) ratingsFound++;

    const info = entry.error
      ? `ERR: ${entry.error}`
      : `${entry.phone || "no tel"} | ${entry.rating ? entry.rating + "★ " + (entry.reviewCount || "?") + " avis" : "no rating"}`;
    console.log(`  [${processed}/${companies.length}] ${co.name} — ${info}`);

    // Save every 20
    if (processed % 20 === 0) {
      writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      console.log(`  --- saved ${results.length} results ---`);
    }

    // Stop if too many consecutive blocks
    if (consecutiveBlocks >= 5) {
      console.log("\n!!! 5 consecutive blocks. Stopping. Resume with --resume !!!\n");
      break;
    }

    // Rate limit — variable delay to look more human
    const delay = DELAY_MS + Math.random() * 1500;
    await page.waitForTimeout(delay);
  }

  await browser.close();
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log(`\n=== Results ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Total results: ${results.length}`);
  console.log(`Phones found: ${phonesFound} (${results.length ? (phonesFound / results.length * 100).toFixed(1) : 0}%)`);
  console.log(`Ratings found: ${ratingsFound}`);
  console.log(`Blocked: ${blocked}`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main().catch(console.error);
