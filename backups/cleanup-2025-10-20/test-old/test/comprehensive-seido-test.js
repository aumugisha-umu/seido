/**
 * Comprehensive SEIDO Application Test Suite
 * Tests all major features, workflows, and user roles
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
    status, // 'pass', 'fail', 'warning'
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
}

async function takeScreenshot(page, name) {
  const timestamp = Date.now();
  const filename = `test-screenshot-${name}-${timestamp}.png`;
  const path = `C:\\Users\\arthu\\Desktop\\Coding\\Seido-app\\test\\screenshots\\${filename}`;

  try {
    // Ensure directory exists
    await fs.mkdir('C:\\Users\\arthu\\Desktop\\Coding\\Seido-app\\test\\screenshots', { recursive: true });
    await page.screenshot({ path, fullPage: true });
    return filename;
  } catch (error) {
    console.error(`Failed to take screenshot: ${error.message}`);
    return null;
  }
}

async function testLogin(page, role, credentials) {
  try {
    console.log(`\n🔐 Testing login for role: ${role}`);

    // Navigate to login page
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });

    // Check if login page loads
    const loginForm = await page.$('form');
    if (!loginForm) {
      await logTest('Authentication', `${role} - Login page loads`, 'fail', 'Login form not found');
      return false;
    }

    await logTest('Authentication', `${role} - Login page loads`, 'pass');

    // Fill in credentials
    await page.type('input[name="email"]', credentials.email);
    await page.type('input[name="password"]', credentials._password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});

    // Check if redirected to dashboard
    const currentUrl = page.url();
    if (currentUrl.includes(credentials.dashboard)) {
      await logTest('Authentication', `${role} - Login successful`, 'pass', `Redirected to ${credentials.dashboard}`);
      return true;
    } else {
      const screenshot = await takeScreenshot(page, `${role}-login-fail`);
      await logTest('Authentication', `${role} - Login redirect`, 'fail', `Expected ${credentials.dashboard}, got ${currentUrl}`, screenshot);
      return false;
    }

  } catch (error) {
    await logTest('Authentication', `${role} - Login process`, 'fail', error.message);
    return false;
  }
}

async function testDashboard(page, role) {
  try {
    console.log(`\n📊 Testing dashboard for role: ${role}`);

    // Check dashboard loads
    const dashboardContent = await page.$('[data-testid="dashboard-content"], main, .dashboard');
    if (!dashboardContent) {
      await logTest('Dashboard', `${role} - Dashboard content loads`, 'warning', 'Dashboard content selector not found');
    } else {
      await logTest('Dashboard', `${role} - Dashboard content loads`, 'pass');
    }

    // Check role-specific elements
    const roleSpecificTests = {
      gestionnaire: [
        { selector: '[data-testid="interventions-list"], .interventions', name: 'Interventions list' },
        { selector: '[data-testid="properties"], .properties, .buildings', name: 'Properties section' },
        { selector: '[data-testid="stats"], .stats, .metrics', name: 'Statistics' }
      ],
      prestataire: [
        { selector: '[data-testid="assigned-interventions"], .interventions', name: 'Assigned interventions' },
        { selector: '[data-testid="availability"], .availability, .calendar', name: 'Availability calendar' },
        { selector: '[data-testid="quotes"], .quotes, .devis', name: 'Quotes section' }
      ],
      locataire: [
        { selector: '[data-testid="my-interventions"], .interventions', name: 'My interventions' },
        { selector: '[data-testid="new-request"], button, a[href*="nouvelle"]', name: 'New request button' },
        { selector: '[data-testid="property-info"], .property, .lot', name: 'Property information' }
      ]
    };

    const tests = roleSpecificTests[role] || [];
    for (const test of tests) {
      const element = await page.$(test.selector);
      if (element) {
        await logTest('Dashboard', `${role} - ${test.name}`, 'pass');
      } else {
        await logTest('Dashboard', `${role} - ${test.name}`, 'warning', `Selector not found: ${test.selector}`);
      }
    }

    // Test navigation menu
    const navMenu = await page.$('nav, [role="navigation"]');
    if (navMenu) {
      await logTest('Dashboard', `${role} - Navigation menu`, 'pass');
    } else {
      await logTest('Dashboard', `${role} - Navigation menu`, 'warning', 'Navigation menu not found');
    }

    // Test logout functionality
    const logoutButton = await page.$('button[data-testid="logout"], a[href*="logout"]');
    if (logoutButton) {
      await logTest('Dashboard', `${role} - Logout button present`, 'pass');
    } else {
      await logTest('Dashboard', `${role} - Logout button present`, 'warning', 'Logout button not found');
    }

    // Take screenshot of dashboard
    await takeScreenshot(page, `${role}-dashboard`);

  } catch (error) {
    await logTest('Dashboard', `${role} - Dashboard test`, 'fail', error.message);
  }
}

async function testInterventionWorkflow(page) {
  console.log('\n🔄 Testing Intervention Workflow');

  try {
    // Test as Locataire - Create intervention
    console.log('Testing intervention creation as Locataire...');

    // Login as locataire
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('input[name="email"]', TEST_CREDENTIALS.locataire.email);
    await page.type('input[name="password"]', TEST_CREDENTIALS.locataire._password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});

    // Navigate to interventions
    const interventionsLink = await page.$('a[href*="interventions"]');
    if (interventionsLink) {
      await interventionsLink.click();
      await page.waitForTimeout(2000);
      await logTest('Intervention Workflow', 'Locataire - Navigate to interventions', 'pass');
    } else {
      await logTest('Intervention Workflow', 'Locataire - Navigate to interventions', 'warning', 'Interventions link not found');
    }

    // Check for new intervention button
    const newInterventionButton = await page.$('button[data-testid="new-intervention"], a[href*="nouvelle"]');
    if (newInterventionButton) {
      await logTest('Intervention Workflow', 'Locataire - New intervention button', 'pass');
    } else {
      await logTest('Intervention Workflow', 'Locataire - New intervention button', 'warning', 'New intervention button not found');
    }

    // Test as Gestionnaire - Review interventions
    console.log('Testing intervention management as Gestionnaire...');

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('input[name="email"]', TEST_CREDENTIALS.gestionnaire.email);
    await page.type('input[name="password"]', TEST_CREDENTIALS.gestionnaire._password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});

    // Check intervention management features
    const interventionsList = await page.$('[data-testid="interventions-list"], .interventions');
    if (interventionsList) {
      await logTest('Intervention Workflow', 'Gestionnaire - Interventions list', 'pass');

      // Check for action buttons
      const actionButtons = await page.$$('button[data-action], [data-testid*="action"]');
      if (actionButtons.length > 0) {
        await logTest('Intervention Workflow', 'Gestionnaire - Action buttons', 'pass', `Found ${actionButtons.length} action buttons`);
      } else {
        await logTest('Intervention Workflow', 'Gestionnaire - Action buttons', 'warning', 'No action buttons found');
      }
    } else {
      await logTest('Intervention Workflow', 'Gestionnaire - Interventions list', 'warning', 'Interventions list not found');
    }

  } catch (error) {
    await logTest('Intervention Workflow', 'Workflow test', 'fail', error.message);
  }
}

async function testMobileResponsiveness(page) {
  console.log('\n📱 Testing Mobile Responsiveness');

  try {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 });

    // Test login page
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    const loginFormMobile = await page.$('form');
    if (loginFormMobile) {
      await logTest('Mobile Responsiveness', 'Login page - Mobile view', 'pass');
    } else {
      await logTest('Mobile Responsiveness', 'Login page - Mobile view', 'fail', 'Login form not visible on mobile');
    }

    // Test dashboard mobile view
    await page.type('input[name="email"]', TEST_CREDENTIALS.gestionnaire.email);
    await page.type('input[name="password"]', TEST_CREDENTIALS.gestionnaire._password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});

    // Check for mobile menu
    const mobileMenu = await page.$('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (mobileMenu) {
      await logTest('Mobile Responsiveness', 'Dashboard - Mobile menu', 'pass');
    } else {
      await logTest('Mobile Responsiveness', 'Dashboard - Mobile menu', 'warning', 'Mobile menu not found');
    }

    // Take mobile screenshot
    await takeScreenshot(page, 'mobile-view');

    // Reset to desktop viewport
    await page.setViewport({ width: 1920, height: 1080 });

  } catch (error) {
    await logTest('Mobile Responsiveness', 'Mobile test', 'fail', error.message);
  }
}

async function testSecurityAndPermissions(page) {
  console.log('\n🔒 Testing Security and Permissions');

  try {
    // Test unauthorized access
    await page.goto(`${BASE_URL}/gestionnaire/dashboard`, { waitUntil: 'networkidle0' });
    const currentUrl = page.url();

    if (currentUrl.includes('/auth/login')) {
      await logTest('Security', 'Unauthorized access redirect', 'pass', 'Redirected to login');
    } else {
      await logTest('Security', 'Unauthorized access redirect', 'fail', 'Not redirected to login');
    }

    // Test role-based access
    // Login as locataire and try to access gestionnaire dashboard
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('input[name="email"]', TEST_CREDENTIALS.locataire.email);
    await page.type('input[name="password"]', TEST_CREDENTIALS.locataire._password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});

    // Try to access gestionnaire dashboard
    await page.goto(`${BASE_URL}/gestionnaire/dashboard`, { waitUntil: 'networkidle0' });
    const urlAfterAttempt = page.url();

    if (!urlAfterAttempt.includes('/gestionnaire/dashboard')) {
      await logTest('Security', 'Role-based access control', 'pass', 'Access denied to unauthorized role');
    } else {
      await logTest('Security', 'Role-based access control', 'fail', 'Unauthorized role accessed restricted area');
    }

    // Test XSS protection
    const xssTestString = '<script>alert("XSS")</script>';
    const inputField = await page.$('input[type="text"]:not([type="password"]):not([type="email"])');
    if (inputField) {
      await inputField.type(xssTestString);
      const alertFired = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.alert = () => resolve(true);
          setTimeout(() => resolve(false), 1000);
        });
      });

      if (!alertFired) {
        await logTest('Security', 'XSS protection', 'pass', 'Script not executed');
      } else {
        await logTest('Security', 'XSS protection', 'fail', 'XSS vulnerability detected');
      }
    } else {
      await logTest('Security', 'XSS protection', 'warning', 'No input field found for testing');
    }

  } catch (error) {
    await logTest('Security', 'Security test', 'fail', error.message);
  }
}

async function testErrorHandling(page) {
  console.log('\n⚠️ Testing Error Handling');

  try {
    // Test 404 page
    await page.goto(`${BASE_URL}/non-existent-page`, { waitUntil: 'networkidle0' });
    const pageContent = await page.content();

    if (pageContent.includes('404') || pageContent.includes('not found')) {
      await logTest('Error Handling', '404 page', 'pass', 'Error page displayed');
    } else {
      await logTest('Error Handling', '404 page', 'warning', '404 page might not be properly configured');
    }

    // Test invalid login
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await page.type('input[name="email"]', 'invalid@test.com');
    await page.type('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(2000);
    const errorMessage = await page.$('[role="alert"], .error, .toast');

    if (errorMessage) {
      await logTest('Error Handling', 'Invalid login error', 'pass', 'Error message displayed');
    } else {
      await logTest('Error Handling', 'Invalid login error', 'warning', 'No visible error message');
    }

  } catch (error) {
    await logTest('Error Handling', 'Error handling test', 'fail', error.message);
  }
}

async function testPerformance(page) {
  console.log('\n⚡ Testing Performance');

  try {
    // Enable performance metrics
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        navigationStart: 0,
        loadComplete: 0,
        firstPaint: 0,
        firstContentfulPaint: 0
      };

      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          window.performanceMetrics.navigationStart = perfData.fetchStart;
          window.performanceMetrics.loadComplete = perfData.loadEventEnd;
        }

        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            window.performanceMetrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            window.performanceMetrics.firstContentfulPaint = entry.startTime;
          }
        });
      });
    });

    // Test page load times
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;

    if (loadTime < 3000) {
      await logTest('Performance', 'Login page load time', 'pass', `Loaded in ${loadTime}ms`);
    } else if (loadTime < 5000) {
      await logTest('Performance', 'Login page load time', 'warning', `Loaded in ${loadTime}ms - Could be optimized`);
    } else {
      await logTest('Performance', 'Login page load time', 'fail', `Loaded in ${loadTime}ms - Too slow`);
    }

    // Get performance metrics
    const metrics = await page.evaluate(() => window.performanceMetrics);

    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint < 2000) {
      await logTest('Performance', 'First Contentful Paint', 'pass', `${metrics.firstContentfulPaint.toFixed(0)}ms`);
    } else if (metrics.firstContentfulPaint) {
      await logTest('Performance', 'First Contentful Paint', 'warning', `${metrics.firstContentfulPaint.toFixed(0)}ms - Could be improved`);
    }

    // Test dashboard load time
    await page.type('input[name="email"]', TEST_CREDENTIALS.gestionnaire.email);
    await page.type('input[name="password"]', TEST_CREDENTIALS.gestionnaire._password);

    const dashboardStart = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    const dashboardLoadTime = Date.now() - dashboardStart;

    if (dashboardLoadTime < 3000) {
      await logTest('Performance', 'Dashboard load time', 'pass', `Loaded in ${dashboardLoadTime}ms`);
    } else if (dashboardLoadTime < 5000) {
      await logTest('Performance', 'Dashboard load time', 'warning', `Loaded in ${dashboardLoadTime}ms - Could be optimized`);
    } else {
      await logTest('Performance', 'Dashboard load time', 'fail', `Loaded in ${dashboardLoadTime}ms - Too slow`);
    }

  } catch (error) {
    await logTest('Performance', 'Performance test', 'fail', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting SEIDO Comprehensive Test Suite');
  console.log('=' .repeat(50));

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Run all test categories

    // 1. Test Authentication for all roles
    for (const [role, credentials] of Object.entries(TEST_CREDENTIALS)) {
      const loginSuccess = await testLogin(page, role, credentials);
      if (loginSuccess) {
        await testDashboard(page, role);
      }

      // Logout after each role test
      await page.goto(`${BASE_URL}/auth/logout`, { waitUntil: 'networkidle0' }).catch(() => {});
    }

    // 2. Test Intervention Workflow
    await testInterventionWorkflow(page);

    // 3. Test Mobile Responsiveness
    await testMobileResponsiveness(page);

    // 4. Test Security and Permissions
    await testSecurityAndPermissions(page);

    // 5. Test Error Handling
    await testErrorHandling(page);

    // 6. Test Performance
    await testPerformance(page);

    // Generate summary report
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`⚠️ Warnings: ${testResults.summary.warnings}`);
    console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);

    // Save detailed results
    await fs.writeFile(
      'C:\\Users\\arthu\\Desktop\\Coding\\Seido-app\\test\\test-results.json',
      JSON.stringify(testResults, null, 2)
    );

    console.log('\n💾 Detailed results saved to test-results.json');

    // Print critical issues
    const criticalIssues = testResults.tests.filter(t => t.status === 'fail');
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      criticalIssues.forEach(issue => {
        console.log(`  - [${issue.category}] ${issue.name}: ${issue.details || 'No details'}`);
      });
    }

    // Print warnings
    const warnings = testResults.tests.filter(t => t.status === 'warning');
    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      warnings.forEach(warning => {
        console.log(`  - [${warning.category}] ${warning.name}: ${warning.details || 'No details'}`);
      });
    }

  } catch (error) {
    console.error('Fatal error during testing:', error);
  } finally {
    await browser.close();
  }
}

// Run tests
runAllTests().catch(console.error);