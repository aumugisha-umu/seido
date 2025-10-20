const { chromium } = require('playwright');

async function testAuthFix() {
  console.log('🧪 TEST AUTH FIX - Phase 1');
  console.log('============================');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. Test avec session vide - doit rediriger vers login
    console.log('📍 Step 1: Clean session test...');
    await page.goto('http://localhost:3000/prestataire/dashboard');
    await page.waitForTimeout(2000);

    let currentUrl = page.url();
    console.log(`After accessing protected route: ${currentUrl}`);

    if (currentUrl.includes('/auth/login')) {
      console.log('✅ Middleware protection: WORKING');
    } else {
      console.log('❌ Middleware protection: FAILED');
    }

    // 2. Test de login
    console.log('📍 Step 2: Login test...');
    if (!currentUrl.includes('/auth/login')) {
      await page.goto('http://localhost:3000/auth/login');
    }

    await page.waitForSelector('#email', { timeout: 5000 });
    await page.fill('#email', 'arthur@umumentum.com');
    await page.fill('#password', 'Wxcvbn123');

    console.log('📍 Step 3: Submit form...');
    await page.click('button[type="submit"]');

    // Attendre redirection (avec timeout plus long)
    await page.waitForTimeout(5000);

    currentUrl = page.url();
    console.log(`After login submit: ${currentUrl}`);

    if (currentUrl.includes('/gestionnaire/dashboard')) {
      console.log('✅ Login & Redirect: WORKING');
    } else if (currentUrl.includes('/auth/login')) {
      console.log('❌ Login: FAILED - Still on login page');
    } else {
      console.log(`⚠️ Login: UNEXPECTED URL - ${currentUrl}`);
    }

    // 3. Test sécurité rôles
    console.log('📍 Step 4: Role security test...');
    await page.goto('http://localhost:3000/locataire/dashboard');
    await page.waitForTimeout(2000);

    currentUrl = page.url();
    console.log(`After accessing different role: ${currentUrl}`);

    if (currentUrl.includes('/gestionnaire/dashboard')) {
      console.log('✅ Role security: WORKING - Stayed on gestionnaire');
    } else if (currentUrl.includes('/locataire/dashboard')) {
      console.log('❌ Role security: FAILED - Can access other role');
    }

    // Final result
    console.log('\n🎯 FINAL RESULT:');
    if (currentUrl.includes('/gestionnaire/dashboard')) {
      console.log('✅ PHASE 1 AUTH: SUCCESS!');
    } else {
      console.log('❌ PHASE 1 AUTH: Issues remain');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testAuthFix().catch(console.error);