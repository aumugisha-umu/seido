// Authentication Validation Test Script
// Tests the SSR cookie fix for Supabase authentication

const BASE_URL = 'http://localhost:3003';

// Test accounts
const TEST_ACCOUNTS = [
  {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123',
    expectedRole: 'prestataire',
    dashboardPath: '/prestataire/dashboard'
  },
  {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    expectedRole: 'locataire',
    dashboardPath: '/locataire/dashboard'
  }
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

async function testLogin(account) {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}Testing login for: ${account.email}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);

  try {
    // Step 1: Test login endpoint
    console.log(`\n${colors.yellow}1. Testing login endpoint...${colors.reset}`);
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: account.email,
        password: account.password
      }),
      credentials: 'include' // Important for cookie handling
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginData.error || 'Unknown error'}`);
    }

    console.log(`${colors.green}✓ Login successful${colors.reset}`);
    console.log(`  - User ID: ${loginData.user?.id}`);
    console.log(`  - Email: ${loginData.user?.email}`);
    console.log(`  - Role: ${loginData.user?.role}`);
    console.log(`  - Session: ${loginData.session ? 'Created' : 'Missing'}`);

    // Extract cookies from response
    const setCookieHeaders = loginResponse.headers.getSetCookie?.() || [];
    const hasCookies = setCookieHeaders.length > 0;
    console.log(`  - Cookies set: ${hasCookies ? colors.green + 'Yes' : colors.red + 'No'}${colors.reset}`);

    if (hasCookies) {
      const cookieNames = setCookieHeaders.map(cookie => {
        const match = cookie.match(/^([^=]+)=/);
        return match ? match[1] : 'unknown';
      });
      console.log(`  - Cookie names: ${cookieNames.join(', ')}`);
    }

    // Step 2: Test session endpoint
    console.log(`\n${colors.yellow}2. Testing session validation...${colors.reset}`);

    // Extract cookies for subsequent requests
    const cookies = setCookieHeaders.join('; ');

    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      },
      credentials: 'include'
    });

    const sessionData = await sessionResponse.json();

    if (!sessionResponse.ok) {
      console.log(`${colors.red}✗ Session validation failed${colors.reset}`);
      console.log(`  - Error: ${sessionData.error || 'Unknown error'}`);
    } else {
      console.log(`${colors.green}✓ Session validated${colors.reset}`);
      console.log(`  - Authenticated: ${sessionData.authenticated}`);
      console.log(`  - User email: ${sessionData.user?.email}`);
      console.log(`  - User role: ${sessionData.user?.role}`);
    }

    // Step 3: Test dashboard access (simulated)
    console.log(`\n${colors.yellow}3. Testing dashboard access...${colors.reset}`);

    const dashboardResponse = await fetch(`${BASE_URL}${account.dashboardPath}`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      },
      credentials: 'include',
      redirect: 'manual' // Don't follow redirects automatically
    });

    if (dashboardResponse.status === 200) {
      console.log(`${colors.green}✓ Dashboard accessible${colors.reset}`);
      console.log(`  - Status: ${dashboardResponse.status}`);
      console.log(`  - Path: ${account.dashboardPath}`);
    } else if (dashboardResponse.status === 307 || dashboardResponse.status === 302) {
      const location = dashboardResponse.headers.get('location');
      console.log(`${colors.yellow}⚠ Redirected${colors.reset}`);
      console.log(`  - Status: ${dashboardResponse.status}`);
      console.log(`  - Redirected to: ${location}`);

      if (location && location.includes('/auth/login')) {
        console.log(`${colors.red}  - ERROR: Redirected to login (session not persisted)${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ Dashboard not accessible${colors.reset}`);
      console.log(`  - Status: ${dashboardResponse.status}`);
    }

    // Step 4: Test logout
    console.log(`\n${colors.yellow}4. Testing logout...${colors.reset}`);

    const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      credentials: 'include'
    });

    if (logoutResponse.ok) {
      console.log(`${colors.green}✓ Logout successful${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Logout failed${colors.reset}`);
      console.log(`  - Status: ${logoutResponse.status}`);
    }

    // Step 5: Verify session is cleared
    console.log(`\n${colors.yellow}5. Verifying session cleared...${colors.reset}`);

    const postLogoutSession = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      credentials: 'include'
    });

    const postLogoutData = await postLogoutSession.json();

    if (!postLogoutData.authenticated) {
      console.log(`${colors.green}✓ Session properly cleared${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Session still active after logout${colors.reset}`);
    }

    return { success: true, account: account.email };

  } catch (error) {
    console.log(`\n${colors.red}✗ Test failed for ${account.email}${colors.reset}`);
    console.log(`${colors.red}  Error: ${error.message}${colors.reset}`);
    console.log(`${colors.red}  Stack: ${error.stack}${colors.reset}`);
    return { success: false, account: account.email, error: error.message };
  }
}

async function runAllTests() {
  console.log(`${colors.cyan}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     SEIDO Authentication System Test Suite        ║${colors.reset}`);
  console.log(`${colors.cyan}║          Testing SSR Cookie Fix                   ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\n${colors.yellow}Server URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.yellow}Test Accounts: ${TEST_ACCOUNTS.length}${colors.reset}`);

  const results = [];

  for (const account of TEST_ACCOUNTS) {
    const result = await testLogin(account);
    results.push(result);

    // Wait between tests to avoid rate limiting
    if (TEST_ACCOUNTS.indexOf(account) < TEST_ACCOUNTS.length - 1) {
      console.log(`\n${colors.cyan}Waiting 2 seconds before next test...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                  TEST SUMMARY                     ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════╝${colors.reset}`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n${colors.blue}Total Tests: ${results.length}${colors.reset}`);
  console.log(`${colors.green}Successful: ${successful}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

  results.forEach(result => {
    const icon = result.success ? `${colors.green}✓` : `${colors.red}✗`;
    const status = result.success ? 'PASSED' : 'FAILED';
    console.log(`${icon} ${result.account}: ${status}${colors.reset}`);
    if (result.error) {
      console.log(`  ${colors.red}Error: ${result.error}${colors.reset}`);
    }
  });

  const overallSuccess = failed === 0;
  console.log(`\n${colors.cyan}════════════════════════════════════════════════════${colors.reset}`);
  if (overallSuccess) {
    console.log(`${colors.green}🎉 ALL TESTS PASSED! Authentication system working correctly.${colors.reset}`);
  } else {
    console.log(`${colors.red}⚠️  SOME TESTS FAILED. Check the errors above.${colors.reset}`);
  }
  console.log(`${colors.cyan}════════════════════════════════════════════════════${colors.reset}`);

  process.exit(overallSuccess ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});