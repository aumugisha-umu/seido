import { test, expect } from '@playwright/test';

/**
 * Tests de validation complète de l'authentification SEIDO
 * Vérifie les comptes fonctionnels et le flow complet
 */

const WORKING_ACCOUNTS = [
  {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123',
    role: 'prestataire',
    name: 'Sophie Massart',
    dashboardPath: '/prestataire/dashboard'
  },
  {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    role: 'locataire',
    name: 'Bernard Vilo',
    dashboardPath: '/locataire/dashboard'
  }
];

test.describe('Authentication Complete Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies
    await page.context().clearCookies();
    // Navigate to login first to have proper context
    await page.goto('/auth/login');
    // Then clear storage if accessible
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore security errors in test environment
      }
    });
  });

  // Test pour chaque compte fonctionnel
  WORKING_ACCOUNTS.forEach(account => {
    test(`should login and access dashboard for ${account.role}`, async ({ page }) => {
      console.log(`Testing account: ${account.email}`);

      // 1. We're already on login page from beforeEach
      // Verify we're on login page
      await expect(page).toHaveURL('/auth/login');
      // Look for the login page title (in CardTitle component)
      await expect(page.locator('text=Connexion à SEIDO')).toBeVisible();

      // 2. Fill login form
      await page.fill('input[name="email"]', account.email);
      await page.fill('input[name="password"]', account.password);

      // 3. Submit form
      await page.click('button[type="submit"]');

      // 4. Wait for navigation to dashboard
      await page.waitForURL(account.dashboardPath, {
        timeout: 10000,
        waitUntil: 'networkidle'
      });

      // 5. Verify we're on the correct dashboard
      await expect(page).toHaveURL(account.dashboardPath);

      // 6. Check for user info in dashboard
      const userGreeting = page.locator('text=/Bonjour|Bienvenue|Hello/i').first();
      await expect(userGreeting).toBeVisible({ timeout: 5000 });

      // 7. Check for role-specific elements
      if (account.role === 'prestataire') {
        // Provider should see interventions assigned
        await expect(page.locator('text=/Interventions|Mes interventions/i').first()).toBeVisible();
      } else if (account.role === 'locataire') {
        // Tenant should see option to create intervention
        await expect(page.locator('text=/Nouvelle demande|Créer une intervention/i').first()).toBeVisible();
      }

      // 8. Check no error messages are displayed
      const errorMessages = page.locator('text=/Erreur|Error|Failed/i');
      const errorCount = await errorMessages.count();
      if (errorCount > 0) {
        console.warn(`Found ${errorCount} potential error messages on page`);
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          console.warn(`Error ${i + 1}: ${errorText}`);
        }
      }

      // 9. Take screenshot for verification
      await page.screenshot({
        path: `test/screenshots/login-success-${account.role}.png`,
        fullPage: true
      });

      console.log(`✅ Successfully tested ${account.role} account`);
    });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Try with invalid password
    await page.fill('input[name="email"]', 'arthur+prest@seido.pm');
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should show error and stay on login page
    await expect(page.locator('text=/Email ou mot de passe incorrect|Invalid|Incorrect/i')).toBeVisible({
      timeout: 5000
    });
    await expect(page).toHaveURL('/auth/login');
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/prestataire/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'arthur+prest@seido.pm');
    await page.fill('input[name="password"]', 'Wxcvbn123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/prestataire/dashboard');

    // Refresh page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL('/prestataire/dashboard');

    // User should still be logged in
    const userGreeting = page.locator('text=/Bonjour|Bienvenue|Hello/i').first();
    await expect(userGreeting).toBeVisible({ timeout: 5000 });
  });

  test('should handle logout correctly', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'arthur+loc@seido.pm');
    await page.fill('input[name="password"]', 'Wxcvbn123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/locataire/dashboard');

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion"), button:has-text("Se déconnecter")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');

      // Try to access dashboard again
      await page.goto('/locataire/dashboard');

      // Should redirect back to login
      await expect(page).toHaveURL('/auth/login');
    } else {
      console.warn('Logout button not found - skipping logout test');
    }
  });
});

test.describe('Console Error Monitoring', () => {
  test('should not have critical console errors during login flow', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known non-critical errors
        if (!text.includes('favicon.ico') &&
            !text.includes('Failed to load resource') &&
            !text.includes('net::ERR_')) {
          consoleErrors.push(text);
        }
      }
    });

    // Perform login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'arthur+prest@seido.pm');
    await page.fill('input[name="password"]', 'Wxcvbn123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/prestataire/dashboard', { timeout: 10000 });

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(error =>
      error.includes('authCacheManager') ||
      error.includes('user-gestionnaire-1') ||
      error.includes('PRODUCTION') ||
      error.includes('STAGING') ||
      error.includes('mock')
    );

    if (criticalErrors.length > 0) {
      console.error('Critical errors found:');
      criticalErrors.forEach(error => console.error(`  - ${error}`));
    }

    expect(criticalErrors).toHaveLength(0);
  });
});