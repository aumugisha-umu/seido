import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService, tenantService, teamService, buildingService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log("🔧 create-intervention API route called")
  
  try {
    // Get the authenticated user
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({
        success: false,
        error: 'Erreur d\'authentification'
      }, { status: 401 })
    }
    
    if (!authUser) {
      console.error("❌ No authenticated user")
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non authentifié'
      }, { status: 401 })
    }

    console.log("✅ Authenticated user:", authUser.id)

    // Parse the request body
    const body = await request.json()
    console.log("📝 Request body:", body)
    
    const {
      title,
      description,
      type,
      urgency,
      lot_id,
      files,
      availabilities
    } = body

    // Validate required fields
    if (!title || !description || !lot_id) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants (titre, description, lot_id)'
      }, { status: 400 })
    }

    // Get user data from database
    console.log("👤 Getting user data...")
    const user = await userService.getById(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    console.log("✅ User found:", user.name, user.role)

    // Get team ID for the intervention
    let teamId = null

    if (user.role === 'locataire') {
      // Get the team associated with this tenant via their lot
      console.log("👥 Getting tenant's team...")
      const tenantData = await tenantService.getTenantData(authUser.id)
      if (tenantData?.team_id) {
        teamId = tenantData.team_id
        console.log("✅ Found team ID from lot:", teamId)
      } else {
        // Get team from building via buildingService if not directly available
        try {
          if (tenantData?.building_id) {
            const building = await buildingService.getById(tenantData.building_id)
            if (building?.team_id) {
              teamId = building.team_id
              console.log("✅ Found team ID from building:", teamId)
            }
          }
        } catch (error) {
          console.warn("⚠️ Could not get building details for team ID:", error)
        }
      }
    } else {
      // For other roles, get team from teamService
      console.log("👥 Getting user's team...")
      const userTeams = await teamService.getUserTeams(authUser.id)
      if (userTeams.length > 0) {
        teamId = userTeams[0].id
        console.log("✅ Found team ID:", teamId)
      }
    }

    if (!teamId) {
      console.warn("⚠️ No team found for user, intervention will be created without team association")
    }

    // Map frontend values to database enums
    const mapInterventionType = (frontendType: string): Database['public']['Enums']['intervention_type'] => {
      const typeMapping: Record<string, Database['public']['Enums']['intervention_type']> = {
        'maintenance': 'autre',
        'plumbing': 'plomberie',
        'electrical': 'electricite',
        'heating': 'chauffage',
        'locksmith': 'serrurerie',
        'painting': 'peinture',
        'cleaning': 'menage',
        'gardening': 'jardinage',
        'other': 'autre',
        // Already correct values
        'plomberie': 'plomberie',
        'electricite': 'electricite',
        'chauffage': 'chauffage',
        'serrurerie': 'serrurerie',
        'peinture': 'peinture',
        'menage': 'menage',
        'jardinage': 'jardinage',
        'autre': 'autre'
      }
      return typeMapping[frontendType] || 'autre'
    }

    const mapUrgencyLevel = (frontendUrgency: string): Database['public']['Enums']['intervention_urgency'] => {
      const urgencyMapping: Record<string, Database['public']['Enums']['intervention_urgency']> = {
        'low': 'basse',
        'medium': 'normale',
        'high': 'haute',
        'urgent': 'urgente',
        // Already correct values
        'basse': 'basse',
        'normale': 'normale',
        'haute': 'haute',
        'urgente': 'urgente'
      }
      return urgencyMapping[frontendUrgency] || 'normale'
    }

    // Generate unique reference for the intervention
    const generateReference = () => {
      const timestamp = new Date().toISOString().slice(2, 10).replace('-', '').replace('-', '') // YYMMDD
      const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4 random chars
      return `INT-${timestamp}-${random}`
    }

    // Prepare intervention data (tenant_id is required)
    const interventionData = {
      title,
      description,
      type: mapInterventionType(type || ''),
      urgency: mapUrgencyLevel(urgency || ''),
      reference: generateReference(),
      lot_id,
      tenant_id: authUser.id, // Always use the authenticated user's ID
      manager_id: user.role === 'gestionnaire' ? user.id : null,
      team_id: teamId,
      status: 'nouvelle_demande' as Database['public']['Enums']['intervention_status']
    }

    console.log("📝 Creating intervention with data:", interventionData)

    // Create the intervention
    const intervention = await interventionService.create(interventionData)
    console.log("✅ Intervention created:", intervention.id)

    // TODO: Handle file uploads if provided
    if (files && files.length > 0) {
      console.log("📎 File handling not yet implemented, files provided:", files.length)
      // This would involve uploading files to Supabase Storage and linking them to the intervention
    }

    // TODO: Handle availabilities if provided
    if (availabilities && availabilities.length > 0) {
      console.log("📅 Availability handling not yet implemented, availabilities provided:", availabilities.length)
      // This would involve creating records in an intervention_availabilities table
    }

    console.log("🎉 Intervention creation completed successfully")

    return NextResponse.json({
      success: true,
      intervention: {
        id: intervention.id,
        title: intervention.title,
        status: intervention.status,
        created_at: intervention.created_at
      },
      message: 'Intervention créée avec succès'
    })

  } catch (error) {
    console.error("❌ Error in create-intervention API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création de l\'intervention'
    }, { status: 500 })
  }
}
