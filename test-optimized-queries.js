// Test optimized database queries
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Performance monitoring
class QueryPerformance {
  constructor(name) {
    this.name = name
    this.startTime = performance.now()
  }

  end() {
    const duration = performance.now() - this.startTime
    console.log(`⚡ [PERF] ${this.name}: ${duration.toFixed(2)}ms`)
    return duration
  }
}

async function testOptimizedQueries() {
  const teamId = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c'

  console.log('🚀 Testing Optimized Queries with Supabase 2025 Best Practices')
  console.log('Team ID:', _teamId)
  console.log('='.repeat(70))

  // Test 1: Optimized building query with select columns
  console.log('\n1️⃣ OPTIMIZED BUILDING QUERY')
  const perf1 = new QueryPerformance('Buildings Query')

  const { data: buildings, error: buildingError, count: buildingCount } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      address,
      city,
      postal_code,
      team_id,
      building_contacts!inner (
        is_primary,
        user:user_id (
          id,
          name,
          role
        )
      )
    `, { count: 'exact' })
    .eq('team_id', _teamId)
    .order('name')

  const buildingTime = perf1.end()

  if (buildingError) {
    console.error('❌ Error:', buildingError)
  } else {
    console.log(`✅ Found ${buildingCount} buildings`)
    if (buildings?.length > 0) {
      console.log('Buildings:', buildings.map(b => ({
        name: b.name,
        manager: b.building_contacts?.find(c => c.user?.role === 'gestionnaire')?.user?.name
      })))
    }
  }

  // Test 2: Parallel queries with Promise.allSettled
  console.log('\n2️⃣ PARALLEL QUERY EXECUTION')
  const perf2 = new QueryPerformance('Parallel Queries')

  const [usersResult, interventionsResult, lotsResult] = await Promise.allSettled([
    supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('team_id', _teamId)
      .order('name'),

    supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id (
          reference,
          building:building_id (name)
        )
      `)
      .eq('team_id', _teamId)
      .limit(5)
      .order('created_at', { ascending: false }),

    supabase
      .from('lots')
      .select(`
        *,
        lot_contacts (
          is_primary,
          user:user_id (
            id,
            name,
            role
          )
        )
      `)
      .in('building_id', buildings?.map(b => b.id) || [])
  ])

  const parallelTime = perf2.end()

  // Process results
  const users = usersResult.status === 'fulfilled' ? usersResult.value.data : []
  const userCount = usersResult.status === 'fulfilled' ? usersResult.value.count : 0
  const interventions = interventionsResult.status === 'fulfilled' ? interventionsResult.value.data : []
  const lots = lotsResult.status === 'fulfilled' ? lotsResult.value.data : []

  console.log(`✅ Users: ${userCount} found`)
  console.log(`✅ Interventions: ${interventions?.length || 0} found`)
  console.log(`✅ Lots: ${lots?.length || 0} found`)

  // Test 3: Bulk query for multiple buildings
  console.log('\n3️⃣ BULK QUERY OPTIMIZATION')

  if (buildings?.length > 0) {
    const buildingIds = buildings.map(b => b.id)
    const perf3 = new QueryPerformance('Bulk Lots Query')

    const { data: bulkLots, error: bulkError } = await supabase
      .from('lots')
      .select('*, building_id')
      .in('building_id', buildingIds)
      .order('building_id')
      .order('reference')

    const bulkTime = perf3.end()

    if (bulkError) {
      console.error('❌ Bulk query error:', bulkError)
    } else {
      // Group by building
      const lotsByBuilding = bulkLots?.reduce((acc, lot) => {
        if (!acc[lot.building_id]) acc[lot.building_id] = []
        acc[lot.building_id].push(lot)
        return acc
      }, {}) || {}

      console.log(`✅ Bulk loaded ${bulkLots?.length || 0} lots across ${Object.keys(lotsByBuilding).length} buildings`)
    }
  }

  // Test 4: Paginated query
  console.log('\n4️⃣ PAGINATED QUERY')
  const perf4 = new QueryPerformance('Paginated Users Query')

  const pageSize = 2
  const { data: page1, error: pageError, count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('team_id', _teamId)
    .range(0, pageSize - 1)
    .order('name')

  const paginatedTime = perf4.end()

  if (pageError) {
    console.error('❌ Pagination error:', pageError)
  } else {
    console.log(`✅ Page 1 of ${Math.ceil(totalUsers / pageSize)}: ${page1?.length} users`)
    console.log(`Total users: ${totalUsers}`)
  }

  // Test 5: Real-time subscription setup (just test the setup, not actual subscription)
  console.log('\n5️⃣ REAL-TIME SUBSCRIPTION SETUP')
  const channel = supabase
    .channel(`test-interventions-${teamId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'interventions',
        filter: `team_id=eq.${teamId}`
      },
      (payload) => {
        console.log('Real-time update:', payload)
      }
    )

  console.log('✅ Real-time channel created (not subscribed)')

  // Clean up
  supabase.removeChannel(channel)

  // Performance Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 PERFORMANCE SUMMARY')
  console.log(`Buildings query: ${buildingTime.toFixed(2)}ms`)
  console.log(`Parallel queries: ${parallelTime.toFixed(2)}ms`)
  console.log(`Paginated query: ${paginatedTime.toFixed(2)}ms`)

  const totalTime = buildingTime + parallelTime + paginatedTime
  console.log(`Total time: ${totalTime.toFixed(2)}ms`)

  // Recommendations
  console.log('\n🎯 RECOMMENDATIONS')
  console.log('1. Use select with specific columns to reduce payload')
  console.log('2. Implement parallel queries with Promise.allSettled for resilience')
  console.log('3. Use bulk queries with IN operator for related data')
  console.log('4. Implement pagination for large datasets')
  console.log('5. Set up real-time subscriptions for live updates')
  console.log('6. Add proper error handling with typed errors')
  console.log('7. Monitor query performance with timing')
}

testOptimizedQueries().catch(console.error)