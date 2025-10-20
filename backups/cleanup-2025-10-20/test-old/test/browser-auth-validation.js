// Browser-based Authentication Validation
// Tests for console errors and UI functionality

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3002';

async function validateWithBrowser() {
  console.log('\n🌐 BROWSER-BASED VALIDATION');
  console.log('=' .repeat(60));
  console.log('Checking for console errors and UI functionality\n');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const testAccounts = [
    { email: 'arthur+prest@seido.pm', role: 'prestataire', password: 'Wxcvbn123' },
    { email: 'arthur+loc@seido.pm', role: 'locataire', password: 'Wxcvbn123' }
  ];

  const results = {
    accounts: [],
    totalConsoleErrors: 0,
    criticalErrors: []
  };

  for (const account of testAccounts) {
    console.log(`\n🧪 Testing ${account.email} (${account.role})`);
    console.log('-'.repeat(40));

    const page = await browser.newPage();
    const consoleErrors = [];
    const networkErrors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out non-critical errors
        if (!text.includes('favicon.ico') &&
            !text.includes('Third-party cookie') &&
            !text.includes('Chrome extension')) {
          consoleErrors.push(text);

          // Check for critical migration issues
          if (text.includes('authCacheManager')) {
            console.log('  ❌ CRITICAL: authCacheManager error detected');
            results.criticalErrors.push('authCacheManager error');
          }
          if (text.includes('UUID')) {
            console.log('  ❌ CRITICAL: UUID constraint error detected');
            results.criticalErrors.push('UUID constraint error');
          }
          if (text.toLowerCase().includes('mock')) {
            console.log('  ❌ CRITICAL: Mock reference detected');
            results.criticalErrors.push('Mock reference found');
          }
        }
      }
    });

    // Capture network errors
    page.on('requestfailed', request => {
      const url = request.url();
      if (!url.includes('favicon.ico')) {
        networkErrors.push({
          url: url,
          error: request.failure()?.errorText || 'Unknown'
        });
      }
    });

    try {
      // Navigate to login
      console.log('  → Navigating to login page...');
      await page.goto(`${BASE_URL}/auth/login`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Take screenshot of login page
      await page.screenshot({
        path: `test/reports/login-${account.role}.png`,
        fullPage: true
      });

      // Fill and submit login form
      console.log('  → Logging in...');
      await page.type('input[type="email"]', account.email);
      await page.type('input[type="password"]', account._password);

      // Click login button and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
      ]);

      const currentUrl = page.url();
      console.log(`  → Redirected to: ${currentUrl}`);

      // Check if we reached the dashboard
      if (currentUrl.includes(`/${account.role}/dashboard`)) {
        console.log('  ✅ Successfully reached dashboard');

        // Wait for content to load
        await page.waitForTimeout(3000);

        // Take screenshot of dashboard
        await page.screenshot({
          path: `test/reports/dashboard-${account.role}.png`,
          fullPage: true
        });

        // Check for dashboard elements
        const dashboardElements = await page.evaluate(() => {
          return {
            hasHeader: !!document.querySelector('header, nav'),
            hasSidebar: !!document.querySelector('aside, [role="navigation"]'),
            hasMainContent: !!document.querySelector('main, [role="main"]'),
            hasCards: document.querySelectorAll('.card, [class*="card"]').length,
            hasStats: document.querySelectorAll('[class*="stat"], [class*="metric"]').length,
            hasData: document.querySelectorAll('table, [role="table"], .data-table').length
          };
        });

        console.log('  📊 Dashboard elements found:');
        console.log(`     Header: ${dashboardElements.hasHeader ? '✅' : '❌'}`);
        console.log(`     Sidebar: ${dashboardElements.hasSidebar ? '✅' : '❌'}`);
        console.log(`     Main Content: ${dashboardElements.hasMainContent ? '✅' : '❌'}`);
        console.log(`     Cards: ${dashboardElements.hasCards}`);
        console.log(`     Stats: ${dashboardElements.hasStats}`);
        console.log(`     Data Tables: ${dashboardElements.hasData}`);

        // Check localStorage and sessionStorage
        const storageData = await page.evaluate(() => {
          return {
            localStorage: Object.keys(localStorage),
            sessionStorage: Object.keys(sessionStorage)
          };
        });

        console.log('  💾 Storage analysis:');
        console.log(`     localStorage items: ${storageData.localStorage.length}`);
        console.log(`     sessionStorage items: ${storageData.sessionStorage.length}`);

        // Check for cache-related items
        const cacheItems = storageData.localStorage.filter(key =>
          key.includes('cache') || key.includes('auth')
        );
        if (cacheItems.length > 0) {
          console.log(`  ✅ Cache system active (${cacheItems.length} cache items)`);
        }

        // Test logout
        console.log('  → Testing logout...');
        const logoutButton = await page.$('button:has-text("Déconnexion"), a:has-text("Déconnexion"), button:has-text("Se déconnecter")');

        if (logoutButton) {
          await logoutButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
          console.log('  ✅ Logout successful');
        } else {
          console.log('  ⚠️  Logout button not found');
        }

      } else {
        console.log(`  ❌ Failed to reach dashboard (stuck at ${currentUrl})`);
      }

    } catch (error) {
      console.log(`  ❌ Test failed: ${error.message}`);
    }

    // Report console errors for this account
    if (consoleErrors.length > 0) {
      console.log(`  ⚠️  Console errors detected: ${consoleErrors.length}`);
      consoleErrors.slice(0, 3).forEach(err => {
        console.log(`     - ${err.substring(0, 100)}`);
      });
    } else {
      console.log('  ✅ No console errors');
    }

    // Report network errors
    if (networkErrors.length > 0) {
      console.log(`  ⚠️  Network errors: ${networkErrors.length}`);
    }

    results.accounts.push({
      email: account.email,
      role: account.role,
      consoleErrors: consoleErrors.length,
      networkErrors: networkErrors.length
    });

    results.totalConsoleErrors += consoleErrors.length;

    await page.close();
  }

  await browser.close();

  // Generate final report
  console.log('\n' + '=' .repeat(60));
  console.log('📝 BROWSER VALIDATION SUMMARY');
  console.log('=' .repeat(60));

  console.log(`\n✅ Accounts tested: ${results.accounts.length}`);
  console.log(`⚠️  Total console errors: ${results.totalConsoleErrors}`);
  console.log(`❌ Critical errors: ${results.criticalErrors.length}`);

  if (results.criticalErrors.length > 0) {
    console.log('\n⚠️  CRITICAL ISSUES FOUND:');
    [...new Set(results.criticalErrors)].forEach(err => {
      console.log(`  - ${err}`);
    });
  } else {
    console.log('\n✅ No critical migration issues detected');
  }

  console.log('\n📊 Per-account summary:');
  results.accounts.forEach(acc => {
    console.log(`  ${acc.email}:`);
    console.log(`    Console errors: ${acc.consoleErrors}`);
    console.log(`    Network errors: ${acc.networkErrors}`);
  });

  // Overall status
  console.log('\n🎯 MIGRATION VALIDATION RESULT:');
  if (results.totalConsoleErrors === 0 && results.criticalErrors.length === 0) {
    console.log('  ✅✅✅ PERFECT - No errors detected, migration complete!');
  } else if (results.criticalErrors.length === 0) {
    console.log('  ✅ GOOD - Migration successful, minor warnings only');
  } else {
    console.log('  ❌ ISSUES DETECTED - Review critical errors above');
  }

  console.log('\n📸 Screenshots saved in test/reports/');
  console.log('=' .repeat(60));

  return results;
}

// Run the browser validation
validateWithBrowser().catch(console.error);