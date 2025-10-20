import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Récupération des paramètres
    const teamId = searchParams.get('teamId')
    const period = searchParams.get('period') || '7d' // 24h, 7d, 30d
    const userId = searchParams.get('userId') // Optionnel pour stats personnelles

    // Validation
    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    // Calcul de la date de début selon la période
    const now = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24)
        break
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      default:
        startDate.setDate(startDate.getDate() - 7)
    }

    // Requête principale pour les logs
    // Note: activity_logs table not yet in database types - this is demo code
    let query = supabase
      .from('activity_logs')
      .select('action_type, entity_type, status, created_at, user_id')
      .eq('team_id', teamId)
      .gte('created_at', startDate.toISOString())

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      logger.error({ error: error }, 'Error fetching activity stats:')
      return NextResponse.json(
        { error: 'Failed to fetch activity statistics' },
        { status: 500 }
      )
    }

    // Calcul des statistiques
    const stats = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      total: data.length,
      
      // Par type d'action
      byAction: {} as Record<string, number>,
      
      // Par type d'entité
      byEntity: {} as Record<string, number>,
      
      // Par statut
      byStatus: {} as Record<string, number>,
      
      // Taux de succès
      successRate: 0,
      
      // Activité par jour (pour les graphiques)
      dailyActivity: [] as Array<{ date: string, count: number }>,
      
      // Utilisateurs les plus actifs
      topUsers: [] as Array<{ userId: string, count: number }>,
      
      // Actions les plus fréquentes
      topActions: [] as Array<{ action: string, count: number, percentage: number }>
    }

    // Calculs par catégorie
    const userActivity = {} as Record<string, number>
    const dailyCount = {} as Record<string, number>

    data.forEach((log: { action_type: string; entity_type: string; status: string; created_at: string; user_id: string }) => {
      // Par action
      stats.byAction[log.action_type] = (stats.byAction[log.action_type] || 0) + 1
      
      // Par entité
      stats.byEntity[log.entity_type] = (stats.byEntity[log.entity_type] || 0) + 1
      
      // Par statut
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1
      
      // Par utilisateur
      userActivity[log.user_id] = (userActivity[log.user_id] || 0) + 1
      
      // Par jour
      const date = new Date(log.created_at).toISOString().split('T')[0]
      dailyCount[date] = (dailyCount[date] || 0) + 1
    })

    // Taux de succès
    stats.successRate = stats.total > 0 
      ? ((stats.byStatus['success'] || 0) / stats.total * 100)
      : 0

    // Activité quotidienne
    stats.dailyActivity = Object.entries(dailyCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top utilisateurs
    stats.topUsers = Object.entries(userActivity)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top actions avec pourcentages
    stats.topActions = Object.entries(stats.byAction)
      .map(([action, count]) => ({
        action,
        count,
        percentage: stats.total > 0 ? (count / stats.total * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Comparaison avec la période précédente
    const previousStartDate = new Date(startDate)
    const periodDuration = now.getTime() - startDate.getTime()
    previousStartDate.setTime(startDate.getTime() - periodDuration)

    let previousQuery = supabase
      .from('activity_logs')
      .select('id', { count: 'exact' })
      .eq('team_id', teamId)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    if (userId) {
      previousQuery = previousQuery.eq('user_id', userId)
    }

    const { count: previousCount } = await previousQuery

    const evolution = {
      current: stats.total,
      previous: previousCount || 0,
      change: previousCount ? ((stats.total - previousCount) / previousCount * 100) : 0,
      trend: stats.total > (previousCount || 0) ? 'up' : 
             stats.total < (previousCount || 0) ? 'down' : 'stable'
    }

    return NextResponse.json({
      stats,
      evolution,
      metadata: {
        generatedAt: now.toISOString(),
        teamId,
        userId: userId || null,
        period
      }
    })

  } catch (error) {
    logger.error({ error: error }, 'Unexpected error in activity-stats API:')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
