/**
 * Admin API: Clear Cache
 * Allows administrators to manually clear cache entries
 *
 * POST /api/admin/clear-cache
 *
 * Body:
 * {
 *   "interventionId"?: string,  // Clear specific intervention cache
 *   "buildingId"?: string,      // Clear specific building cache
 *   "lotId"?: string,           // Clear specific lot cache
 *   "clearAll"?: boolean        // Clear ALL caches (use sparingly)
 * }
 */

import { NextResponse } from 'next/server'
import { getServerAuthContext } from '@/lib/server-context'
import {
  clearInterventionCache,
  clearBuildingCache,
  clearLotCache,
  clearAllCaches,
  clearAllInterventionCaches
} from '@/lib/services/cache-utils'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    // ✅ Require admin authentication
    const { user } = await getServerAuthContext('admin')

    const body = await request.json()
    const { interventionId, buildingId, lotId, clearAll, clearAllInterventions } = body

    logger.info('🔧 [ADMIN-CACHE-CLEAR] Request received', {
      userId: user.id,
      userName: user.name,
      interventionId,
      buildingId,
      lotId,
      clearAll,
      clearAllInterventions
    })

    // Clear all caches (nuclear option)
    if (clearAll) {
      await clearAllCaches()
      return NextResponse.json({
        success: true,
        message: 'All caches cleared successfully',
        clearedAt: new Date().toISOString()
      })
    }

    // Clear all intervention caches
    if (clearAllInterventions) {
      await clearAllInterventionCaches()
      return NextResponse.json({
        success: true,
        message: 'All intervention caches cleared successfully',
        clearedAt: new Date().toISOString()
      })
    }

    // Clear specific intervention cache
    if (interventionId) {
      await clearInterventionCache(interventionId)
      return NextResponse.json({
        success: true,
        message: `Cache cleared for intervention ${interventionId}`,
        interventionId,
        clearedAt: new Date().toISOString()
      })
    }

    // Clear specific building cache
    if (buildingId) {
      await clearBuildingCache(buildingId)
      return NextResponse.json({
        success: true,
        message: `Cache cleared for building ${buildingId}`,
        buildingId,
        clearedAt: new Date().toISOString()
      })
    }

    // Clear specific lot cache
    if (lotId) {
      await clearLotCache(lotId)
      return NextResponse.json({
        success: true,
        message: `Cache cleared for lot ${lotId}`,
        lotId,
        clearedAt: new Date().toISOString()
      })
    }

    // No valid parameters provided
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
        message: 'Provide one of: interventionId, buildingId, lotId, clearAll, clearAllInterventions',
        example: {
          interventionId: 'uuid',
          buildingId: 'uuid',
          lotId: 'uuid',
          clearAll: true,
          clearAllInterventions: true
        }
      },
      { status: 400 }
    )
  } catch (error) {
    logger.error('❌ [ADMIN-CACHE-CLEAR] Failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    // If authentication failed, return 401
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Admin authentication required'
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/clear-cache',
    method: 'POST',
    description: 'Clear cache entries (admin only)',
    parameters: {
      interventionId: 'UUID - Clear specific intervention cache',
      buildingId: 'UUID - Clear specific building cache',
      lotId: 'UUID - Clear specific lot cache',
      clearAll: 'boolean - Clear ALL caches (use sparingly)',
      clearAllInterventions: 'boolean - Clear all intervention caches'
    },
    examples: [
      {
        description: 'Clear specific intervention',
        body: {
          interventionId: '3e23aed0-62a5-443b-ac5b-af62f35ab9bc'
        }
      },
      {
        description: 'Clear all intervention caches',
        body: {
          clearAllInterventions: true
        }
      },
      {
        description: 'Nuclear option - clear everything',
        body: {
          clearAll: true
        }
      }
    ]
  })
}
