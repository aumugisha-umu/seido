/**
 * API Login Integration Test
 * Tests the /api/auth/login endpoint with real Supabase authentication
 */

async function testAPILogin(email, _password) {
  console.log(`\n🔐 Testing API login for: ${email}`)
  console.log('=' * 60)

  try {
    // Test login via API endpoint
    console.log('📝 Calling /api/auth/login...')
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Important for cookies
    })

    const _data = await response.json()

    if (!response.ok) {
      console.error('❌ Login failed:', data.error)
      return false
    }

    console.log('✅ Login successful!')
    console.log('Response:', JSON.stringify(data, null, 2))

    // Verify user data
    if (data.user) {
      console.log('\n📋 User Profile:')
      console.log('  ID:', data.user.id)
      console.log('  Email:', data.user.email)
      console.log('  Name:', data.user.name)
      console.log('  Role:', data.user.role)
      console.log('  Phone:', data.user.phone || 'Not set')
      console.log('  Avatar:', data.user.avatar_url || 'Not set')
    }

    // Test logout
    console.log('\n🔓 Testing logout...')
    const logoutResponse = await fetch('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })

    const logoutData = await logoutResponse.json()

    if (logoutResponse.ok && logoutData.success) {
      console.log('✅ Logout successful!')
    } else {
      console.error('❌ Logout failed:', logoutData.error)
    }

    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

async function runAPITests() {
  console.log('🚀 Starting API Authentication Tests')
  console.log('====================================')
  console.log('📍 Testing endpoint: http://localhost:3000/api/auth/login')
  console.log('⚠️  Make sure the development server is running (npm run dev)')

  // Test accounts (replace passwords with actual ones from your database)
  const testAccounts = [
    { email: 'admin@seido.pm', password: 'your-password' },
    { email: 'arthur@umumentum.com', password: 'your-password' },
    { email: 'arthur+prest@seido.pm', password: 'your-password' },
    { email: 'arthur+loc@seido.pm', password: 'your-password' },
  ]

  const results = []

  for (const account of testAccounts) {
    const success = await testAPILogin(account.email, account._password)
    results.push({ email: account.email, success })
  }

  // Summary
  console.log('\n📊 API Test Summary')
  console.log('=' * 60)
  const successCount = results.filter(r => r.success).length
  console.log(`✅ Successful: ${successCount}/${results.length}`)
  console.log(`❌ Failed: ${results.length - successCount}/${results.length}`)

  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.email}`)
  })

  if (successCount === results.length) {
    console.log('\n🎉 All API tests passed! Login endpoint is working correctly.')
  } else {
    console.log('\n⚠️ Some API tests failed. Check the implementation and passwords.')
  }
}

// Check if running in Node.js environment
if (typeof window === 'undefined') {
  // Running in Node.js - need to import fetch
  const fetch = require('node-fetch')
  global.fetch = fetch

  // Run tests
  runAPITests().catch(console.error)
} else {
  // Running in browser
  console.log('This script should be run with Node.js: node test/api-login-test.js')
}