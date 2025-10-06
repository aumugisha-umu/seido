// Test the current database query
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

async function testCurrentQuery() {
  const teamId = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c'

  console.log('Testing current query structure...')
  console.log('Team ID:', teamId)
  console.log('='.repeat(60))

  // Test the exact query from database-service.ts
  console.log('\n🔍 Testing exact query from database-service.ts:')

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      team:team_id(id, name, description),
      lots(
        id,
        reference,
        is_occupied,
        category,
        lot_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      ),
      building_contacts(
        is_primary,
        user:user_id(id, name, email, phone, role, provider_category)
      )
    `)
    .eq('team_id', teamId)
    .order('name')

  if (error) {
    console.error('❌ Query error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
  } else {
    console.log('✅ Query successful!')
    console.log(`Found ${data?.length || 0} buildings`)

    if (data && data.length > 0) {
      console.log('\nBuilding details:')
      data.forEach((building, index) => {
        console.log(`\n${index + 1}. ${building.name}`)
        console.log('   ID:', building.id)
        console.log('   Team ID:', building.team_id)
        console.log('   Team:', building.team?.name || 'No team')
        console.log('   Lots:', building.lots?.length || 0)
        console.log('   Contacts:', building.building_contacts?.length || 0)
      })
    }
  }

  // Test simplified query
  console.log('\n\n🔍 Testing simplified query (without relations):')

  const { data: simpleData, error: simpleError } = await supabase
    .from('buildings')
    .select('*')
    .eq('team_id', teamId)
    .order('name')

  if (simpleError) {
    console.error('❌ Simple query error:', simpleError)
  } else {
    console.log('✅ Simple query successful!')
    console.log(`Found ${simpleData?.length || 0} buildings`)

    if (simpleData && simpleData.length > 0) {
      console.log('Building names:', simpleData.map(b => b.name))
    }
  }

  // Test with just building_contacts
  console.log('\n\n🔍 Testing with just building_contacts:')

  const { data: contactData, error: contactError } = await supabase
    .from('buildings')
    .select(`
      *,
      building_contacts(
        is_primary,
        user:user_id(id, name, email, phone, role, provider_category)
      )
    `)
    .eq('team_id', teamId)
    .order('name')

  if (contactError) {
    console.error('❌ Contacts query error:', contactError)
  } else {
    console.log('✅ Contacts query successful!')
    console.log(`Found ${contactData?.length || 0} buildings`)
  }

  console.log('\n' + '='.repeat(60))
}

testCurrentQuery().catch(console.error)