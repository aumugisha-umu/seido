// Debug complet du flow d'authentification
const puppeteer = require('puppeteer');

async function debugAuthFlow() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 },
    slowMo: 50
  });

  const testAccount = {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    role: 'gestionnaire'
  };

  try {
    const page = await browser.newPage();

    // Enhanced console logging
    page.on('console', msg => console.log('Browser Console:', msg.text()));

    // Monitor all API responses
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/')) {
        const status = response.status();
        console.log(`API Response: ${url} - Status: ${status}`);

        if (url.includes('/api/auth/login')) {
          try {
            const data = await response.json();
            console.log('Login Response Data:', JSON.stringify(data, null, 2));
          } catch (e) {
            console.log('Could not parse login response');
          }
        }
      }
    });

    console.log('1. Going to login page...');
    await page.goto('http://localhost:3000/auth/login', {
      waitUntil: 'networkidle2'
    });

    console.log('2. Typing credentials...');
    await page.type('input#email', testAccount.email);
    await page.type('input#password', testAccount.password);

    console.log('3. Clicking submit...');

    // Set up promise to wait for response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/login'),
      { timeout: 5000 }
    );

    await page.click('button[type="submit"]');

    // Wait for API response
    const loginResponse = await responsePromise;
    console.log('4. Login API Response Status:', loginResponse.status());

    // Wait a bit for any redirects
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check URL
    const currentUrl = page.url();
    console.log('5. Current URL after login:', currentUrl);

    // Check for cookies
    const cookies = await page.cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token');
    console.log('6. Auth cookie present:', !!authCookie);
    if (authCookie) {
      console.log('   Cookie details:', {
        name: authCookie.name,
        domain: authCookie.domain,
        path: authCookie.path,
        httpOnly: authCookie.httpOnly,
        secure: authCookie.secure,
        sameSite: authCookie.sameSite
      });
    }

    // Check localStorage/sessionStorage
    const storageData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage)
      };
    });
    console.log('7. Storage keys:', storageData);

    // Check for AUTH_READY flag
    const authReady = await page.evaluate(() => window.__AUTH_READY__);
    console.log('8. AUTH_READY flag:', authReady);

    // Try manual navigation to dashboard
    console.log('9. Manually navigating to dashboard...');
    await page.goto('http://localhost:3000/gestionnaire/dashboard', {
      waitUntil: 'networkidle2'
    });

    const dashboardUrl = page.url();
    console.log('10. URL after manual navigation:', dashboardUrl);

    if (dashboardUrl.includes('/gestionnaire/dashboard')) {
      console.log('✅ SUCCESS: Access to dashboard granted!');
    } else {
      console.log('❌ FAILED: Redirected away from dashboard');
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser will close in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

console.log('🔍 Starting authentication flow debug...\n');
debugAuthFlow();