import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    // Récupération des paramètres de requête
    const teamId = searchParams.get('teamId')
    const userId = searchParams.get('userId')
    const entityType = searchParams.get('entityType')
    const actionType = searchParams.get('actionType')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validation des paramètres obligatoires
    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    // Construction de la requête
    let query = supabase
      .from('activity_logs_with_user')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    // Application des filtres optionnels
    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching activity logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activity logs', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    // Récupération du total pour la pagination
    const { count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)

    return NextResponse.json({
      data: data || [],
      pagination: {
        offset,
        limit,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('Unexpected error in activity-logs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    // Validation des champs obligatoires
    const {
      teamId,
      userId,
      actionType,
      entityType,
      entityId,
      entityName,
      description,
      status = 'success',
      metadata = {},
      errorMessage,
      ipAddress,
      userAgent
    } = body

    if (!teamId || !userId || !actionType || !entityType || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: teamId, userId, actionType, entityType, description' },
        { status: 400 }
      )
    }

    // Insertion du log
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        team_id: teamId,
        user_id: userId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId || null,
        entity_name: entityName || null,
        description,
        status,
        metadata,
        error_message: errorMessage || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating activity log:', error)
      return NextResponse.json(
        { error: 'Failed to create activity log' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('Unexpected error in activity-logs POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
