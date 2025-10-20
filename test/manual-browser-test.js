/**
 * Test manuel pour vérifier l'état du serveur et de l'authentification
 */

const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Démarrage du test manuel...\n');

  const browser = await chromium.launch({
    headless: false, // Mode visible pour debug
    slowMo: 500 // Ralentir pour voir ce qui se passe
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    // Test 1: Page d'accueil
    console.log('📍 Test 1: Accès à la page d\'accueil...');
    const response = await page.goto('http://localhost:3020', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    console.log(`   Status: ${response?.status()}`);
    console.log(`   URL finale: ${page.url()}\n`);

    // Capture screenshot
    await page.screenshot({
      path: 'test/screenshots/manual-1-home.png'
    });

    // Test 2: Page de login
    console.log('📍 Test 2: Accès à la page de login...');
    await page.goto('http://localhost:3020/auth/login', {
      waitUntil: 'domcontentloaded'
    });
    console.log(`   URL: ${page.url()}`);

    // Vérifier les éléments
    const hasEmail = await page.locator('input[type="email"]').count() > 0;
    const hasPassword = await page.locator('input[type="password"]').count() > 0;
    const hasSubmit = await page.locator('button[type="submit"]').count() > 0;

    console.log(`   Email input: ${hasEmail ? '✅' : '❌'}`);
    console.log(`   Password input: ${hasPassword ? '✅' : '❌'}`);
    console.log(`   Submit button: ${hasSubmit ? '✅' : '❌'}\n`);

    await page.screenshot({
      path: 'test/screenshots/manual-2-login.png'
    });

    // Test 3: Tentative de login Admin
    console.log('📍 Test 3: Login Admin (arthur@umumentum.com)...');
    if (hasEmail && hasPassword && hasSubmit) {
      await page.fill('input[type="email"]', 'arthur@umumentum.com');
      await page.fill('input[type="password"]', 'Wxcvbn123');

      await page.screenshot({
        path: 'test/screenshots/manual-3a-filled.png'
      });

      await page.click('button[type="submit"]');

      // Attendre un peu
      await page.waitForTimeout(5000);

      console.log(`   URL après login: ${page.url()}`);

      await page.screenshot({
        path: 'test/screenshots/manual-3b-after-login.png'
      });

      // Vérifier si on est sur le dashboard
      if (page.url().includes('/admin/dashboard')) {
        console.log(`   ✅ Login réussi - Dashboard admin accessible\n`);
      } else if (page.url().includes('/auth/login')) {
        console.log(`   ❌ Login échoué - Toujours sur la page de login`);

        // Chercher un message d'erreur
        const errorText = await page.locator('text=/error|invalid|incorrect/i').textContent().catch(() => null);
        if (errorText) {
          console.log(`   Message d'erreur: ${errorText}\n`);
        }
      } else {
        console.log(`   ⚠️ Redirection inattendue\n`);
      }
    }

    // Test 4: Tentative de login Gestionnaire
    console.log('📍 Test 4: Login Gestionnaire (arthur+gest@seido.pm)...');
    await page.goto('http://localhost:3020/auth/login');
    await page.fill('input[type="email"]', 'arthur+gest@seido.pm');
    await page.fill('input[type="password"]', 'Wxcvbn123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    console.log(`   URL après login: ${page.url()}`);
    if (page.url().includes('/gestionnaire/dashboard')) {
      console.log(`   ✅ Login réussi - Dashboard gestionnaire accessible\n`);
    } else {
      console.log(`   ❌ Login échoué\n`);
    }

    await page.screenshot({
      path: 'test/screenshots/manual-4-gestionnaire.png'
    });

    // Test 5: Tentative de login Locataire
    console.log('📍 Test 5: Login Locataire (arthur+loc@seido.pm)...');
    await page.goto('http://localhost:3020/auth/login');
    await page.fill('input[type="email"]', 'arthur+loc@seido.pm');
    await page.fill('input[type="password"]', 'Wxcvbn123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    console.log(`   URL après login: ${page.url()}`);
    if (page.url().includes('/locataire/dashboard')) {
      console.log(`   ✅ Login réussi - Dashboard locataire accessible\n`);
    } else {
      console.log(`   ❌ Login échoué\n`);
    }

    await page.screenshot({
      path: 'test/screenshots/manual-5-locataire.png'
    });

    console.log('\n✅ Test manuel terminé. Vérifiez les screenshots dans test/screenshots/');

  } catch (error) {
    console.error('❌ Erreur pendant le test:', error.message);
    await page.screenshot({
      path: 'test/screenshots/manual-error.png'
    });
  }

  // Garder le navigateur ouvert pour inspection manuelle
  console.log('\n⏸️ Navigateur restera ouvert 30 secondes pour inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
})();