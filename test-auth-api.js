/**
 * SEIDO Authentication API Test Script
 *
 * Tests direct API authentication without middleware interference
 * Validates the 3 test accounts: arthur@umumentum.com, arthur+gest@seido.pm, arthur+loc@seido.pm
 */

const BASE_URL = 'http://localhost:3020'

const TEST_ACCOUNTS = [
  {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    role: 'admin',
    name: 'Admin Account'
  },
  {
    email: 'arthur+gest@seido.pm',
    password: 'Wxcvbn123',
    role: 'gestionnaire',
    name: 'Gestionnaire Account'
  },
  {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    role: 'locataire',
    name: 'Locataire Account'
  }
]

async function testLogin(account) {
  console.log(`\n🔍 [AUTH-TEST] Testing ${account.name} (${account.email})`)

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: account.email,
        password: account.password
      })
    })

    console.log(`📊 [AUTH-TEST] Response status: ${response.status}`)
    console.log(`📊 [AUTH-TEST] Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ [AUTH-TEST] Login failed for ${account.name}:`, errorText)
      return false
    }

    const responseData = await response.json()
    console.log(`✅ [AUTH-TEST] Login successful for ${account.name}:`, {
      success: responseData.success,
      role: responseData.user?.role,
      userId: responseData.user?.id,
      hasSession: !!responseData.session
    })

    return true
  } catch (error) {
    console.log(`💥 [AUTH-TEST] Network error for ${account.name}:`, error.message)
    return false
  }
}

async function testSessionValidation() {
  console.log(`\n🔍 [SESSION-TEST] Testing session validation endpoint`)

  try {
    const response = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    console.log(`📊 [SESSION-TEST] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ [SESSION-TEST] Session check failed:`, errorText)
      return false
    }

    const sessionData = await response.json()
    console.log(`✅ [SESSION-TEST] Session endpoint accessible:`, {
      hasUser: !!sessionData.user,
      authenticated: sessionData.authenticated
    })

    return true
  } catch (error) {
    console.log(`💥 [SESSION-TEST] Network error:`, error.message)
    return false
  }
}

async function runAuthTests() {
  console.log('🚀 [SEIDO-AUTH-TEST] Starting authentication API tests...')
  console.log(`🔗 [SEIDO-AUTH-TEST] Testing against: ${BASE_URL}`)
  console.log(`🚫 [SEIDO-AUTH-TEST] Middleware: BYPASSED for testing`)

  let successCount = 0
  let totalTests = TEST_ACCOUNTS.length + 1 // +1 for session test

  // Test session endpoint first
  if (await testSessionValidation()) {
    successCount++
  }

  // Test each account login
  for (const account of TEST_ACCOUNTS) {
    if (await testLogin(account)) {
      successCount++
    }
  }

  console.log(`\n📊 [SEIDO-AUTH-TEST] Test Results Summary:`)
  console.log(`✅ [SEIDO-AUTH-TEST] Successful tests: ${successCount}/${totalTests}`)
  console.log(`❌ [SEIDO-AUTH-TEST] Failed tests: ${totalTests - successCount}/${totalTests}`)

  if (successCount === totalTests) {
    console.log(`🎉 [SEIDO-AUTH-TEST] ALL TESTS PASSED! Authentication API is working correctly.`)
  } else {
    console.log(`⚠️ [SEIDO-AUTH-TEST] Some tests failed. Check the logs above for details.`)
  }

  return successCount === totalTests
}

// Only run if this script is executed directly
if (require.main === module) {
  runAuthTests().catch(error => {
    console.error('💥 [SEIDO-AUTH-TEST] Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { runAuthTests, testLogin, testSessionValidation }