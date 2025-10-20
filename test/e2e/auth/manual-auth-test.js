// Test manuel pour vérifier l'authentification en temps réel
const puppeteer = require('puppeteer');

async function testManualAuth() {
  const browser = await puppeteer.launch({
    headless: false, // Voir le navigateur
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 },
    slowMo: 100 // Ralentir pour voir ce qui se passe
  });

  const testAccount = {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    role: 'gestionnaire'
  };

  try {
    const page = await browser.newPage();

    // Log console messages
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('ERROR') || msg.text().includes('❌')) {
        console.log('🔴 Console Error:', msg.text());
      } else if (msg.text().includes('AUTH') || msg.text().includes('LOGIN')) {
        console.log('🔵 Console Log:', msg.text());
      }
    });

    // Log network errors
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        console.log(`🔴 API Error ${response.status()} on ${response.url()}`);
      }
    });

    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Login page loaded');

    // Clear any existing values first
    await page.evaluate(() => {
      const emailInput = document.querySelector('input#email');
      const passwordInput = document.querySelector('input#password');
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
    });

    // Type email
    console.log(`📝 Typing email: ${testAccount.email}`);
    await page.focus('input#email');
    await page.keyboard.type(testAccount.email, { delay: 50 });

    // Type password
    console.log(`📝 Typing password: ${testAccount.password}`);
    await page.focus('input#password');
    await page.keyboard.type(testAccount._password, { delay: 50 });

    // Wait a moment before clicking
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('🔐 Clicking submit button...');

    // Monitor navigation
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle2',
      timeout: 10000
    }).catch(err => {
      console.log('⚠️ Navigation timeout or error:', err.message);
      return null;
    });

    // Click submit
    await page.click('button[type="submit"]');

    // Wait for navigation or timeout
    const navResult = await navigationPromise;

    if (navResult) {
      console.log('✅ Navigation completed');
    }

    // Check current URL after some time
    await new Promise(resolve => setTimeout(resolve, 3000));

    const currentURL = page.url();
    console.log(`📍 Current URL: ${currentURL}`);

    // Check if redirected to dashboard
    if (currentURL.includes('/gestionnaire/dashboard')) {
      console.log('✅ SUCCESS: Redirected to gestionnaire dashboard!');

      // Check for AUTH_READY flag
      const authReady = await page.evaluate(() => window.__AUTH_READY__);
      console.log(`🔒 AUTH_READY flag: ${authReady}`);

      // Check for user data
      const userData = await page.evaluate(() => {
        const userElement = document.querySelector('[data-testid="user-email"], [data-testid="user-info"], .user-email');
        return userElement ? userElement.textContent : null;
      });
      console.log(`👤 User data displayed: ${userData}`);

    } else if (currentURL.includes('/auth/login')) {
      console.log('❌ FAILED: Still on login page');

      // Check for error messages
      const errorMessage = await page.evaluate(() => {
        const alert = document.querySelector('[role="alert"], .alert-destructive');
        return alert ? alert.textContent : null;
      });

      if (errorMessage) {
        console.log(`⚠️ Error message: ${errorMessage}`);
      }

      // Check form values
      const formData = await page.evaluate(() => {
        return {
          email: document.querySelector('input#email')?.value,
          password: document.querySelector('input#password')?.value
        };
      });
      console.log('📝 Form data after submit:', formData);

    } else {
      console.log(`❓ Unexpected URL: ${currentURL}`);
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-manual-auth-result.png' });
    console.log('📸 Screenshot saved as test-manual-auth-result.png');

    console.log('\n🔍 Test complete. Browser will remain open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

console.log('🚀 Starting manual authentication test...\n');
testManualAuth();