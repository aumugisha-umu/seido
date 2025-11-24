/**
 * Server Actions pour tester les notifications
 *
 * Crée des données de test et déclenche les notifications
 */

'use server'

import { getServerAuthContext } from '@/lib/server-context'
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client'
import { dispatchInterventionCreated } from './dispatcher-actions'
import { logger } from '@/lib/logger'

/**
 * Teste les notifications en utilisant une intervention existante
 *
 * @returns Résultat du dispatch avec l'ID de l'intervention utilisée
 */
export async function createTestInterventionAndNotify(): Promise<{
  success: boolean
  interventionId?: string
  dispatchResult?: any
  error?: string
}> {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')
    const supabase = await createServerSupabaseClient()

    logger.info(
      { userId: profile.id, teamId: team.id },
      '🧪 [TEST-NOTIFICATION] Testing notifications with existing intervention'
    )

    // 1. Récupérer une intervention existante de l'équipe
    const { data: intervention, error: fetchError } = await supabase
      .from('interventions')
      .select('id, reference, title, team_id')
      .eq('team_id', team.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !intervention) {
      logger.error({ error: fetchError }, '❌ [TEST-NOTIFICATION] No intervention found for team')
      return {
        success: false,
        error: 'Aucune intervention trouvée pour cette équipe. Créez une intervention d\'abord.',
      }
    }

    logger.info(
      {
        interventionId: intervention.id,
        reference: intervention.reference,
        teamId: intervention.team_id,
        userTeamId: team.id
      },
      '✅ [TEST-NOTIFICATION] Using existing intervention for test'
    )

    // 2. Dispatcher les notifications
    const dispatchResult = await dispatchInterventionCreated(intervention.id)

    logger.info(
      {
        interventionId: intervention.id,
        dispatchSuccess: dispatchResult.success,
        overallSuccess: dispatchResult.data?.overallSuccess,
      },
      '📊 [TEST-NOTIFICATION] Dispatch completed'
    )

    return {
      success: true,
      interventionId: intervention.id,
      dispatchResult: dispatchResult.data,
    }
  } catch (error) {
    logger.error({ error }, '❌ [TEST-NOTIFICATION] Exception')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Liste les interventions disponibles pour le test
 *
 * @returns Liste des interventions de l'équipe
 */
export async function getAvailableInterventionsForTest(): Promise<{
  success: boolean
  interventions?: Array<{ id: string; reference: string; title: string; created_at: string }>
  error?: string
}> {
  try {
    const { team } = await getServerAuthContext('gestionnaire')
    const supabase = await createServerSupabaseClient()

    logger.info({ teamId: team.id }, '📋 [TEST-NOTIFICATION] Fetching available interventions')

    const { data, error } = await supabase
      .from('interventions')
      .select('id, reference, title, created_at')
      .eq('team_id', team.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      logger.error({ error }, '❌ [TEST-NOTIFICATION] Fetch failed')
      return {
        success: false,
        error: error.message,
      }
    }

    logger.info(
      { count: data?.length || 0 },
      '✅ [TEST-NOTIFICATION] Interventions fetched'
    )

    return {
      success: true,
      interventions: data || [],
    }
  } catch (error) {
    logger.error({ error }, '❌ [TEST-NOTIFICATION] Fetch exception')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
