import { InterventionsPageClient } from './interventions-page-client'
import { createServerInterventionService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { requireRole } from '@/lib/auth-dal'

// ✅ Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function InterventionsPage() {
  try {
    // ✅ LAYER 1: Auth validation FIRST (Dashboard pattern)
    logger.info("🔵 [INTERVENTIONS-PAGE] Server-side fetch starting")
    const { user } = await requireRole(['gestionnaire'])

    // ✅ LAYER 2: Create services AFTER auth validation
    const interventionService = await createServerInterventionService()

    // ✅ LAYER 3: Fetch interventions
    const result = await interventionService.getAll({ limit: 100 })

    let interventions: any[] = []

    if (result.success && result.data) {
      interventions = result.data
      logger.info(`✅ [INTERVENTIONS-PAGE] Loaded ${interventions.length} interventions`)
    } else {
      logger.error(`❌ [INTERVENTIONS-PAGE] Failed to load interventions: ${result.error || 'Unknown error'}`)
    }

    logger.info(`📊 [INTERVENTIONS-PAGE] Server data ready - Interventions: ${interventions.length}`)

    // ✅ Pass data to Client Component
    return <InterventionsPageClient initialInterventions={interventions} />
  } catch (error) {
    // 🔍 DETAILED ERROR LOGGING FOR DIAGNOSTICS
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      // Supabase-specific error properties
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      // Full error object serialization
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    }

    logger.error("❌ [INTERVENTIONS-PAGE] Server error:", errorDetails)
    console.error("🚨 [INTERVENTIONS-PAGE] Full error object:", error)

    // Re-throw NEXT_REDIRECT errors
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    // For other errors, render empty state
    return <InterventionsPageClient initialInterventions={[]} />
  }
}
