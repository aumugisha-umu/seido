// Test direct pour vérifier l'accès service role à la table users
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testServiceRoleAccess() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('Testing Service Role Access...')
  console.log('URL:', supabaseUrl ? 'SET' : 'MISSING')
  console.log('Service Key:', supabaseServiceKey ? `SET (${supabaseServiceKey.length} chars)` : 'MISSING')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials!')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Test 1: Liste tous les utilisateurs
  console.log('\n--- Test 1: List all users ---')
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, email, role')
    .limit(5)

  if (allError) {
    console.error('Error listing all users:', allError)
  } else {
    console.log(`Found ${allUsers?.length || 0} users`)
    allUsers?.forEach(u => console.log(`  - ${u.email} (${u.role})`))
  }

  // Test 2: Chercher les derniers utilisateurs de test créés
  console.log(`\n--- Test 2: Find latest test users ---`)
  const { data: testUsers, error: testError } = await supabase
    .from('users')
    .select('email, created_at, auth_user_id')
    .like('email', 'arthur+test-17594%') // Cherche les utilisateurs créés aujourd'hui
    .order('created_at', { ascending: false })
    .limit(10)

  if (testError) {
    console.error('Error finding test users:', testError)
  } else {
    console.log(`Found ${testUsers?.length || 0} recent test users:`)
    testUsers?.forEach(u => console.log(`  - ${u.email} (created: ${u.created_at})`))
  }

  // Test 2b: Chercher directement dans auth.users les emails de test récents
  console.log(`\n--- Test 2b: Check if test users exist in auth.users but not in public.users ---`)
  const { data: authTestUsers, error: authTestError } = await supabase.auth.admin.listUsers()

  if (authTestError) {
    console.error('Error listing auth test users:', authTestError)
  } else {
    const testAuthUsers = authTestUsers?.users?.filter(u => u.email?.includes('arthur+test-17594')) || []
    console.log(`Found ${testAuthUsers.length} test users in auth.users`)

    for (const authUser of testAuthUsers.slice(0, 5)) {
      // Vérifier si ce user existe dans public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id, email')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (publicError) {
        console.error(`  ❌ Error checking ${authUser.email}:`, publicError.message)
      } else if (publicUser) {
        console.log(`  ✅ ${authUser.email} → EXISTS in public.users`)
      } else {
        console.log(`  ⚠️  ${authUser.email} → MISSING from public.users (trigger failed?)`)
      }
    }
  }

  // Test 3: Compter les utilisateurs
  console.log('\n--- Test 3: Count users ---')
  const { count, error: countError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Error counting users:', countError)
  } else {
    console.log(`Total users in database: ${count}`)
  }

  // Test 4: Test auth.users pour voir les utilisateurs Supabase Auth
  console.log('\n--- Test 4: List auth.users (via admin API) ---')
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 5
  })

  if (authError) {
    console.error('Error listing auth users:', authError)
  } else {
    console.log(`Found ${authUsers?.users?.length || 0} auth users`)
    authUsers?.users?.slice(0, 3).forEach(u =>
      console.log(`  - ${u.email} (confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'})`)
    )
  }
}

testServiceRoleAccess().catch(console.error)