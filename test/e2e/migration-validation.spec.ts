import { test, expect } from '@playwright/test';

// Migration Validation Test
// Tests only the provided accounts with password Wxcvbn123

const TEST_ACCOUNTS = [
  { email: 'arthur+prest@seido.pm', role: 'prestataire', password: 'Wxcvbn123' },
  { email: 'arthur+loc@seido.pm', role: 'locataire', password: 'Wxcvbn123' }
];

test.describe('Authentication Migration Validation', () => {
  test.describe.configure({ mode: 'serial' });

  for (const account of TEST_ACCOUNTS) {
    test(`${account.role}: Complete auth flow validation`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const criticalIssues: string[] = [];

      // Monitor console for errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Filter out non-critical errors
          if (!text.includes('favicon') &&
              !text.includes('Third-party cookie') &&
              !text.includes('extension')) {
            consoleErrors.push(text);

            // Check for critical migration issues
            if (text.includes('authCacheManager')) {
              criticalIssues.push('authCacheManager error detected');
            }
            if (text.includes('UUID')) {
              criticalIssues.push('UUID constraint error detected');
            }
            if (text.toLowerCase().includes('mock')) {
              criticalIssues.push('Mock reference still present');
            }
          }
        }
      });

      // Step 1: Navigate to login
      console.log(`Testing ${account.email} (${account.role})`);
      await page.goto('/auth/login');
      await expect(page).toHaveTitle(/SEIDO/);

      // Step 2: Fill login form
      await page.fill('input[type="email"]', account.email);
      await page.fill('input[type="password"]', account.password);

      // Step 3: Submit and wait for redirect
      await Promise.all([
        page.waitForURL(`**/${account.role}/dashboard`, { timeout: 10000 }),
        page.click('button[type="submit"]')
      ]);

      // Step 4: Verify dashboard loaded
      await expect(page).toHaveURL(new RegExp(`/${account.role}/dashboard`));

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // Step 5: Check for dashboard elements
      const mainContent = page.locator('main').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // Check for data elements
      const hasCards = await page.locator('.card, [class*="card"]').count() > 0;
      const hasStats = await page.locator('[class*="stat"], [class*="metric"]').count() > 0;

      expect(hasCards || hasStats).toBeTruthy();

      // Step 6: Check localStorage/sessionStorage for cache
      const storageData = await page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage),
          sessionStorage: Object.keys(sessionStorage)
        };
      });

      const hasCacheItems = storageData.localStorage.some(key =>
        key.includes('cache') || key.includes('auth')
      ) || storageData.sessionStorage.some(key =>
        key.includes('cache') || key.includes('auth')
      );

      console.log(`Cache system active: ${hasCacheItems}`);

      // Step 7: Test logout
      const logoutButton = page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion")').first();

      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL('**/auth/login', { timeout: 5000 });
        console.log('Logout successful');
      }

      // Final assertions
      expect(consoleErrors.length).toBe(0);
      expect(criticalIssues.length).toBe(0);
    });
  }

  test('Cache system validation', async ({ request }) => {
    // Test cache metrics endpoint
    const response = await request.get('/api/cache-metrics');

    // Cache endpoint is optional but should not error if present
    if (response.ok()) {
      const _data = await response.json();
      console.log('Cache metrics:', data);
    }
  });

  test('No mock references in API', async ({ request }) => {
    // Test that login API doesn't contain mock references
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'invalid@test.com',
        password: 'wrong'
      }
    });

    const text = await response.text();
    expect(text.toLowerCase()).not.toContain('mock');
  });
});

test.describe('Dashboard Performance', () => {
  for (const account of TEST_ACCOUNTS) {
    test(`${account.role}: Dashboard load performance`, async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.fill('input[type="email"]', account.email);
      await page.fill('input[type="password"]', account.password);

      // Measure dashboard load time
      const startTime = Date.now();

      await Promise.all([
        page.waitForURL(`**/${account.role}/dashboard`),
        page.click('button[type="submit"]')
      ]);

      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      console.log(`${account.role} dashboard load time: ${loadTime}ms`);

      // Performance should be reasonable
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });
  }
});
