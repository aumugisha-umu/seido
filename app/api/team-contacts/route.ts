import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({
        success: false,
        error: 'Non autorisé'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const type = searchParams.get('type') // 'prestataire', 'locataire', 'gestionnaire'

    if (!_teamId) {
      return NextResponse.json({
        success: false,
        error: 'teamId est requis'
      }, { status: 400 })
    }

    console.log(`🔍 [TEAM-CONTACTS] Fetching team contacts for team ${teamId}, type: ${type || 'all'}`)

    // Get all users from the team
    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        provider_category,
        speciality,
        is_active
      `)
      .eq('team_id', _teamId)
      .eq('is_active', true)

    console.log(`📋 [TEAM-CONTACTS] Base query: team_id=${teamId}, is_active=true`)

    // Filter by role if type is specified
    if (type) {
      console.log(`🔍 [TEAM-CONTACTS] Filtering by type: ${type}`)
      switch (type) {
        case 'prestataire':
          query = query.eq('role', 'prestataire')
          console.log(`📋 [TEAM-CONTACTS] Added filter: role=prestataire`)
          break
        case 'locataire':
          query = query.eq('role', 'locataire')
          break
        case 'gestionnaire':
          query = query.eq('role', 'gestionnaire')
          break
        default:
          console.log(`⚠️ [TEAM-CONTACTS] Unknown type: ${type}, no additional filter applied`)
          break
      }
    }

    const { data: contacts, error } = await query

    if (error) {
      console.error('❌ [TEAM-CONTACTS] Error fetching team contacts:', error)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des contacts'
      }, { status: 500 })
    }

    console.log(`✅ [TEAM-CONTACTS] Found ${contacts?.length || 0} contacts for team ${teamId}`)
    console.log(`📊 [TEAM-CONTACTS] Contacts details:`, contacts?.map(c => ({ 
      id: c.id, 
      name: c.name, 
      role: c.role, 
      provider_category: c.provider_category,
      team_id: teamId
    })))

    return NextResponse.json({
      success: true,
      contacts: contacts || []
    })

  } catch (error) {
    console.error('❌ Error in team-contacts API:', error)
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
