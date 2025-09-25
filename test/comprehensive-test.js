// Comprehensive SEIDO Application Test Script
// Testing all 4 roles and core functionalities

const puppeteer = require('puppeteer');

const TEST_RESULTS = {
  authentication: {},
  dashboards: {},
  workflows: {},
  ui: {},
  performance: {},
  accessibility: {},
  errors: []
};

// Test credentials - 3 comptes configurés dans Supabase
const TEST_USERS = {
  gestionnaire: { email: 'arthur@umumentum.com', password: 'Wxcvbn123' },
  prestataire: { email: 'arthur+prest@seido.pm', password: 'Wxcvbn123' },
  locataire: { email: 'arthur+loc@seido.pm', password: 'Wxcvbn123' }
};

async function testAuthentication(browser) {
  console.log('\n=== Testing Authentication System ===');

  for (const [role, credentials] of Object.entries(TEST_USERS)) {
    console.log(`\nTesting ${role} login...`);
    const page = await browser.newPage();

    try {
      // Navigate to login page
      await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' });

      // Check if login page loads
      const loginPageLoaded = await page.waitForSelector('form', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (!loginPageLoaded) {
        TEST_RESULTS.authentication[role] = {
          status: 'FAIL',
          error: 'Login page did not load'
        };
        await page.close();
        continue;
      }

      // Try to login
      const emailField = await page.$('[type="email"], [name="email"], #email');
      const passwordField = await page.$('[type="password"], [name="password"], #password');

      if (emailField && passwordField) {
        await emailField.type(credentials.email);
        await passwordField.type(credentials.password);

        // Find and click submit button
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();

          // Wait for navigation or error
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
          await new Promise(resolve => setTimeout(resolve, 2000));

          const currentUrl = page.url();
          if (currentUrl.includes('dashboard')) {
            TEST_RESULTS.authentication[role] = {
              status: 'PASS',
              redirectUrl: currentUrl
            };
            console.log(`✓ ${role} login successful`);
          } else {
            // Check for error messages
            const errorMessage = await page.$eval('.error, .alert, [role="alert"]', el => el.textContent)
              .catch(() => 'No error message found');

            TEST_RESULTS.authentication[role] = {
              status: 'FAIL',
              error: errorMessage,
              currentUrl: currentUrl
            };
            console.log(`✗ ${role} login failed: ${errorMessage}`);
          }
        } else {
          TEST_RESULTS.authentication[role] = {
            status: 'FAIL',
            error: 'Submit button not found'
          };
        }
      } else {
        TEST_RESULTS.authentication[role] = {
          status: 'FAIL',
          error: 'Login form fields not found'
        };
      }

      await page.close();
    } catch (error) {
      TEST_RESULTS.authentication[role] = {
        status: 'ERROR',
        error: error.message
      };
      console.error(`✗ Error testing ${role}:`, error.message);
      await page.close();
    }
  }
}

async function testDashboards(browser) {
  console.log('\n=== Testing Dashboard Functionality ===');

  const dashboardUrls = {
    gestionnaire: '/gestionnaire/dashboard',
    prestataire: '/prestataire/dashboard',
    locataire: '/locataire/dashboard'
  };

  for (const [role, url] of Object.entries(dashboardUrls)) {
    console.log(`\nTesting ${role} dashboard...`);
    const page = await browser.newPage();

    try {
      await page.goto(`http://localhost:3000${url}`, { waitUntil: 'networkidle0' });

      // Check if dashboard loads (or redirects to login)
      await new Promise(resolve => setTimeout(resolve, 2000));
      const currentUrl = page.url();

      if (currentUrl.includes('auth/login')) {
        TEST_RESULTS.dashboards[role] = {
          status: 'INFO',
          message: 'Redirected to login (authentication required)'
        };
      } else if (currentUrl.includes(url)) {
        // Check for key dashboard elements
        const elements = {
          header: await page.$('header, nav, [role="navigation"]'),
          mainContent: await page.$('main, [role="main"], .dashboard'),
          cards: await page.$$('.card, [class*="card"], [class*="Card"]')
        };

        TEST_RESULTS.dashboards[role] = {
          status: 'PASS',
          elements: {
            hasHeader: !!elements.header,
            hasMainContent: !!elements.mainContent,
            cardCount: elements.cards.length
          }
        };
        console.log(`✓ ${role} dashboard loaded with ${elements.cards.length} cards`);
      } else {
        TEST_RESULTS.dashboards[role] = {
          status: 'FAIL',
          error: 'Unexpected redirect',
          redirectedTo: currentUrl
        };
      }

      await page.close();
    } catch (error) {
      TEST_RESULTS.dashboards[role] = {
        status: 'ERROR',
        error: error.message
      };
      console.error(`✗ Error testing ${role} dashboard:`, error.message);
      await page.close();
    }
  }
}

async function testUIResponsiveness(browser) {
  console.log('\n=== Testing UI Responsiveness ===');

  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
  ];

  const page = await browser.newPage();

  for (const viewport of viewports) {
    console.log(`\nTesting ${viewport.name} viewport...`);

    try {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

      // Check for responsive elements
      const isResponsive = await page.evaluate(() => {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        const hasOverflow = computedStyle.overflowX === 'hidden' || computedStyle.overflowX === 'auto';
        const viewportWidth = window.innerWidth;
        const contentWidth = body.scrollWidth;

        return {
          hasOverflow,
          viewportWidth,
          contentWidth,
          fitsViewport: contentWidth <= viewportWidth + 5 // 5px tolerance
        };
      });

      TEST_RESULTS.ui[viewport.name] = {
        status: isResponsive.fitsViewport ? 'PASS' : 'FAIL',
        details: isResponsive
      };

      console.log(`${isResponsive.fitsViewport ? '✓' : '✗'} ${viewport.name}: Content ${isResponsive.fitsViewport ? 'fits' : 'overflows'} viewport`);
    } catch (error) {
      TEST_RESULTS.ui[viewport.name] = {
        status: 'ERROR',
        error: error.message
      };
      console.error(`✗ Error testing ${viewport.name}:`, error.message);
    }
  }

  await page.close();
}

async function testPerformance(browser) {
  console.log('\n=== Testing Performance ===');

  const page = await browser.newPage();

  try {
    // Enable performance metrics
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.performanceMetrics.push(entry);
        }
      });
      observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
    });

    const startTime = Date.now();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : null,
        loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : null,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
      };
    });

    TEST_RESULTS.performance = {
      status: loadTime < 3000 ? 'PASS' : 'WARN',
      loadTime: `${loadTime}ms`,
      metrics
    };

    console.log(`✓ Page load time: ${loadTime}ms`);
    console.log(`  - DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  - First Paint: ${metrics.firstPaint}ms`);
    console.log(`  - First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
  } catch (error) {
    TEST_RESULTS.performance = {
      status: 'ERROR',
      error: error.message
    };
    console.error('✗ Error testing performance:', error.message);
  }

  await page.close();
}

async function testAccessibility(browser) {
  console.log('\n=== Testing Accessibility ===');

  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    const accessibilityChecks = await page.evaluate(() => {
      const checks = {
        hasLangAttribute: !!document.documentElement.lang,
        hasTitle: !!document.title,
        imagesHaveAlt: true,
        formsHaveLabels: true,
        hasHeadings: false,
        hasSkipLink: false,
        buttonsHaveText: true
      };

      // Check images for alt text
      const images = document.querySelectorAll('img');
      for (const img of images) {
        if (!img.alt && !img.getAttribute('aria-label')) {
          checks.imagesHaveAlt = false;
          break;
        }
      }

      // Check form inputs for labels
      const inputs = document.querySelectorAll('input, select, textarea');
      for (const input of inputs) {
        if (input.type === 'hidden') continue;
        const hasLabel = !!input.labels?.length ||
                        !!input.getAttribute('aria-label') ||
                        !!input.getAttribute('aria-labelledby');
        if (!hasLabel) {
          checks.formsHaveLabels = false;
          break;
        }
      }

      // Check for headings
      checks.hasHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;

      // Check for skip link
      checks.hasSkipLink = !!document.querySelector('a[href="#main"], a[href="#content"]');

      // Check buttons have text
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
          checks.buttonsHaveText = false;
          break;
        }
      }

      return checks;
    });

    TEST_RESULTS.accessibility = {
      status: Object.values(accessibilityChecks).every(v => v) ? 'PASS' : 'WARN',
      checks: accessibilityChecks
    };

    for (const [check, passed] of Object.entries(accessibilityChecks)) {
      console.log(`${passed ? '✓' : '✗'} ${check}: ${passed ? 'Pass' : 'Fail'}`);
    }
  } catch (error) {
    TEST_RESULTS.accessibility = {
      status: 'ERROR',
      error: error.message
    };
    console.error('✗ Error testing accessibility:', error.message);
  }

  await page.close();
}

async function runAllTests() {
  console.log('Starting SEIDO Comprehensive Test Suite');
  console.log('=' . repeat(50));

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await testAuthentication(browser);
    await testDashboards(browser);
    await testUIResponsiveness(browser);
    await testPerformance(browser);
    await testAccessibility(browser);
  } catch (error) {
    console.error('Fatal error during testing:', error);
    TEST_RESULTS.errors.push({
      type: 'FATAL',
      message: error.message,
      stack: error.stack
    });
  } finally {
    await browser.close();

    // Generate report
    console.log('\n' + '=' . repeat(50));
    console.log('TEST RESULTS SUMMARY');
    console.log('=' . repeat(50));
    console.log(JSON.stringify(TEST_RESULTS, null, 2));

    // Save results to file
    const fs = require('fs');
    fs.writeFileSync(
      'test-results.json',
      JSON.stringify(TEST_RESULTS, null, 2)
    );
    console.log('\nTest results saved to test-results.json');
  }
}

// Check if running directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, TEST_RESULTS };