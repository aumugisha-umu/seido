import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { notificationActionSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { sendPushNotification } from '@/lib/send-push-notification'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'

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

    // ✅ AUTH: getServerSession + createServerSupabaseClient + userService → getApiAuthContext (44 lignes → 3 lignes)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase: supabaseGet, authUser, userProfile: dbUserGet } = authResult.data

    logger.info({
      userId,
      teamId,
      scope,
      read,
      type,
      limit,
      offset,
      sessionUserId: authUser.id
    }, '🔍 [NOTIFICATIONS-API] Request params:')

    logger.info({
      authId: authUser.id,
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
      if (userId) {
        query = query.eq('user_id', userId)
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

    // ✅ AUTH: getServerSession + createServerSupabaseClient + userService → getApiAuthContext (22 lignes → 3 lignes)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile: dbUserPost } = authResult.data

    const {
      user_id,
      team_id,
      type,
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

    // ✅ Use service role client to bypass RLS (permet creation de notifications pour d'autres users)
    // L'API est deja securisee par getApiAuthContext(), on peut utiliser service_role ici
    logger.info({ user_id, team_id, type, created_by: dbUserPost.id }, '🔐 [NOTIFICATIONS-API] Creating notification with service role (RLS bypass)')
    const supabaseAdmin = createServiceRoleSupabaseClient()

    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        team_id,
        created_by: dbUserPost.id,
        type,
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

    // ✨ Send push notification if personal notification
    if (is_personal && notification) {
      logger.info({ userId: user_id, notificationId: notification.id, type }, '📲 [NOTIFICATIONS-API] Sending push notification')

      // Construct URL based on notification type
      // Note: 'quote_request' and 'quote_response' are not valid notification_type enum values
      // Use 'document' or 'status_change' for quote-related notifications
      let url = '/'
      if (type === 'intervention' && related_entity_id) {
        url = `/gestionnaire/interventions/${related_entity_id}`
      } else if (type === 'assignment' && related_entity_id) {
        url = `/prestataire/interventions/${related_entity_id}`
      } else if (type === 'document' && related_entity_id) {
        // Documents (devis, factures) - redirige vers l'intervention
        url = `/gestionnaire/interventions/${related_entity_id}`
      } else if (type === 'status_change' && related_entity_id) {
        // Changements de statut - redirige vers l'intervention
        url = `/gestionnaire/interventions/${related_entity_id}`
      } else if (type === 'chat' && related_entity_id) {
        // Messages chat - redirige vers l'intervention
        url = `/gestionnaire/interventions/${related_entity_id}`
      } else {
        // Default to notifications page
        url = '/notifications'
      }

      // Fire and forget - don't await to avoid blocking response
      sendPushNotification(user_id, {
        title,
        message,
        url,
        notificationId: notification.id,
        type
      }).catch((error) => {
        logger.error({ error, userId: user_id, notificationId: notification.id }, '❌ [NOTIFICATIONS-API] Push notification failed')
      })
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

    // ✅ ZOD VALIDATION (for body only, ID comes from query params)
    const validation = validateRequest(notificationActionSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [NOTIFICATIONS-PATCH] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const action = validatedData.action // 'mark_read', 'mark_unread', 'archive', etc.

    // ✅ AUTH: getServerSession + createServerSupabaseClient + userService → getApiAuthContext (22 lignes → 3 lignes)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase: supabasePatch, userProfile: dbUserPatch } = authResult.data

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
