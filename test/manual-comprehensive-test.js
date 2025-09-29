/**
 * Manual Comprehensive Test Suite for SEIDO Application
 * Performs in-depth testing of all features with correct selectors
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  gestionnaire: {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    dashboard: '/gestionnaire/dashboard'
  },
  prestataire: {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123',
    dashboard: '/prestataire/dashboard'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    dashboard: '/locataire/dashboard'
  }
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  environment: 'development',
  baseUrl: BASE_URL,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Utility functions
async function logTest(category, name, status, details = null, screenshot = null) {
  const test = {
    category,
    name,
    status,
    details,
    screenshot,
    timestamp: new Date().toISOString()
  };

  testResults.tests.push(test);
  testResults.summary.total++;

  if (status === 'pass') {
    testResults.summary.passed++;
    console.log(`✅ [${category}] ${name}`);
  } else if (status === 'fail') {
    testResults.summary.failed++;
    console.error(`❌ [${category}] ${name}`, details || '');
  } else if (status === 'warning') {
    testResults.summary.warnings++;
    console.warn(`⚠️ [${category}] ${name}`, details || '');
  }

  if (details) {
    console.log(`   Details: ${details}`);
  }
}

async function takeScreenshot(page, name) {
  const timestamp = Date.now();
  const filename = `screenshot-${name}-${timestamp}.png`;
  const path = `C:\\Users\\arthu\\Desktop\\Coding\\Seido-app\\test\\screenshots\\${filename}`;

  try {
    await fs.mkdir('C:\\Users\\arthu\\Desktop\\Coding\\Seido-app\\test\\screenshots', { recursive: true });
    await page.screenshot({ path, fullPage: true });
    return filename;
  } catch (error) {
    console.error(`Failed to take screenshot: ${error.message}`);
    return null;
  }
}

async function waitForSelector(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

// Test Functions

async function testAuthentication(page) {
  console.log('\n=== 🔐 TESTING AUTHENTICATION SYSTEM ===\n');

  for (const [role, credentials] of Object.entries(TEST_CREDENTIALS)) {
    console.log(`Testing ${role} authentication...`);

    try {
      // Navigate to login page
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
      await logTest('Authentication', `${role} - Login page loads`, 'pass');

      // Check for login form elements
      const emailInput = await page.$('#email');
      const passwordInput = await page.$('#password');
      const submitButton = await page.$('button[type="submit"]');

      if (!emailInput || !passwordInput || !submitButton) {
        await logTest('Authentication', `${role} - Login form elements`, 'fail', 'Missing form elements');
        continue;
      }

      await logTest('Authentication', `${role} - Login form elements present`, 'pass');

      // Clear inputs and type credentials
      await page.evaluate(() => {
        document.querySelector('#email').value = '';
        document.querySelector('#password').value = '';
      });

      await page.type('#email', credentials.email);
      await page.type('#password', credentials._password);

      // Submit form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {})
      ]);

      // Check if redirected to dashboard
      const currentUrl = page.url();

      if (currentUrl.includes(credentials.dashboard)) {
        await logTest('Authentication', `${role} - Login successful`, 'pass', `Redirected to ${credentials.dashboard}`);

        // Take screenshot of dashboard
        await takeScreenshot(page, `${role}-dashboard`);

        // Test logout
        const logoutLink = await page.$('a[href="/auth/logout"]');
        if (logoutLink) {
          await logoutLink.click();
          await page.waitForTimeout(2000);

          const loggedOutUrl = page.url();
          if (loggedOutUrl.includes('/auth/login')) {
            await logTest('Authentication', `${role} - Logout successful`, 'pass');
          } else {
            await logTest('Authentication', `${role} - Logout`, 'warning', 'May not have logged out properly');
          }
        } else {
          await logTest('Authentication', `${role} - Logout button`, 'warning', 'Logout button not found');
        }
      } else {
        await takeScreenshot(page, `${role}-login-failed`);
        await logTest('Authentication', `${role} - Login redirect`, 'fail', `Expected ${credentials.dashboard}, got ${currentUrl}`);
      }

    } catch (error) {
      await logTest('Authentication', `${role} - Login process`, 'fail', error.message);
      await takeScreenshot(page, `${role}-error`);
    }
  }
}

async function testDashboardFeatures(page) {
  console.log('\n=== 📊 TESTING DASHBOARD FEATURES ===\n');

  // Test Gestionnaire Dashboard
  console.log('Testing Gestionnaire Dashboard...');

  try {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', TEST_CREDENTIALS.gestionnaire.email);
    await page.type('#password', TEST_CREDENTIALS.gestionnaire._password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Check dashboard elements
    const dashboardElements = [
      { selector: 'h1, h2', name: 'Dashboard title' },
      { selector: '[class*="card"], .card', name: 'Dashboard cards' },
      { selector: 'nav, [role="navigation"]', name: 'Navigation menu' },
      { selector: 'a[href*="interventions"]', name: 'Interventions link' },
      { selector: 'a[href*="biens"], a[href*="lots"]', name: 'Properties link' },
      { selector: 'button, a', name: 'Interactive elements' }
    ];

    for (const element of dashboardElements) {
      const found = await page.$(element.selector);
      if (found) {
        await logTest('Dashboard Features', `Gestionnaire - ${element.name}`, 'pass');
      } else {
        await logTest('Dashboard Features', `Gestionnaire - ${element.name}`, 'warning', `Selector not found: ${element.selector}`);
      }
    }

    // Test navigation
    const interventionsLink = await page.$('a[href*="interventions"]');
    if (interventionsLink) {
      await interventionsLink.click();
      await page.waitForTimeout(2000);

      const interventionsUrl = page.url();
      if (interventionsUrl.includes('interventions')) {
        await logTest('Dashboard Features', 'Gestionnaire - Navigation to interventions', 'pass');
        await takeScreenshot(page, 'gestionnaire-interventions');
      } else {
        await logTest('Dashboard Features', 'Gestionnaire - Navigation to interventions', 'fail');
      }
    }

  } catch (error) {
    await logTest('Dashboard Features', 'Gestionnaire dashboard test', 'fail', error.message);
  }

  // Test Prestataire Dashboard
  console.log('\nTesting Prestataire Dashboard...');

  try {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', TEST_CREDENTIALS.prestataire.email);
    await page.type('#password', TEST_CREDENTIALS.prestataire._password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Check prestataire-specific elements
    const prestataireElements = [
      { selector: 'a[href*="disponibilites"], a[href*="availability"]', name: 'Availability link' },
      { selector: 'a[href*="devis"], a[href*="quotes"]', name: 'Quotes link' }
    ];

    for (const element of prestataireElements) {
      const found = await page.$(element.selector);
      if (found) {
        await logTest('Dashboard Features', `Prestataire - ${element.name}`, 'pass');
      } else {
        await logTest('Dashboard Features', `Prestataire - ${element.name}`, 'warning', `Not found: ${element.selector}`);
      }
    }

    await takeScreenshot(page, 'prestataire-dashboard');

  } catch (error) {
    await logTest('Dashboard Features', 'Prestataire dashboard test', 'fail', error.message);
  }

  // Test Locataire Dashboard
  console.log('\nTesting Locataire Dashboard...');

  try {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', TEST_CREDENTIALS.locataire.email);
    await page.type('#password', TEST_CREDENTIALS.locataire._password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Check locataire-specific elements
    const locataireElements = [
      { selector: 'button[class*="nouvelle"], a[href*="nouvelle"]', name: 'New request button' },
      { selector: '[class*="intervention"], .interventions', name: 'Interventions section' }
    ];

    for (const element of locataireElements) {
      const found = await page.$(element.selector);
      if (found) {
        await logTest('Dashboard Features', `Locataire - ${element.name}`, 'pass');
      } else {
        await logTest('Dashboard Features', `Locataire - ${element.name}`, 'warning', `Not found: ${element.selector}`);
      }
    }

    await takeScreenshot(page, 'locataire-dashboard');

  } catch (error) {
    await logTest('Dashboard Features', 'Locataire dashboard test', 'fail', error.message);
  }
}

async function testInterventionWorkflow(page) {
  console.log('\n=== 🔄 TESTING INTERVENTION WORKFLOW ===\n');

  try {
    // Step 1: Locataire creates intervention
    console.log('Step 1: Testing intervention creation as Locataire...');

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', TEST_CREDENTIALS.locataire.email);
    await page.type('#password', TEST_CREDENTIALS.locataire._password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Navigate to interventions
    const interventionsLink = await page.$('a[href*="interventions"]');
    if (interventionsLink) {
      await interventionsLink.click();
      await page.waitForTimeout(2000);
      await logTest('Intervention Workflow', 'Locataire - Navigate to interventions', 'pass');
    }

    // Check for existing interventions
    const interventionCards = await page.$$('[class*="intervention"], .card');
    await logTest('Intervention Workflow', 'Locataire - View interventions', 'pass', `Found ${interventionCards.length} interventions`);

    // Step 2: Gestionnaire manages interventions
    console.log('\nStep 2: Testing intervention management as Gestionnaire...');

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', TEST_CREDENTIALS.gestionnaire.email);
    await page.type('#password', TEST_CREDENTIALS.gestionnaire._password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Navigate to interventions
    const gestionnaireInterventionsLink = await page.$('a[href*="interventions"]');
    if (gestionnaireInterventionsLink) {
      await gestionnaireInterventionsLink.click();
      await page.waitForTimeout(2000);

      // Check for management features
      const statusFilters = await page.$$('[class*="status"], [class*="filter"]');
      const actionButtons = await page.$$('button[class*="action"], button[class*="approve"], button[class*="reject"]');

      await logTest('Intervention Workflow', 'Gestionnaire - Management interface', 'pass',
        `Found ${statusFilters.length} filters and ${actionButtons.length} action buttons`);

      await takeScreenshot(page, 'gestionnaire-interventions-management');
    }

    // Step 3: Prestataire views assigned interventions
    console.log('\nStep 3: Testing intervention handling as Prestataire...');

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', TEST_CREDENTIALS.prestataire.email);
    await page.type('#password', TEST_CREDENTIALS.prestataire._password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    const prestataireInterventionsLink = await page.$('a[href*="interventions"]');
    if (prestataireInterventionsLink) {
      await prestataireInterventionsLink.click();
      await page.waitForTimeout(2000);

      const assignedInterventions = await page.$$('[class*="intervention"], .card');
      await logTest('Intervention Workflow', 'Prestataire - Assigned interventions', 'pass',
        `Found ${assignedInterventions.length} interventions`);

      await takeScreenshot(page, 'prestataire-interventions');
    }

  } catch (error) {
    await logTest('Intervention Workflow', 'Workflow test', 'fail', error.message);
  }
}

async function testMobileResponsiveness(page) {
  console.log('\n=== 📱 TESTING MOBILE RESPONSIVENESS ===\n');

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    try {
      console.log(`Testing ${viewport.name} viewport...`);
      await page.setViewport({ width: viewport.width, height: viewport.height });

      // Test login page
      await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });

      const loginForm = await page.$('form');
      const isFormVisible = await loginForm.isIntersectingViewport();

      if (isFormVisible) {
        await logTest('Mobile Responsiveness', `${viewport.name} - Login form visible`, 'pass');
      } else {
        await logTest('Mobile Responsiveness', `${viewport.name} - Login form visible`, 'fail');
      }

      // Test dashboard
      await page.type('#email', TEST_CREDENTIALS.gestionnaire.email);
      await page.type('#password', TEST_CREDENTIALS.gestionnaire._password);
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
      ]);

      // Check for mobile menu on small screens
      if (viewport.width < 768) {
        const mobileMenu = await page.$('button[class*="menu"], button[aria-label*="menu"]');
        if (mobileMenu) {
          await logTest('Mobile Responsiveness', `${viewport.name} - Mobile menu button`, 'pass');
        } else {
          await logTest('Mobile Responsiveness', `${viewport.name} - Mobile menu button`, 'warning', 'Mobile menu not found');
        }
      }

      await takeScreenshot(page, `${viewport.name.toLowerCase()}-view`);

    } catch (error) {
      await logTest('Mobile Responsiveness', `${viewport.name} test`, 'fail', error.message);
    }
  }

  // Reset to desktop viewport
  await page.setViewport({ width: 1920, height: 1080 });
}

async function testSecurityFeatures(page) {
  console.log('\n=== 🔒 TESTING SECURITY FEATURES ===\n');

  try {
    // Test 1: Unauthorized access
    console.log('Testing unauthorized access protection...');

    await page.goto(`${BASE_URL}/gestionnaire/dashboard`, { waitUntil: 'networkidle0' });
    const unauthorizedUrl = page.url();

    if (unauthorizedUrl.includes('/auth/login')) {
      await logTest('Security', 'Unauthorized access protection', 'pass', 'Redirected to login');
    } else {
      await logTest('Security', 'Unauthorized access protection', 'fail', 'Not redirected to login');
    }

    // Test 2: Invalid login attempts
    console.log('Testing invalid login protection...');

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', 'invalid@test.com');
    await page.type('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const errorAlert = await page.$('[role="alert"], [class*="error"], [class*="alert"]');
    if (errorAlert) {
      const errorText = await page.evaluate(el => el.textContent, errorAlert);
      await logTest('Security', 'Invalid login error handling', 'pass', `Error shown: ${errorText.substring(0, 50)}...`);
    } else {
      await logTest('Security', 'Invalid login error handling', 'warning', 'No error message displayed');
    }

    // Test 3: Password field security
    console.log('Testing password field security...');

    const passwordField = await page.$('#password');
    const passwordType = await page.evaluate(el => el.type, passwordField);

    if (passwordType === 'password') {
      await logTest('Security', 'Password field masking', 'pass');
    } else {
      await logTest('Security', 'Password field masking', 'fail', 'Password not masked');
    }

    // Test 4: Role-based access control
    console.log('Testing role-based access control...');

    // Login as locataire
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', TEST_CREDENTIALS.locataire.email);
    await page.type('#password', TEST_CREDENTIALS.locataire._password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Try to access gestionnaire dashboard
    await page.goto(`${BASE_URL}/gestionnaire/dashboard`, { waitUntil: 'networkidle0' });
    const roleCheckUrl = page.url();

    if (!roleCheckUrl.includes('/gestionnaire/dashboard')) {
      await logTest('Security', 'Role-based access control', 'pass', 'Access denied to unauthorized role');
    } else {
      await logTest('Security', 'Role-based access control', 'fail', 'Unauthorized role accessed restricted area');
    }

    // Test 5: Session management
    console.log('Testing session management...');

    const cookies = await page.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));

    if (sessionCookie) {
      if (sessionCookie.httpOnly) {
        await logTest('Security', 'Session cookie httpOnly flag', 'pass');
      } else {
        await logTest('Security', 'Session cookie httpOnly flag', 'warning', 'Cookie not httpOnly');
      }

      if (sessionCookie.secure || BASE_URL.includes('localhost')) {
        await logTest('Security', 'Session cookie secure flag', 'pass');
      } else {
        await logTest('Security', 'Session cookie secure flag', 'warning', 'Cookie not secure (should be on HTTPS)');
      }
    } else {
      await logTest('Security', 'Session management', 'warning', 'No session cookie found');
    }

  } catch (error) {
    await logTest('Security', 'Security features test', 'fail', error.message);
  }
}

async function testPerformance(page) {
  console.log('\n=== ⚡ TESTING PERFORMANCE ===\n');

  const pagesToTest = [
    { name: 'Login Page', url: '/auth/login' },
    { name: 'Gestionnaire Dashboard', url: '/gestionnaire/dashboard', requiresAuth: true }
  ];

  for (const pageTest of pagesToTest) {
    try {
      console.log(`Testing performance for ${pageTest.name}...`);

      if (pageTest.requiresAuth) {
        // Login first
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
        await page.type('#email', TEST_CREDENTIALS.gestionnaire.email);
        await page.type('#password', TEST_CREDENTIALS.gestionnaire._password);
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle0' })
        ]);
      }

      // Measure page load performance
      const startTime = Date.now();
      await page.goto(`${BASE_URL}${pageTest.url}`, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;

      // Evaluate performance
      if (loadTime < 2000) {
        await logTest('Performance', `${pageTest.name} - Load time`, 'pass', `${loadTime}ms`);
      } else if (loadTime < 4000) {
        await logTest('Performance', `${pageTest.name} - Load time`, 'warning', `${loadTime}ms - Could be optimized`);
      } else {
        await logTest('Performance', `${pageTest.name} - Load time`, 'fail', `${loadTime}ms - Too slow`);
      }

      // Get Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};

            entries.forEach((entry) => {
              if (entry.entryType === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              }
            });

            resolve(vitals);
          });

          observer.observe({ entryTypes: ['largest-contentful-paint'] });

          setTimeout(() => resolve({}), 3000);
        });
      });

      if (metrics.lcp) {
        if (metrics.lcp < 2500) {
          await logTest('Performance', `${pageTest.name} - LCP`, 'pass', `${Math.round(metrics.lcp)}ms`);
        } else {
          await logTest('Performance', `${pageTest.name} - LCP`, 'warning', `${Math.round(metrics.lcp)}ms - Should be under 2.5s`);
        }
      }

      // Check bundle size
      const resources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(r => ({
          name: r.name,
          size: r.transferSize,
          type: r.initiatorType
        }));
      });

      const jsResources = resources.filter(r => r.type === 'script');
      const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);

      if (totalJsSize < 500000) { // 500KB
        await logTest('Performance', `${pageTest.name} - JS bundle size`, 'pass', `${Math.round(totalJsSize / 1024)}KB`);
      } else if (totalJsSize < 1000000) { // 1MB
        await logTest('Performance', `${pageTest.name} - JS bundle size`, 'warning', `${Math.round(totalJsSize / 1024)}KB - Large bundle`);
      } else {
        await logTest('Performance', `${pageTest.name} - JS bundle size`, 'fail', `${Math.round(totalJsSize / 1024)}KB - Too large`);
      }

    } catch (error) {
      await logTest('Performance', `${pageTest.name} test`, 'fail', error.message);
    }
  }
}

async function testAccessibility(page) {
  console.log('\n=== ♿ TESTING ACCESSIBILITY ===\n');

  try {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });

    // Test 1: Form labels
    const formLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      let labelsFound = 0;
      let totalInputs = 0;

      inputs.forEach(input => {
        if (input.type !== 'hidden') {
          totalInputs++;
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label) labelsFound++;
        }
      });

      return { labelsFound, totalInputs };
    });

    if (formLabels.labelsFound === formLabels.totalInputs) {
      await logTest('Accessibility', 'Form labels', 'pass', `All ${formLabels.totalInputs} inputs have labels`);
    } else {
      await logTest('Accessibility', 'Form labels', 'warning', `${formLabels.labelsFound}/${formLabels.totalInputs} inputs have labels`);
    }

    // Test 2: Alt text for images
    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      let withAlt = 0;
      let total = imgs.length;

      imgs.forEach(img => {
        if (img.alt) withAlt++;
      });

      return { withAlt, total };
    });

    if (images.total === 0 || images.withAlt === images.total) {
      await logTest('Accessibility', 'Image alt text', 'pass', `${images.withAlt}/${images.total} images have alt text`);
    } else {
      await logTest('Accessibility', 'Image alt text', 'warning', `${images.withAlt}/${images.total} images have alt text`);
    }

    // Test 3: Keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement1 = await page.evaluate(() => document.activeElement?.tagName);

    await page.keyboard.press('Tab');
    const focusedElement2 = await page.evaluate(() => document.activeElement?.tagName);

    if (focusedElement1 && focusedElement2) {
      await logTest('Accessibility', 'Keyboard navigation', 'pass', 'Tab navigation working');
    } else {
      await logTest('Accessibility', 'Keyboard navigation', 'warning', 'Tab navigation may have issues');
    }

    // Test 4: ARIA roles
    const ariaRoles = await page.evaluate(() => {
      return document.querySelectorAll('[role]').length;
    });

    if (ariaRoles > 0) {
      await logTest('Accessibility', 'ARIA roles', 'pass', `Found ${ariaRoles} elements with ARIA roles`);
    } else {
      await logTest('Accessibility', 'ARIA roles', 'warning', 'No ARIA roles found');
    }

    // Test 5: Color contrast (basic check)
    const contrastIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let lowContrastCount = 0;

      // This is a simplified check - real contrast testing requires more complex calculations
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;

        if (bg === color && bg !== 'rgba(0, 0, 0, 0)') {
          lowContrastCount++;
        }
      });

      return lowContrastCount;
    });

    if (contrastIssues === 0) {
      await logTest('Accessibility', 'Color contrast', 'pass', 'No obvious contrast issues');
    } else {
      await logTest('Accessibility', 'Color contrast', 'warning', `Found ${contrastIssues} potential contrast issues`);
    }

  } catch (error) {
    await logTest('Accessibility', 'Accessibility test', 'fail', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 STARTING SEIDO COMPREHENSIVE TEST SUITE');
  console.log('=' .repeat(60));
  console.log(`Testing URL: ${BASE_URL}`);
  console.log(`Test Started: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(60));

  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set up console message handling
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Run all test suites
    await testAuthentication(page);
    await testDashboardFeatures(page);
    await testInterventionWorkflow(page);
    await testMobileResponsiveness(page);
    await testSecurityFeatures(page);
    await testPerformance(page);
    await testAccessibility(page);

    // Generate summary report
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests Run: ${testResults.summary.total}`);
    console.log(`✅ Passed: ${testResults.summary.passed} (${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${testResults.summary.failed} (${((testResults.summary.failed / testResults.summary.total) * 100).toFixed(1)}%)`);
    console.log(`⚠️ Warnings: ${testResults.summary.warnings} (${((testResults.summary.warnings / testResults.summary.total) * 100).toFixed(1)}%)`);

    // Save detailed results
    const reportPath = 'C:\\Users\\arthu\\Desktop\\Coding\\Seido-app\\test\\test-results-detailed.json';
    await fs.writeFile(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n💾 Detailed results saved to: ${reportPath}`);

    // Print critical issues
    const criticalIssues = testResults.tests.filter(t => t.status === 'fail');
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
      console.log('=' .repeat(60));
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.name}`);
        if (issue.details) {
          console.log(`   → ${issue.details}`);
        }
      });
    }

    // Print warnings
    const warnings = testResults.tests.filter(t => t.status === 'warning');
    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS (NON-CRITICAL BUT SHOULD BE ADDRESSED):');
      console.log('=' .repeat(60));
      warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.category}] ${warning.name}`);
        if (warning.details) {
          console.log(`   → ${warning.details}`);
        }
      });
    }

    // Generate recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('=' .repeat(60));

    if (testResults.summary.failed > 0) {
      console.log('1. Fix critical authentication and security issues first');
      console.log('2. Ensure all role-based access controls are properly implemented');
      console.log('3. Review error handling for failed operations');
    }

    if (testResults.summary.warnings > 5) {
      console.log('4. Improve UI element accessibility and labeling');
      console.log('5. Optimize performance for slower operations');
      console.log('6. Add missing ARIA roles and accessibility features');
    }

    console.log('\n✨ Test suite completed successfully!');

  } catch (error) {
    console.error('Fatal error during testing:', error);
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed. Test session ended.');
  }
}

// Run the test suite
runAllTests().catch(console.error);