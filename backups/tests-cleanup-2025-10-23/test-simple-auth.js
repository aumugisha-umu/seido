/**
 * Simple Authentication Test
 * Tests the simplified test-login endpoint without complex imports
 */

const BASE_URL = 'http://localhost:3020'

const TEST_ACCOUNTS = [
  {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    name: 'Admin Account'
  },
  {
    email: 'arthur+gest@seido.pm',
    password: 'Wxcvbn123',
    name: 'Gestionnaire Account'
  },
  {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    name: 'Locataire Account'
  }
]

async function testSimpleLogin(account) {
  console.log(`\n🧪 [SIMPLE-TEST] Testing ${account.name} (${account.email})`)

  try {
    const response = await fetch(`${BASE_URL}/api/auth/test-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: account.email,
        password: account.password
      })
    })

    console.log(`📊 [SIMPLE-TEST] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ [SIMPLE-TEST] Login failed for ${account.name}:`, errorText)
      return false
    }

    const responseData = await response.json()
    console.log(`✅ [SIMPLE-TEST] Login successful for ${account.name}:`, {
      success: responseData.success,
      userId: responseData.user?.id,
      email: responseData.user?.email,
      hasSession: !!responseData.session
    })

    return true
  } catch (error) {
    console.log(`💥 [SIMPLE-TEST] Network error for ${account.name}:`, error.message)
    return false
  }
}

async function runSimpleTests() {
  console.log('🧪 [SIMPLE-AUTH-TEST] Starting simple authentication tests...')
  console.log(`🔗 [SIMPLE-AUTH-TEST] Testing against: ${BASE_URL}/api/auth/test-login`)

  let successCount = 0
  let totalTests = TEST_ACCOUNTS.length

  for (const account of TEST_ACCOUNTS) {
    if (await testSimpleLogin(account)) {
      successCount++
    }
  }

  console.log(`\n📊 [SIMPLE-AUTH-TEST] Test Results Summary:`)
  console.log(`✅ [SIMPLE-AUTH-TEST] Successful tests: ${successCount}/${totalTests}`)
  console.log(`❌ [SIMPLE-AUTH-TEST] Failed tests: ${totalTests - successCount}/${totalTests}`)

  if (successCount === totalTests) {
    console.log(`🎉 [SIMPLE-AUTH-TEST] ALL TESTS PASSED! Simple authentication is working.`)
  } else {
    console.log(`⚠️ [SIMPLE-AUTH-TEST] Some tests failed. Check the logs above for details.`)
  }

  return successCount === totalTests
}

// Run if this script is executed directly
if (require.main === module) {
  runSimpleTests().catch(error => {
    console.error('💥 [SIMPLE-AUTH-TEST] Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { runSimpleTests, testSimpleLogin }