/**
 * Test script for Supabase authentication
 * Tests the real database authentication without mock data
 */

const { createClient } = require('@supabase/supabase-js')

// Environment configuration
const SUPABASE_URL = 'https://yfmybfmflghwvylqjfbc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjY2NDEsImV4cCI6MjA3MjUwMjY0MX0.KTAafQ40joj5nKbrHFl9XMNeqdlmXofiFmxpwtJRhZk'

// Test accounts (replace with actual test accounts from your database)
const TEST_ACCOUNTS = [
  { email: 'admin@seido.pm', password: 'your-password', expectedRole: 'admin' },
  { email: 'arthur@umumentum.com', password: 'your-password', expectedRole: 'gestionnaire' },
  { email: 'arthur+prest@seido.pm', password: 'your-password', expectedRole: 'prestataire' },
  { email: 'arthur+loc@seido.pm', password: 'your-password', expectedRole: 'locataire' },
]

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testAuthentication(account) {
  console.log(`\n🔐 Testing authentication for: ${account.email}`)
  console.log('=' * 60)

  try {
    // Test sign in
    console.log('📝 Attempting to sign in...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account._password,
    })

    if (authError) {
      console.error('❌ Authentication failed:', authError.message)
      return false
    }

    if (!authData.user) {
      console.error('❌ No user data returned')
      return false
    }

    console.log('✅ Authentication successful!')
    console.log('👤 User ID:', authData.user.id)
    console.log('📧 Email:', authData.user.email)
    console.log('✉️ Email confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No')

    // Check user profile
    console.log('\n🔍 Fetching user profile...')
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (profileError) {
      console.log('⚠️ Profile not found in database:', profileError.message)
      console.log('Note: Profile will be created on first app login')
    } else {
      console.log('✅ Profile found!')
      console.log('📋 Name:', userProfile.name)
      console.log('👥 Role:', userProfile.role)
      console.log('🏢 Team ID:', userProfile.team_id)

      if (userProfile.role !== account.expectedRole) {
        console.warn(`⚠️ Role mismatch! Expected: ${account.expectedRole}, Got: ${userProfile.role}`)
      }
    }

    // Sign out
    console.log('\n🔓 Signing out...')
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error('⚠️ Sign out error:', signOutError.message)
    } else {
      console.log('✅ Signed out successfully')
    }

    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Supabase Authentication Tests')
  console.log('========================================')
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`)
  console.log(`🔑 Using anon key: ${SUPABASE_ANON_KEY.substring(0, 30)}...`)
  console.log(`📝 Testing ${TEST_ACCOUNTS.length} accounts`)

  const results = []

  for (const account of TEST_ACCOUNTS) {
    const success = await testAuthentication(account)
    results.push({ email: account.email, success })
  }

  // Summary
  console.log('\n📊 Test Summary')
  console.log('=' * 60)
  const successCount = results.filter(r => r.success).length
  console.log(`✅ Successful: ${successCount}/${results.length}`)
  console.log(`❌ Failed: ${results.length - successCount}/${results.length}`)

  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.email}`)
  })

  if (successCount === results.length) {
    console.log('\n🎉 All tests passed! Supabase authentication is working correctly.')
  } else {
    console.log('\n⚠️ Some tests failed. Please check the accounts and passwords.')
  }
}

// Run the tests
runTests().catch(console.error)