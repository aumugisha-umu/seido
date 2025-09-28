import { createClient } from '@supabase/supabase-js'

import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

// Créer un client Supabase avec les permissions service-role pour bypass les RLS
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!supabaseServiceRoleKey || !supabaseUrl) {
  console.warn('⚠️ Service role key or URL not configured')
}

const supabaseAdmin = supabaseServiceRoleKey ? createClient<Database>(
  supabaseUrl!,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      name,
      first_name,
      last_name,
      email,
      phone,
      address,
      notes,
      role, // ✅ Nouveau champ direct
      provider_category, // ✅ Nouveau champ direct  
      speciality,
      team_id,
      is_active = true
    } = body

    console.log('🚀 [CREATE-CONTACT-API] Received request:', { 
      email, 
      role, 
      provider_category,
      team_id,
      hasServiceRole: !!supabaseAdmin 
    })

    // ✅ Validation des données requises (nouvelle logique)
    if (!name || !email || !role || !team_id) {
      return NextResponse.json(
        { error: 'Données requises manquantes: name, email, role, team_id' },
        { status: 400 }
      )
    }

    // ✅ Validation spécifique pour les prestataires
    if (role === 'prestataire' && !provider_category) {
      return NextResponse.json(
        { error: 'provider_category est obligatoire pour les prestataires' },
        { status: 400 }
      )
    }

    // Préparer l'objet user (nouvelle architecture)
    const userToCreate = {
      email,
      name,
      first_name: first_name || null,
      last_name: last_name || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
      company: null, // Peut être ajouté plus tard
      speciality: (speciality && speciality.trim()) ? 
        speciality as Database['public']['Enums']['intervention_type'] : null,
      role: role as Database['public']['Enums']['user_role'],
      provider_category: provider_category as Database['public']['Enums']['provider_category'] | null,
      team_id,
      is_active
    }

    console.log('📝 [CREATE-CONTACT-API] User data:', JSON.stringify(userToCreate, null, 2))

    let result;

    // Méthode 1: Utiliser le client admin si disponible (bypass RLS)
    if (supabaseAdmin) {
      console.log('🔐 [CREATE-CONTACT-API] Using admin client (service role)')
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert(userToCreate)
        .select()
        .single()

      if (error) {
        console.error('❌ [CREATE-CONTACT-API] Admin insert failed:', error)
        throw error
      }

      result = data
    } else {
      // Méthode 2: Utiliser le service contact normal (fallback)
      console.log('📝 [CREATE-CONTACT-API] Using normal contact service (fallback)')
      result = await contactService.create(userToCreate)
    }

    console.log('✅ [CREATE-CONTACT-API] User/Contact created successfully:', result.id)

    return NextResponse.json({
      success: true,
      contact: result
    })

  } catch (error) {
    console.error('❌ [CREATE-CONTACT-API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création du contact', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
