// Authentication Migration Validation Test
// Tests the complete migration from mock auth to Supabase auth
// Tests only the provided accounts with password "Wxcvbn123"

import { chromium } from 'playwright';

const TEST_ACCOUNTS = [
  { email: 'arthur+prest@seido.pm', role: 'prestataire', password: 'Wxcvbn123' },
  { email: 'arthur+loc@seido.pm', role: 'locataire', password: 'Wxcvbn123' }
];

const BASE_URL = 'http://localhost:3000';

class AuthMigrationValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      accounts: [],
      overallStatus: 'PENDING',
      errors: [],
      cacheMetrics: null
    };
  }

  async runTests() {
    console.log('🔍 Starting Authentication Migration Validation');
    console.log('=' .repeat(60));

    const browser = await chromium.launch({
      headless: false,
      devtools: true
    });

    try {
      for (const account of TEST_ACCOUNTS) {
        console.log(`\n📧 Testing account: ${account.email} (${account.role})`);
        await this.testAccount(browser, account);
      }

      // Test cache metrics endpoint if available
      await this.testCacheMetrics();

      // Analyze results
      this.analyzeResults();

      // Generate report
      this.generateReport();

    } finally {
      await browser.close();
    }
  }

  async testAccount(browser, account) {
    const context = await browser.newContext();
    const page = await context.newPage();

    const accountResult = {
      email: account.email,
      role: account.role,
      loginStatus: 'FAILED',
      dashboardLoaded: false,
      consoleErrors: [],
      networkErrors: [],
      cacheHits: 0,
      cacheMisses: 0,
      performanceMetrics: {}
    };

    try {
      // Monitor console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Filter out irrelevant errors
          if (!text.includes('favicon') && !text.includes('Third-party cookie')) {
            accountResult.consoleErrors.push(text);

            // Check for specific migration issues
            if (text.includes('authCacheManager')) {
              console.log('  ❌ authCacheManager error detected');
            }
            if (text.includes('UUID')) {
              console.log('  ❌ UUID constraint error detected');
            }
            if (text.includes('mock')) {
              console.log('  ❌ Mock reference still present');
            }
          }
        }
      });

      // Monitor network errors
      page.on('requestfailed', request => {
        accountResult.networkErrors.push({
          url: request.url(),
          error: request.failure()?.errorText || 'Unknown error'
        });
      });

      // Step 1: Navigate to login page
      console.log('  → Navigating to login page...');
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });

      // Step 2: Fill login form
      console.log('  → Filling login form...');
      await page.fill('input[type="email"]', account.email);
      await page.fill('input[type="password"]', account._password);

      // Step 3: Submit login
      console.log('  → Submitting login...');
      const startTime = Date.now();
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]')
      ]);
      const loginTime = Date.now() - startTime;

      // Step 4: Check redirect URL
      const currentUrl = page.url();
      const expectedDashboard = `/${account.role}/dashboard`;

      if (currentUrl.includes(expectedDashboard)) {
        accountResult.loginStatus = 'SUCCESS';
        console.log(`  ✅ Login successful (${loginTime}ms)`);

        // Step 5: Wait for dashboard to load
        console.log('  → Waiting for dashboard to load...');
        try {
          // Wait for main dashboard content
          await page.waitForSelector('[data-testid="dashboard-content"], main', {
            timeout: 10000
          });

          // Check for stats or data elements
          const hasData = await page.evaluate(() => {
            const statsElements = document.querySelectorAll('[class*="stat"], [class*="metric"], [class*="card"]');
            return statsElements.length > 0;
          });

          if (hasData) {
            accountResult.dashboardLoaded = true;
            console.log('  ✅ Dashboard loaded with data');
          } else {
            console.log('  ⚠️  Dashboard loaded but no data visible');
          }

          // Capture performance metrics
          accountResult.performanceMetrics = await page.evaluate(() => {
            const perf = performance.getEntriesByType('navigation')[0];
            return {
              loadTime: perf.loadEventEnd - perf.fetchStart,
              domReady: perf.domContentLoadedEventEnd - perf.fetchStart,
              firstByte: perf.responseStart - perf.fetchStart
            };
          });

        } catch (error) {
          console.log('  ❌ Dashboard failed to load properly:', error.message);
        }

        // Step 6: Test logout
        console.log('  → Testing logout...');
        try {
          // Look for logout button/link
          const logoutButton = await page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion"), button:has-text("Se déconnecter")').first();

          if (await logoutButton.isVisible()) {
            await logoutButton.click();
            await page.waitForURL('**/auth/login', { timeout: 5000 });
            console.log('  ✅ Logout successful');
          } else {
            console.log('  ⚠️  Logout button not found');
          }
        } catch (error) {
          console.log('  ⚠️  Logout test skipped:', error.message);
        }

      } else {
        console.log(`  ❌ Login failed - redirected to: ${currentUrl}`);

        // Check for error messages
        const errorElement = await page.locator('.error, [role="alert"], .text-red-500').first();
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          console.log(`  Error message: ${errorText}`);
        }
      }

      // Check for cache usage (if available in localStorage or sessionStorage)
      const cacheData = await page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage).filter(key => key.includes('cache')),
          sessionStorage: Object.keys(sessionStorage).filter(key => key.includes('cache'))
        };
      });

      if (cacheData.localStorage.length > 0 || cacheData.sessionStorage.length > 0) {
        console.log('  ✅ Cache system is active');
        accountResult.cacheHits = cacheData.localStorage.length + cacheData.sessionStorage.length;
      }

    } catch (error) {
      console.log(`  ❌ Test failed with error: ${error.message}`);
      accountResult.consoleErrors.push(error.message);
    } finally {
      this.results.accounts.push(accountResult);
      await context.close();
    }
  }

  async testCacheMetrics() {
    console.log('\n📊 Testing cache metrics endpoint...');
    try {
      const response = await fetch(`${BASE_URL}/api/cache-metrics`);
      if (response.ok) {
        this.results.cacheMetrics = await response.json();
        console.log('  ✅ Cache metrics retrieved successfully');
      } else {
        console.log('  ⚠️  Cache metrics endpoint not available');
      }
    } catch (error) {
      console.log('  ⚠️  Cache metrics test skipped:', error.message);
    }
  }

  analyzeResults() {
    const successCount = this.results.accounts.filter(a => a.loginStatus === 'SUCCESS').length;
    const dashboardLoadCount = this.results.accounts.filter(a => a.dashboardLoaded).length;
    const totalErrors = this.results.accounts.reduce((sum, a) => sum + a.consoleErrors.length, 0);

    // Check for critical issues
    const hasMockReferences = this.results.accounts.some(a =>
      a.consoleErrors.some(e => e.toLowerCase().includes('mock'))
    );
    const hasUUIDErrors = this.results.accounts.some(a =>
      a.consoleErrors.some(e => e.includes('UUID'))
    );
    const hasCacheErrors = this.results.accounts.some(a =>
      a.consoleErrors.some(e => e.includes('authCacheManager'))
    );

    // Determine overall status
    if (successCount === TEST_ACCOUNTS.length && dashboardLoadCount === TEST_ACCOUNTS.length && totalErrors === 0) {
      this.results.overallStatus = 'PERFECT';
    } else if (successCount === TEST_ACCOUNTS.length && !hasMockReferences && !hasUUIDErrors) {
      this.results.overallStatus = 'GOOD';
    } else if (successCount > 0) {
      this.results.overallStatus = 'PARTIAL';
    } else {
      this.results.overallStatus = 'FAILED';
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📝 AUTHENTICATION MIGRATION TEST REPORT');
    console.log('='.repeat(60));

    console.log(`\n📅 Test Date: ${new Date().toLocaleString()}`);
    console.log(`🎯 Overall Status: ${this.getStatusEmoji(this.results.overallStatus)} ${this.results.overallStatus}`);

    console.log('\n📊 SUMMARY');
    console.log('-'.repeat(40));
    const successCount = this.results.accounts.filter(a => a.loginStatus === 'SUCCESS').length;
    const dashboardCount = this.results.accounts.filter(a => a.dashboardLoaded).length;

    console.log(`  ✓ Login Success Rate: ${successCount}/${TEST_ACCOUNTS.length} (${(successCount/TEST_ACCOUNTS.length*100).toFixed(0)}%)`);
    console.log(`  ✓ Dashboard Load Rate: ${dashboardCount}/${TEST_ACCOUNTS.length} (${(dashboardCount/TEST_ACCOUNTS.length*100).toFixed(0)}%)`);

    console.log('\n👤 ACCOUNT DETAILS');
    console.log('-'.repeat(40));
    this.results.accounts.forEach(account => {
      console.log(`\n  ${account.email} (${account.role})`);
      console.log(`    Login: ${this.getStatusEmoji(account.loginStatus === 'SUCCESS' ? 'GOOD' : 'FAILED')} ${account.loginStatus}`);
      console.log(`    Dashboard: ${account.dashboardLoaded ? '✅' : '❌'} ${account.dashboardLoaded ? 'Loaded' : 'Not loaded'}`);
      console.log(`    Console Errors: ${account.consoleErrors.length}`);
      if (account.consoleErrors.length > 0) {
        account.consoleErrors.slice(0, 3).forEach(error => {
          console.log(`      - ${error.substring(0, 80)}...`);
        });
      }
      if (account.performanceMetrics.loadTime) {
        console.log(`    Load Time: ${account.performanceMetrics.loadTime}ms`);
      }
    });

    console.log('\n⚠️  CRITICAL ISSUES');
    console.log('-'.repeat(40));
    const issues = [];

    // Check for mock references
    const mockErrors = this.results.accounts.flatMap(a =>
      a.consoleErrors.filter(e => e.toLowerCase().includes('mock'))
    );
    if (mockErrors.length > 0) {
      issues.push(`Mock references still present (${mockErrors.length} occurrences)`);
    }

    // Check for UUID errors
    const uuidErrors = this.results.accounts.flatMap(a =>
      a.consoleErrors.filter(e => e.includes('UUID'))
    );
    if (uuidErrors.length > 0) {
      issues.push(`UUID constraint errors (${uuidErrors.length} occurrences)`);
    }

    // Check for cache errors
    const cacheErrors = this.results.accounts.flatMap(a =>
      a.consoleErrors.filter(e => e.includes('authCacheManager'))
    );
    if (cacheErrors.length > 0) {
      issues.push(`Auth cache manager errors (${cacheErrors.length} occurrences)`);
    }

    if (issues.length === 0) {
      console.log('  ✅ No critical issues detected');
    } else {
      issues.forEach(issue => {
        console.log(`  ❌ ${issue}`);
      });
    }

    console.log('\n🚀 CACHE SYSTEM STATUS');
    console.log('-'.repeat(40));
    if (this.results.cacheMetrics) {
      console.log('  ✅ Cache metrics endpoint functional');
      console.log(`  Cache Hits: ${this.results.cacheMetrics.hits || 0}`);
      console.log(`  Cache Misses: ${this.results.cacheMetrics.misses || 0}`);
    } else {
      const totalCacheHits = this.results.accounts.reduce((sum, a) => sum + a.cacheHits, 0);
      if (totalCacheHits > 0) {
        console.log(`  ✅ Cache system active (${totalCacheHits} items cached)`);
      } else {
        console.log('  ⚠️  Cache system status unknown');
      }
    }

    console.log('\n💊 SYSTEM HEALTH');
    console.log('-'.repeat(40));
    const avgLoadTime = this.results.accounts
      .filter(a => a.performanceMetrics.loadTime)
      .reduce((sum, a, _, arr) => sum + a.performanceMetrics.loadTime / arr.length, 0);

    if (avgLoadTime > 0) {
      console.log(`  Average Load Time: ${avgLoadTime.toFixed(0)}ms`);
    }

    const totalNetworkErrors = this.results.accounts.reduce((sum, a) => sum + a.networkErrors.length, 0);
    console.log(`  Network Errors: ${totalNetworkErrors}`);

    console.log('\n🎯 MIGRATION STATUS');
    console.log('-'.repeat(40));
    if (this.results.overallStatus === 'PERFECT') {
      console.log('  ✅ Migration COMPLETE - All systems operational');
    } else if (this.results.overallStatus === 'GOOD') {
      console.log('  ✅ Migration SUCCESSFUL - Minor issues only');
    } else if (this.results.overallStatus === 'PARTIAL') {
      console.log('  ⚠️  Migration PARTIAL - Some functionality working');
    } else {
      console.log('  ❌ Migration FAILED - Critical issues detected');
    }

    console.log('\n' + '='.repeat(60));

    // Save report to file
    this.saveReport();
  }

  getStatusEmoji(status) {
    const emojis = {
      'PERFECT': '🎯',
      'GOOD': '✅',
      'PARTIAL': '⚠️',
      'FAILED': '❌',
      'PENDING': '⏳'
    };
    return emojis[status] || '❓';
  }

  saveReport() {
    const fs = require('fs').promises;
    const reportPath = './test/reports/auth-migration-validation-' + Date.now() + '.json';
    fs.writeFile(reportPath, JSON.stringify(this.results, null, 2))
      .then(() => console.log(`\n📁 Report saved to: ${reportPath}`))
      .catch(err => console.error('Failed to save report:', err));
  }
}

// Run the validation
const validator = new AuthMigrationValidator();
validator.runTests().catch(console.error);