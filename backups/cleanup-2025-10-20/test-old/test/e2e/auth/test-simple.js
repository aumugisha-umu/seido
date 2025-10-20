// Test simple pour vérifier la connexion
const puppeteer = require('puppeteer');

async function testSimple() {
  console.log('Starting simple test...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  try {
    const page = await browser.newPage();

    console.log('1. Navigating to http://localhost:3000/auth/login');
    const response = await page.goto('http://localhost:3000/auth/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('   Response status:', response.status());
    console.log('   URL:', page.url());

    // Take screenshot
    await page.screenshot({ path: 'test-login-page.png' });
    console.log('   Screenshot saved as test-login-page.png');

    // Check page title
    const title = await page.title();
    console.log('   Page title:', title);

    // Check for any content
    const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 200));
    console.log('   Body HTML (first 200 chars):', bodyHTML);

    // Try to find any input
    const inputs = await page.evaluate(() => {
      const allInputs = document.querySelectorAll('input');
      return Array.from(allInputs).map(input => ({
        type: input.type,
        id: input.id,
        name: input.name,
        placeholder: input.placeholder
      }));
    });
    console.log('   Found inputs:', inputs);

    // Try to find the email input specifically
    const emailInput = await page.$('input#email');
    if (emailInput) {
      console.log('2. Email input found! Typing test email...');
      await page.type('input#email', 'arthur@umumentum.com');

      const passwordInput = await page.$('input#password');
      if (passwordInput) {
        console.log('3. Password input found! Typing test password...');
        await page.type('input#password', 'Wxcvbn123');

        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          console.log('4. Submit button found!');

          // Click and wait for navigation
          console.log('5. Clicking submit button...');
          await submitButton.click();

          // Wait a bit for navigation
          await new Promise(resolve => setTimeout(resolve, 3000));

          console.log('   New URL:', page.url());

          // Take screenshot after submit
          await page.screenshot({ path: 'test-after-submit.png' });
          console.log('   Screenshot saved as test-after-submit.png');
        } else {
          console.log('❌ Submit button NOT found');
        }
      } else {
        console.log('❌ Password input NOT found');
      }
    } else {
      console.log('❌ Email input NOT found');

      // Try alternative selectors
      console.log('\nTrying alternative selectors...');
      const altEmail = await page.$('input[type="email"]');
      if (altEmail) {
        console.log('✅ Found input[type="email"]');
      }
    }

    console.log('\n✅ Test completed - check screenshots for visual confirmation');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Keep browser open for 5 seconds to see results
    console.log('\nClosing browser in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

testSimple();