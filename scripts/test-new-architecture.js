// Script de test pour vérifier la nouvelle architecture simplifiée
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testArchitecture() {
  console.log('🚀 Test de la nouvelle architecture simplifiée...\n')

  try {
    // Test 1: Vérifier les tables principales
    console.log('📋 Test 1: Vérification des tables...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(1)
    
    if (usersError) {
      console.error('❌ Table users:', usersError.message)
    } else {
      console.log('✅ Table users accessible')
    }

    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(1)
    
    if (buildingsError) {
      console.error('❌ Table buildings:', buildingsError.message)
    } else {
      console.log('✅ Table buildings accessible')
    }

    const { data: buildingContacts, error: bcError } = await supabase
      .from('building_contacts')
      .select('id, contact_type, is_primary')
      .limit(1)
    
    if (bcError) {
      console.error('❌ Table building_contacts:', bcError.message)
    } else {
      console.log('✅ Table building_contacts accessible')
    }

    const { data: lotContacts, error: lcError } = await supabase
      .from('lot_contacts')
      .select('id, contact_type, is_primary')
      .limit(1)
    
    if (lcError) {
      console.error('❌ Table lot_contacts:', lcError.message)
    } else {
      console.log('✅ Table lot_contacts accessible')
    }

    // Test 2: Test d'une requête avec relation
    console.log('\n📋 Test 2: Requête avec relations...')
    
    const { data: buildingsWithContacts, error: relationError } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        building_contacts(
          contact_type,
          is_primary,
          user:user_id(id, name, email)
        )
      `)
      .limit(1)
    
    if (relationError) {
      console.error('❌ Requête avec relations:', relationError.message)
    } else {
      console.log('✅ Requêtes avec relations fonctionnent')
      console.log('Sample data:', JSON.stringify(buildingsWithContacts, null, 2))
    }

    console.log('\n🎯 Tests terminés !')

  } catch (error) {
    console.error('🚨 Erreur inattendue:', error)
  }
}

testArchitecture()
