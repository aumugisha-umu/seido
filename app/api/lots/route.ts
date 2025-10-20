import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createLotService } from '@/lib/services/domain/lot.service'
import type { LotInsert } from '@/lib/services/core/service-types'

/**
 * GET /api/lots
 * Récupère la liste des lots (filtrable par building ou team)
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

    // Parser query params
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    logger.info({
      buildingId,
      userId: userProfile.id,
      role: userProfile.role
    }, '🏠 [LOTS-API] GET request')

    // Initialiser le service
    const lotService = await createLotService()

    // Récupérer les lots
    let result
    if (buildingId) {
      result = await lotService.getLotsByBuilding(buildingId)
    } else if (page && limit) {
      result = await lotService.getAll({
        page: parseInt(page),
        limit: parseInt(limit)
      })
    } else {
      result = await lotService.getAll()
    }

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [LOTS-API] Error fetching lots')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des lots'
      }, { status: 500 })
    }

    logger.info({ count: result.data?.length || 0 }, '✅ [LOTS-API] Lots fetched successfully')

    return NextResponse.json({
      success: true,
      lots: result.data || []
    })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * POST /api/lots
 * Crée un nouveau lot
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

    // Vérifier les permissions
    if (!['gestionnaire', 'admin'].includes(userProfile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Permission refusée : seuls les gestionnaires et admins peuvent créer des lots'
      }, { status: 403 })
    }

    // Parser le body
    const body: LotInsert = await request.json()

    logger.info({
      reference: body.reference,
      buildingId: body.building_id,
      userId: userProfile.id
    }, '🏠 [LOTS-API] POST request - Creating lot')

    // Valider les champs requis
    if (!body.reference || !body.building_id || !body.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants : reference, building_id, team_id'
      }, { status: 400 })
    }

    // Initialiser le service
    const lotService = await createLotService()

    // Créer le lot
    const result = await lotService.create({
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (!result.success) {
      logger.error({ error: result.error }, '❌ [LOTS-API] Error creating lot')
      return NextResponse.json({
        success: false,
        error: typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Erreur lors de la création du lot'
      }, { status: 400 })
    }

    logger.info({ lotId: result.data?.id }, '✅ [LOTS-API] Lot created successfully')

    return NextResponse.json({
      success: true,
      lot: result.data
    }, { status: 201 })

  } catch (error) {
    logger.error({ error }, '❌ [LOTS-API] Unexpected error in POST')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
