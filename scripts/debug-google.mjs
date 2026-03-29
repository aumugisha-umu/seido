import { chromium } from "playwright";

async function main() {
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

  console.log("1. Loading google.com...");
  await page.goto("https://www.google.com/?hl=fr", { waitUntil: "domcontentloaded", timeout: 15000 });

  let html = await page.content();
  console.log("Page title:", await page.title());
  console.log("Has consent form:", html.includes("consent"));
  console.log("Has captcha:", html.includes("captcha") || html.includes("unusual traffic") || html.includes("not a robot"));
  console.log("URL:", page.url());

  // Try to accept consent
  const buttons = await page.$$("button");
  console.log("\nFound", buttons.length, "buttons:");
  for (const btn of buttons.slice(0, 8)) {
    const text = await btn.textContent();
    console.log("  Button:", text?.trim().slice(0, 60));
  }

  // Click consent if found
  try {
    await page.click('button:has-text("Tout accepter")', { timeout: 3000 });
    console.log("\nClicked 'Tout accepter'");
    await page.waitForTimeout(2000);
  } catch {
    try {
      await page.click('button:has-text("Accept all")', { timeout: 3000 });
      console.log("\nClicked 'Accept all'");
      await page.waitForTimeout(2000);
    } catch {
      console.log("\nNo consent button found");
    }
  }

  console.log("\n2. Searching...");
  await page.goto("https://www.google.com/search?q=BNP+Paribas+Real+Estate+Ixelles&hl=fr&gl=be", {
    waitUntil: "domcontentloaded",
    timeout: 12000,
  });

  html = await page.content();
  console.log("Search page title:", await page.title());
  console.log("URL:", page.url());
  console.log("Has captcha:", html.includes("captcha") || html.includes("unusual traffic") || html.includes("not a robot"));
  console.log("Has consent:", html.includes("consent.google"));
  console.log("Has search results:", html.includes("search-result") || html.includes("g-card") || html.includes("kp-header"));
  console.log("HTML length:", html.length);

  // Save HTML for inspection
  const { writeFileSync } = await import("fs");
  writeFileSync("docs/Sales/_debug_google.html", html);
  console.log("\nSaved HTML to docs/Sales/_debug_google.html");

  // Show a snippet of the page
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) || "");
  console.log("\n--- Page text (first 1000 chars) ---");
  console.log(bodyText.slice(0, 1000));

  await browser.close();
}

main().catch(console.error);
