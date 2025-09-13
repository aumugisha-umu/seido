import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerSession } from '@/lib/supabase-server'

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Construire la requête de base
    let query = supabase
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
      // Notifications personnelles : seulement celles adressées à l'utilisateur connecté avec isPersonal = true
      query = query.eq('user_id', session.user.id)
      if (teamId) {
        query = query.eq('team_id', teamId)
      }
      // Filtrer par métadonnées isPersonal = true
      query = query.eq('metadata->>isPersonal', 'true')
    } else if (scope === 'team') {
      // Notifications d'équipe : notifications de l'équipe avec isPersonal = false ET destinées à l'utilisateur connecté
      if (teamId) {
        query = query.eq('team_id', teamId).eq('user_id', session.user.id)
        // Filtrer par métadonnées isPersonal = false
        query = query.eq('metadata->>isPersonal', 'false')
      } else {
        // Si pas de teamId spécifié pour le scope team, renvoyer erreur
        return NextResponse.json(
          { error: 'team_id is required for team scope' },
          { status: 400 }
        )
      }
    } else {
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
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications?.length || 0
    })

  } catch (error) {
    console.error('Notifications API error:', error)
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

    const supabase = await createSupabaseServerClient()

    const {
      user_id,
      team_id,
      type,
      priority = 'normal',
      title,
      message,
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

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        team_id,
        created_by: session.user.id,
        type,
        priority,
        title,
        message,
        metadata,
        related_entity_type,
        related_entity_id
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating notification:', error)
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
    console.error('Create notification error:', error)
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

    const supabase = await createSupabaseServerClient()

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    let updateData: any = {}

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
    const { data: notificationCheck, error: checkError } = await supabase
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
    const isOwner = notificationCheck.user_id === session.user.id
    const isTeamMember = notificationCheck.teams?.team_members?.some((member: any) => member.user_id === session.user.id)

    if (!isOwner && !isTeamMember) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this notification' },
        { status: 403 }
      )
    }

    const { data: notification, error } = await supabase
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
    console.error('Update notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
