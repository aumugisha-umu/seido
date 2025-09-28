/**
 * Tests E2E de l'authentification Supabase avec les vraies données
 * Vérifie le flow complet : login → middleware → dashboard → données
 */

import { test, expect } from '@playwright/test';

const TEST_USERS = {
  gestionnaire: {
    email: 'arthur@umumentum.com',
    password: 'password123',
    role: 'gestionnaire',
    dashboardUrl: '/gestionnaire/dashboard'
  },
  prestataire: {
    email: 'arthur+prest@seido.pm',
    password: 'password123',
    role: 'prestataire',
    dashboardUrl: '/prestataire/dashboard'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'password123',
    role: 'locataire',
    dashboardUrl: '/locataire/dashboard'
  }
};

test.describe('Supabase Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  Object.entries(TEST_USERS).forEach(([userType, user]) => {
    test(`${userType} login flow with real Supabase`, async ({ page }) => {
      console.log(`Testing ${userType} login...`);

      // 1. Navigate to login page
      await page.goto('/auth/login');
      await expect(page).toHaveTitle(/Connexion/);

      // Check no console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // 2. Fill login form
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      // 3. Submit form
      await page.click('button[type="submit"]');

      // 4. Wait for navigation to dashboard
      await page.waitForURL(user.dashboardUrl, { timeout: 10000 });

      // 5. Verify we're on the correct dashboard
      expect(page.url()).toContain(user.dashboardUrl);

      // 6. Check for Supabase cookies
      const cookies = await page.context().cookies();
      const hasSupabaseCookies = cookies.some(c =>
        c.name.includes('sb-access-token') ||
        c.name.includes('sb-refresh-token')
      );
      expect(hasSupabaseCookies).toBeTruthy();

      // 7. Verify dashboard content loads
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });

      // 8. Check no critical errors in console
      const criticalErrors = consoleErrors.filter(err =>
        !err.includes('Failed to load resource') &&
        !err.includes('404') &&
        !err.includes('authCacheManager') // Ignore cache warnings
      );

      if (criticalErrors.length > 0) {
        console.log('Console errors found:', criticalErrors);
      }
      expect(criticalErrors).toHaveLength(0);

      // 9. Test logout
      const logoutButton = page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion")').first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL('/auth/login', { timeout: 5000 });
        expect(page.url()).toContain('/auth/login');
      }

      console.log(`✓ ${userType} login test passed`);
    });
  });

  test('middleware protects authenticated routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/gestionnaire/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/erreur|invalid|incorrect/i')).toBeVisible({ timeout: 5000 });

    // Should stay on login page
    expect(page.url()).toContain('/auth/login');
  });

  test('dashboard data loads without mock errors', async ({ page }) => {
    // Login as gestionnaire
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_USERS.gestionnaire.email);
    await page.fill('input[type="password"]', TEST_USERS.gestionnaire.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL(TEST_USERS.gestionnaire.dashboardUrl);

    // Check that stats cards load (even if with zeros)
    const statsCards = page.locator('.grid .rounded-lg').filter({ hasText: /Total|Actifs|En cours/ });
    await expect(statsCards.first()).toBeVisible({ timeout: 5000 });

    // Check no UUID errors in console
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('UUID')) {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit to catch any async errors
    await page.waitForTimeout(2000);

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Session Persistence', () => {
  test('session persists across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_USERS.gestionnaire.email);
    await page.fill('input[type="password"]', TEST_USERS.gestionnaire.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(TEST_USERS.gestionnaire.dashboardUrl);

    // Refresh page
    await page.reload();

    // Should still be on dashboard
    expect(page.url()).toContain(TEST_USERS.gestionnaire.dashboardUrl);

    // Dashboard should still load
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('session works across different pages', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_USERS.gestionnaire.email);
    await page.fill('input[type="password"]', TEST_USERS.gestionnaire.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(TEST_USERS.gestionnaire.dashboardUrl);

    // Navigate to different authenticated pages
    const authenticatedPages = [
      '/gestionnaire/interventions',
      '/gestionnaire/biens',
      '/gestionnaire/profile'
    ];

    for (const pageUrl of authenticatedPages) {
      await page.goto(pageUrl);
      // Should not redirect to login
      expect(page.url()).not.toContain('/auth/login');
      // Page should load
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
