// Test database queries to identify the issue
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

async function testQueries() {
  const teamId = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c'

  console.log('Testing database queries...\n')
  console.log('Team ID:', teamId)
  console.log('='.repeat(50))

  // Test 1: Check if buildings exist at all
  console.log('\n1. CHECKING ALL BUILDINGS IN DATABASE:')
  const { data: allBuildings, error: allError } = await supabase
    .from('buildings')
    .select('id, name, team_id')
    .limit(10)

  if (allError) {
    console.error('Error fetching all buildings:', allError)
  } else {
    console.log(`Found ${allBuildings?.length || 0} buildings total`)
    if (allBuildings?.length > 0) {
      console.log('Sample buildings:', JSON.stringify(allBuildings.slice(0, 3), null, 2))
    }
  }

  // Test 2: Check team_id values in buildings
  console.log('\n2. CHECKING TEAM_ID VALUES IN BUILDINGS:')
  const { data: teamIds, error: teamError } = await supabase
    .from('buildings')
    .select('team_id')
    .not('team_id', 'is', null)
    .limit(10)

  if (teamError) {
    console.error('Error fetching team IDs:', teamError)
  } else {
    const uniqueTeamIds = [...new Set(teamIds?.map(b => b.team_id))]
    console.log('Unique team IDs found:', uniqueTeamIds)
  }

  // Test 3: Query buildings for specific team
  console.log('\n3. QUERYING BUILDINGS FOR SPECIFIC TEAM:')
  const { data: teamBuildings, error: teamBuildingsError } = await supabase
    .from('buildings')
    .select('*')
    .eq('team_id', teamId)

  if (teamBuildingsError) {
    console.error('Error fetching team buildings:', teamBuildingsError)
  } else {
    console.log(`Found ${teamBuildings?.length || 0} buildings for team ${teamId}`)
    if (teamBuildings?.length > 0) {
      console.log('Buildings found:', JSON.stringify(teamBuildings, null, 2))
    }
  }

  // Test 4: Check if the team exists
  console.log('\n4. CHECKING IF TEAM EXISTS:')
  const { data: team, error: teamCheckError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single()

  if (teamCheckError) {
    console.error('Error fetching team:', teamCheckError)
  } else {
    console.log('Team found:', team ? 'YES' : 'NO')
    if (team) {
      console.log('Team name:', team.name)
    }
  }

  // Test 5: Check users for this team
  console.log('\n5. CHECKING USERS FOR TEAM:')
  const { data: teamUsers, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, team_id')
    .eq('team_id', teamId)
    .limit(5)

  if (usersError) {
    console.error('Error fetching team users:', usersError)
  } else {
    console.log(`Found ${teamUsers?.length || 0} users for team`)
    if (teamUsers?.length > 0) {
      console.log('Sample users:', teamUsers.map(u => ({ name: u.name, email: u.email })))
    }
  }

  // Test 6: Check lots for buildings
  console.log('\n6. CHECKING LOTS:')
  if (teamBuildings?.length > 0) {
    const buildingId = teamBuildings[0].id
    console.log('Checking lots for building:', buildingId)

    const { data: lots, error: lotsError } = await supabase
      .from('lots')
      .select('*')
      .eq('building_id', buildingId)

    if (lotsError) {
      console.error('Error fetching lots:', lotsError)
    } else {
      console.log(`Found ${lots?.length || 0} lots for building`)
      if (lots?.length > 0) {
        console.log('Sample lots:', lots.slice(0, 2).map(l => ({ id: l.id, reference: l.reference })))
      }
    }
  } else {
    // Check if there are any lots at all
    const { data: anyLots, error: anyLotsError } = await supabase
      .from('lots')
      .select('id, reference, building_id')
      .limit(5)

    if (anyLotsError) {
      console.error('Error fetching any lots:', anyLotsError)
    } else {
      console.log(`Found ${anyLots?.length || 0} lots in database`)
      if (anyLots?.length > 0) {
        console.log('Sample lots:', anyLots)
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('Test completed')
}

testQueries().catch(console.error)