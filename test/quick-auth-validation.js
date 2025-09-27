// Quick Authentication Validation Test
// Tests the two provided accounts with Supabase auth

const BASE_URL = 'http://localhost:3002';  // Corrected port

async function testAuthentication() {
  console.log('🔍 AUTHENTICATION SYSTEM VALIDATION');
  console.log('=' .repeat(60));
  console.log('Testing migration from mock auth to Supabase auth');
  console.log('Using provided accounts with password: Wxcvbn123\n');

  const accounts = [
    { email: 'arthur+prest@seido.pm', role: 'prestataire', password: 'Wxcvbn123' },
    { email: 'arthur+loc@seido.pm', role: 'locataire', password: 'Wxcvbn123' }
  ];

  const results = {
    timestamp: new Date().toISOString(),
    accounts: [],
    overallStatus: 'TESTING',
    mockReferencesFound: false,
    uuidErrorsFound: false,
    cacheErrorsFound: false
  };

  for (const account of accounts) {
    console.log(`\n📧 Testing: ${account.email} (${account.role})`);
    console.log('-'.repeat(40));

    const accountResult = {
      email: account.email,
      role: account.role,
      loginSuccess: false,
      dashboardAccess: false,
      errors: [],
      responseTime: null
    };

    try {
      // Step 1: Test login endpoint
      console.log('  → Testing login endpoint...');
      const startTime = Date.now();

      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: account.email,
          password: account.password
        })
      });

      accountResult.responseTime = Date.now() - startTime;

      if (loginResponse.ok) {
        const data = await loginResponse.json();
        accountResult.loginSuccess = true;
        console.log(`  ✅ Login successful (${accountResult.responseTime}ms)`);
        console.log(`  ✅ User ID: ${data.user?.id || 'N/A'}`);
        console.log(`  ✅ Role: ${data.user?.role || 'N/A'}`);

        // Check for session token
        if (data.session?.access_token || data.access_token) {
          console.log('  ✅ Session token received');
        } else {
          console.log('  ⚠️  No session token in response');
        }

        // Step 2: Test dashboard access
        console.log('  → Testing dashboard access...');
        const dashboardUrl = `${BASE_URL}/${account.role}/dashboard`;

        const dashboardResponse = await fetch(dashboardUrl, {
          headers: {
            'Cookie': loginResponse.headers.get('set-cookie') || ''
          }
        });

        if (dashboardResponse.ok) {
          accountResult.dashboardAccess = true;
          console.log('  ✅ Dashboard endpoint accessible');
        } else {
          console.log(`  ❌ Dashboard returned: ${dashboardResponse.status}`);
        }

      } else {
        const errorText = await loginResponse.text();
        accountResult.errors.push(`Login failed: ${loginResponse.status}`);
        console.log(`  ❌ Login failed: ${loginResponse.status} ${loginResponse.statusText}`);

        // Check error content for migration issues
        if (errorText.includes('mock')) {
          results.mockReferencesFound = true;
          console.log('  ❌ Mock reference detected in error');
        }
        if (errorText.includes('UUID')) {
          results.uuidErrorsFound = true;
          console.log('  ❌ UUID error detected');
        }
      }

      // Step 3: Test cache metrics endpoint
      console.log('  → Testing cache system...');
      const cacheResponse = await fetch(`${BASE_URL}/api/cache-metrics`);

      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        console.log(`  ✅ Cache system active`);
        if (cacheData.hits !== undefined) {
          console.log(`     Hits: ${cacheData.hits}, Misses: ${cacheData.misses || 0}`);
        }
      } else if (cacheResponse.status === 404) {
        console.log('  ⚠️  Cache metrics endpoint not implemented');
      } else {
        console.log(`  ⚠️  Cache metrics returned: ${cacheResponse.status}`);
      }

      // Step 4: Test logout endpoint
      if (accountResult.loginSuccess) {
        console.log('  → Testing logout...');
        const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Cookie': loginResponse.headers.get('set-cookie') || ''
          }
        });

        if (logoutResponse.ok) {
          console.log('  ✅ Logout endpoint functional');
        } else {
          console.log(`  ⚠️  Logout returned: ${logoutResponse.status}`);
        }
      }

    } catch (error) {
      accountResult.errors.push(error.message);
      console.log(`  ❌ Test failed: ${error.message}`);

      // Check for specific migration issues in error
      if (error.message.includes('authCacheManager')) {
        results.cacheErrorsFound = true;
        console.log('  ❌ Auth cache manager error detected');
      }
    }

    results.accounts.push(accountResult);
  }

  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📝 TEST SUMMARY');
  console.log('='.repeat(60));

  const successCount = results.accounts.filter(a => a.loginSuccess).length;
  const dashboardCount = results.accounts.filter(a => a.dashboardAccess).length;
  const totalErrors = results.accounts.reduce((sum, a) => sum + a.errors.length, 0);

  console.log(`\n✅ Login Success Rate: ${successCount}/${accounts.length}`);
  console.log(`✅ Dashboard Access Rate: ${dashboardCount}/${accounts.length}`);
  console.log(`⚠️  Total Errors: ${totalErrors}`);

  console.log('\n🔍 MIGRATION STATUS CHECK:');
  console.log(`  Mock References: ${results.mockReferencesFound ? '❌ FOUND' : '✅ NONE'}`);
  console.log(`  UUID Errors: ${results.uuidErrorsFound ? '❌ FOUND' : '✅ NONE'}`);
  console.log(`  Cache Errors: ${results.cacheErrorsFound ? '❌ FOUND' : '✅ NONE'}`);

  console.log('\n📊 PERFORMANCE METRICS:');
  const avgResponseTime = results.accounts
    .filter(a => a.responseTime)
    .reduce((sum, a, _, arr) => sum + a.responseTime / arr.length, 0);

  if (avgResponseTime > 0) {
    console.log(`  Average Login Time: ${avgResponseTime.toFixed(0)}ms`);
  }

  // Determine overall status
  if (successCount === accounts.length && dashboardCount === accounts.length && totalErrors === 0) {
    results.overallStatus = '🎯 PERFECT - Full migration successful';
  } else if (successCount === accounts.length && !results.mockReferencesFound) {
    results.overallStatus = '✅ GOOD - Authentication working, minor issues';
  } else if (successCount > 0) {
    results.overallStatus = '⚠️  PARTIAL - Some functionality working';
  } else {
    results.overallStatus = '❌ FAILED - Critical issues detected';
  }

  console.log(`\n🎯 OVERALL STATUS: ${results.overallStatus}`);

  console.log('\n📋 DETAILED RESULTS:');
  results.accounts.forEach(account => {
    console.log(`\n  ${account.email}:`);
    console.log(`    Login: ${account.loginSuccess ? '✅' : '❌'}`);
    console.log(`    Dashboard: ${account.dashboardAccess ? '✅' : '❌'}`);
    console.log(`    Response Time: ${account.responseTime}ms`);
    if (account.errors.length > 0) {
      console.log(`    Errors: ${account.errors.join(', ')}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('Test completed at:', new Date().toLocaleString());

  // Save results
  const fs = require('fs');
  const reportFile = `./test/reports/auth-validation-${Date.now()}.json`;

  // Ensure reports directory exists
  if (!fs.existsSync('./test/reports')) {
    fs.mkdirSync('./test/reports', { recursive: true });
  }

  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`\n📁 Report saved to: ${reportFile}`);

  return results;
}

// Run the test
testAuthentication().catch(console.error);