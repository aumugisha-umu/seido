import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

export async function GET(request: NextRequest) {
  try {
    // ✅ AUTH: 29 lignes → 3 lignes! (centralisé dans getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase } = authResult.data

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const type = searchParams.get('type') // 'prestataire', 'locataire', 'gestionnaire'

    if (!teamId) {
      return NextResponse.json({
        success: false,
        error: 'teamId est requis'
      }, { status: 400 })
    }

    logger.info({ teamId, type: type || 'all' }, "🔍 [TEAM-CONTACTS] Fetching team contacts")

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
      .eq('team_id', teamId)
      .eq('is_active', true)

    logger.info({ teamId }, "📋 [TEAM-CONTACTS] Base query with is_active=true")

    // Filter by role if type is specified
    if (type) {
      logger.info({ type }, "🔍 [TEAM-CONTACTS] Filtering by type:")
      switch (type) {
        case 'prestataire':
          query = query.eq('role', 'prestataire')
          logger.info({}, "📋 [TEAM-CONTACTS] Added filter: role=prestataire")
          break
        case 'locataire':
          query = query.eq('role', 'locataire')
          break
        case 'gestionnaire':
          query = query.eq('role', 'gestionnaire')
          break
        default:
          logger.info({ type }, "⚠️ [TEAM-CONTACTS] Unknown type, no additional filter applied")
          break
      }
    }

    const { data: contacts, error } = await query

    if (error) {
      logger.error({ error: error }, '❌ [TEAM-CONTACTS] Error fetching team contacts:')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des contacts'
      }, { status: 500 })
    }

    logger.info({ contactCount: contacts?.length || 0, teamId }, "✅ [TEAM-CONTACTS] Found contacts for team")
    logger.info(`📊 [TEAM-CONTACTS] Contacts details:`, contacts?.map(c => ({ 
      id: c.id, 
      name: c.name, 
      role: c.role, 
      provider_category: c.provider_category,
      team_id: teamId
    })))

    // ⚡ CACHE: 5 minutes pour les contacts d'équipe (données stables)
    return NextResponse.json({
      success: true,
      contacts: contacts || []
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
      }
    })

  } catch (error) {
    logger.error({ error: error }, '❌ Error in team-contacts API:')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
