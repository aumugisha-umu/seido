const { chromium } = require('playwright');

async function quickAuthTest() {
  console.log('🧪 QUICK AUTH TEST - Phase 1 Validation');
  console.log('=====================================');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. Test de base - Page de login accessible
    console.log('📍 Step 1: Testing login page accessibility...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForSelector('#email', { timeout: 5000 });
    console.log('✅ Login page loaded successfully');

    // 2. Test d'authentification gestionnaire
    console.log('📍 Step 2: Testing gestionnaire authentication...');
    await page.fill('#email', 'arthur@umumentum.com');
    await page.fill('#password', 'Wxcvbn123');

    // Screenshot avant submit
    await page.screenshot({ path: 'test-auth-before.png' });

    console.log('📍 Step 3: Submitting login form...');
    await page.click('button[type="submit"]');

    // Attendre 3 secondes pour voir ce qui se passe
    await page.waitForTimeout(3000);

    // Screenshot après submit
    await page.screenshot({ path: 'test-after-submit.png' });

    // Vérifier l'URL actuelle
    const currentUrl = page.url();
    console.log(`📍 Current URL after submit: ${currentUrl}`);

    // Vérifier si on a été redirigé
    if (currentUrl.includes('/gestionnaire/')) {
      console.log('✅ Successfully redirected to gestionnaire dashboard!');
    } else if (currentUrl.includes('/auth/login')) {
      console.log('❌ Still on login page - authentication failed');

      // Vérifier les erreurs dans la console
      const logs = await page.evaluate(() => {
        return window.console.logs || [];
      });
      console.log('Browser console logs:', logs);
    } else {
      console.log('⚠️ Unexpected URL:', currentUrl);
    }

    // Test middleware protection
    console.log('📍 Step 4: Testing middleware protection...');
    await page.goto('http://localhost:3000/prestataire/dashboard');
    await page.waitForTimeout(2000);

    const protectedUrl = page.url();
    console.log(`📍 URL after accessing protected route: ${protectedUrl}`);

    if (protectedUrl.includes('/auth/login')) {
      console.log('✅ Middleware protection working - redirected to login');
    } else {
      console.log('❌ Middleware protection failed - not redirected');
    }

    console.log('\n🎯 QUICK TEST COMPLETED');
    console.log('=========================');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
  }
}

// Exécuter le test
quickAuthTest().catch(console.error);