import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerSession } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
      // Paramètres de filtrage
    const userId = searchParams.get('user_id')
    const teamId = searchParams.get('team_id')
    const scope = searchParams.get('scope') // 'personal' | 'team' | null (all)
    const read = searchParams.get('read')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Vérifier l'authentification
    const session = await getServerSession()
    if (!session) {
      logger.info({}, '❌ [NOTIFICATIONS-API] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info({
      userId,
      teamId,
      scope,
      read,
      type,
      limit,
      offset,
      sessionUserId: session.user.id
    }, '🔍 [NOTIFICATIONS-API] Request params:')

    const supabaseGet = await createServerSupabaseClient()

    // ✅ CONVERSION AUTH ID → DATABASE ID
    // Récupérer l'ID utilisateur de la table users à partir de l'ID Supabase Auth
    const { createServerUserService } = await import('@/lib/services')
    const userService = createServerUserService()
    const dbUserGet = await userService.findByAuthUserId(session.user.id)
    
    if (!dbUserGet) {
      logger.info({ user: session.user.id }, '❌ [NOTIFICATIONS-API] User not found in database for auth ID:')
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }
    
    logger.info({
      authId: session.user.id,
      dbUserId: dbUserGet.id
    }, '🔄 [NOTIFICATIONS-API] Auth ID converted:')

    // Construire la requête de base
    let query = supabaseGet
      .from('notifications')
      .select(`
        *,
        created_by_user:users!created_by(
          id,
          name,
          email
        ),
        team:teams!team_id(
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    // Appliquer les filtres selon le scope
    if (scope === 'personal') {
      logger.info({}, '🔍 [NOTIFICATIONS-API] Using personal scope filter')
      // Notifications personnelles : seulement celles adressées à l'utilisateur connecté avec is_personal = true
      query = query.eq('user_id', dbUserGet.id).eq('is_personal', true)
      if (teamId) {
        query = query.eq('team_id', teamId)
      }
    } else if (scope === 'team') {
      logger.info({}, '🔍 [NOTIFICATIONS-API] Using team scope filter')
      // Notifications d'équipe : notifications de l'équipe avec is_personal = false ET destinées à l'utilisateur connecté
      if (teamId) {
        query = query.eq('team_id', teamId).eq('user_id', dbUserGet.id).eq('is_personal', false)
      } else {
        logger.info({}, '❌ [NOTIFICATIONS-API] team_id required for team scope')
        // Si pas de teamId spécifié pour le scope team, renvoyer erreur
        return NextResponse.json(
          { error: 'team_id is required for team scope' },
          { status: 400 }
        )
      }
    } else {
      logger.info({}, '🔍 [NOTIFICATIONS-API] Using default scope filter')
      // Comportement par défaut (toutes les notifications selon les filtres)
      if (_userId) {
        query = query.eq('user_id', _userId)
      }
      if (teamId) {
        query = query.eq('team_id', teamId)
      }
    }
    
    if (read !== null) {
      query = query.eq('read', read === 'true')
    }
    
    if (type) {
      query = query.eq('type', type)
    }
    
    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error } = await query

    if (error) {
      logger.error({ error: error }, '❌ [NOTIFICATIONS-API] Database error:')
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    logger.info({
      count: notifications?.length || 0,
      notifications: notifications?.map(n => ({
        id: n.id,
        title: n.title,
        is_personal: n.is_personal,
        user_id: n.user_id,
        team_id: n.team_id,
        read: n.read,
        created_at: n.created_at
      }, '📊 [NOTIFICATIONS-API] Query result:'))
    })

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications?.length || 0
    })

  } catch (error) {
    logger.error({ error: error }, 'Notifications API error:')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Vérifier l'authentification
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabasePost = await createServerSupabaseClient()

    // ✅ CONVERSION AUTH ID → DATABASE ID
    const { createServerUserService } = await import('@/lib/services')
    const userService = createServerUserService()
    const dbUserPost = await userService.findByAuthUserId(session.user.id)
    
    if (!dbUserPost) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    const {
      user_id,
      team_id,
      type,
      priority = 'normal',
      title,
      message,
      is_personal = false,
      metadata = {},
      related_entity_type,
      related_entity_id
    } = body

    // Validation des champs requis
    if (!user_id || !team_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, team_id, type, title, message' },
        { status: 400 }
      )
    }

    const { data: notification, error } = await supabasePost
      .from('notifications')
      .insert({
        user_id,
        team_id,
        created_by: dbUserPost.id,
        type,
        priority,
        title,
        message,
        is_personal,
        metadata,
        related_entity_type,
        related_entity_id
      })
      .select('*')
      .single()

    if (error) {
      logger.error({ error: error }, 'Error creating notification:')
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notification
    })

  } catch (error) {
    logger.error({ error: error }, 'Create notification error:')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const body = await request.json()
    
    const notificationId = searchParams.get('id')
    const action = body.action // 'mark_read', 'mark_unread', 'archive', etc.
    
    // Vérifier l'authentification
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    let updateData = {}

    switch (action) {
      case 'mark_read':
        updateData = { read: true, read_at: new Date().toISOString() }
        break
      case 'mark_unread':
        updateData = { read: false, read_at: null }
        break
      case 'archive':
        updateData = { archived: true }
        break
      case 'unarchive':
        updateData = { archived: false }
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: mark_read, mark_unread, archive, unarchive' },
          { status: 400 }
        )
    }

    const supabasePatch = await createServerSupabaseClient()

    // ✅ CONVERSION AUTH ID → DATABASE ID
    const { createServerUserService } = await import('@/lib/services')
    const userService = createServerUserService()
    const dbUserPatch = await userService.findByAuthUserId(session.user.id)
    
    if (!dbUserPatch) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    // Pour les notifications d'équipe, vérifier que l'utilisateur fait partie de l'équipe
    // Pour les notifications personnelles, vérifier que l'utilisateur est le propriétaire
    const { data: notificationCheck, error: checkError } = await supabasePatch
      .from('notifications')
      .select(`
        id,
        user_id,
        team_id,
        teams!team_id(
          id,
          team_members!inner(
            user_id
          )
        )
      `)
      .eq('id', notificationId)
      .single()

    if (checkError || !notificationCheck) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Vérifier les permissions : soit c'est sa notification personnelle, soit il fait partie de l'équipe
    const isOwner = notificationCheck.user_id === dbUserPatch.id
    const isTeamMember = notificationCheck.teams?.team_members?.some((member) => member.user_id === dbUserPatch.id)

    if (!isOwner && !isTeamMember) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this notification' },
        { status: 403 }
      )
    }

    const { data: notification, error } = await supabasePatch
      .from('notifications')
      .update(updateData)
      .eq('id', notificationId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notification
    })

  } catch (error) {
    logger.error({ error: error }, 'Update notification error:')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
