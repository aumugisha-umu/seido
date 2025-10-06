/**
 * 🏗️ CRÉATION DE DONNÉES D'EXEMPLE
 *
 * Utilitaire pour créer des données de test pour développement/démonstration
 * Respecte les bonnes pratiques Supabase 2025 avec RLS et validation
 */

import { supabase } from './supabase'
import { logger, logError } from '@/lib/logger'
export interface CreateSampleDataOptions {
  teamId: string
  force?: boolean // Force la création même si des données existent
}

export interface SampleDataResult {
  success: boolean
  buildings: number
  lots: number
  error?: string
}

export async function createSampleBuildingsForTeam({
  teamId,
  force = false
}: CreateSampleDataOptions): Promise<SampleDataResult> {
  try {
    logger.info('🏗️ [SAMPLE-DATA] Creating sample buildings for team:', teamId)

    // Vérifier d'abord s'il y a déjà des buildings
    const { data: existingBuildings, error: checkError } = await supabase
      .from('buildings')
      .select('id')
      .eq('team_id', teamId)

    if (checkError) {
      logger.error('❌ [SAMPLE-DATA] Error checking existing buildings:', checkError)
      return { success: false, buildings: 0, lots: 0, error: checkError.message }
    }

    if (existingBuildings && existingBuildings.length > 0 && !force) {
      logger.info('ℹ️ [SAMPLE-DATA] Buildings already exist for team, skipping creation')
      return { success: true, buildings: existingBuildings.length, lots: 0 }
    }

    // Créer des buildings d'exemple
    const buildingsToCreate = [
      {
        name: 'Résidence Les Jardins',
        address: '123 rue de la Paix',
        city: 'Paris',
        postal_code: '75001',
        team_id: teamId,
        description: 'Résidence moderne avec jardin privé'
      },
      {
        name: 'Immeuble Saint-Antoine',
        address: '456 avenue des Champs',
        city: 'Lyon',
        postal_code: '69001',
        team_id: teamId,
        description: 'Immeuble historique rénové'
      }
    ]

    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .insert(buildingsToCreate)
      .select('id, name')

    if (buildingsError) {
      logger.error('❌ [SAMPLE-DATA] Error creating buildings:', buildingsError)
      return { success: false, buildings: 0, lots: 0, error: buildingsError.message }
    }

    logger.info('✅ [SAMPLE-DATA] Buildings created:', buildings?.length || 0)

    // Créer des lots pour chaque building
    let totalLots = 0
    for (const building of buildings || []) {
      const lotsToCreate = building.name === 'Résidence Les Jardins'
        ? [
            {
              reference: 'A101',
              building_id: building.id,
              category: 'apartment' as const,
              surface: 75.5,
              price: 1200.00,
              is_occupied: false,
              description: 'Appartement 3 pièces avec balcon'
            },
            {
              reference: 'A102',
              building_id: building.id,
              category: 'apartment' as const,
              surface: 85.0,
              price: 1350.00,
              is_occupied: true,
              description: 'Appartement 4 pièces avec terrasse'
            }
          ]
        : [
            {
              reference: 'B201',
              building_id: building.id,
              category: 'apartment' as const,
              surface: 95.0,
              price: 1500.00,
              is_occupied: true,
              description: 'Grand appartement avec vue'
            },
            {
              reference: 'B202',
              building_id: building.id,
              category: 'apartment' as const,
              surface: 70.0,
              price: 1100.00,
              is_occupied: false,
              description: 'Appartement 2 pièces lumineux'
            }
          ]

      const { data: lots, error: lotsError } = await supabase
        .from('lots')
        .insert(lotsToCreate)
        .select('id')

      if (lotsError) {
        logger.error('❌ [SAMPLE-DATA] Error creating lots for building', building.name, ':', lotsError)
      } else {
        totalLots += lots?.length || 0
        logger.info('✅ [SAMPLE-DATA] Lots created for', building.name, ':', lots?.length || 0)
      }
    }

    logger.info('🎉 [SAMPLE-DATA] Sample data creation completed:', {
      buildings: buildings?.length || 0,
      lots: totalLots
    })

    return {
      success: true,
      buildings: buildings?.length || 0,
      lots: totalLots
    }

  } catch (error) {
    logger.error('❌ [SAMPLE-DATA] Unexpected error:', error)
    return {
      success: false,
      buildings: 0,
      lots: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function checkTeamDataStatus(teamId: string) {
  try {
    const [buildingsResult, usersResult, interventionsResult] = await Promise.all([
      supabase.from('buildings').select('id').eq('team_id', teamId),
      supabase.from('users').select('id').eq('team_id', teamId),
      supabase.from('interventions').select('id').eq('team_id', teamId)
    ])

    return {
      buildings: buildingsResult.data?.length || 0,
      users: usersResult.data?.length || 0,
      interventions: interventionsResult.data?.length || 0,
      hasError: !!(buildingsResult.error || usersResult.error || interventionsResult.error)
    }
  } catch (error) {
    logger.error('❌ [SAMPLE-DATA] Error checking team data status:', error)
    return { buildings: 0, users: 0, interventions: 0, hasError: true }
  }
}
