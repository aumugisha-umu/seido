import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createBuildingService } from '@/lib/services/domain/building.service'
import { createBuildingRepository } from '@/lib/services/repositories/building.repository'
import type { CreateBuildingDTO } from '@/lib/services/core/service-types'

/**
 * GET /api/buildings
 * Récupère la liste des bâtiments (filtrable par équipe)
 */
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

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({
        success: false,
        error: 'Non autorisé'
      }, { status: 401 })
    }

    // Récupérer le profil utilisateur pour le rôle
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, team_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'Profil utilisateur introuvable'
      }, { status: 404 })
    }

    // Parser query params
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    logger.info({ teamId, userId: userProfile.id, role: userProfile.role }, '🏢 [BUILDINGS-API] GET request')

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Récupérer les bâtiments
    let result
    if (teamId) {
      result = await buildingService.getBuildingsByTeam(teamId, {
        userId: userProfile.id,
        userRole: userProfile.role
      })
    } else if (page && limit) {
      result = await buildingService.getAll({
        page: parseInt(page),
        limit: parseInt(limit)
      })
    } else {
      result = await buildingService.getAll()
    }

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [BUILDINGS-API] Error fetching buildings')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des bâtiments'
      }, { status: 500 })
    }

    logger.info({ count: result.data?.length || 0 }, '✅ [BUILDINGS-API] Buildings fetched successfully')

    return NextResponse.json({
      success: true,
      buildings: result.data || []
    })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * POST /api/buildings
 * Crée un nouveau bâtiment
 */
export async function POST(request: NextRequest) {
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

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({
        success: false,
        error: 'Non autorisé'
      }, { status: 401 })
    }

    // Récupérer le profil utilisateur
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, team_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'Profil utilisateur introuvable'
      }, { status: 404 })
    }

    // Vérifier les permissions (seuls gestionnaires et admins)
    if (!['gestionnaire', 'admin'].includes(userProfile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Permission refusée : seuls les gestionnaires et admins peuvent créer des bâtiments'
      }, { status: 403 })
    }

    // Parser le body
    const body: CreateBuildingDTO = await request.json()

    logger.info({
      name: body.name,
      teamId: body.team_id,
      userId: userProfile.id
    }, '🏢 [BUILDINGS-API] POST request - Creating building')

    // Valider les champs requis
    if (!body.name || !body.address || !body.city || !body.postal_code || !body.team_id || !body.gestionnaire_id) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants : name, address, city, postal_code, team_id, gestionnaire_id'
      }, { status: 400 })
    }

    // Initialiser le service
    const buildingService = createBuildingService(supabase)

    // Créer le bâtiment
    const result = await buildingService.create({
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [BUILDINGS-API] Error creating building')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la création du bâtiment'
      }, { status: 400 })
    }

    logger.info({ buildingId: result.data?.id }, '✅ [BUILDINGS-API] Building created successfully')

    return NextResponse.json({
      success: true,
      building: result.data
    }, { status: 201 })

  } catch (error) {
    logger.error({ error }, '❌ [BUILDINGS-API] Unexpected error in POST')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
