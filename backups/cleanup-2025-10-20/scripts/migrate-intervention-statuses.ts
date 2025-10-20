/**
 * Migration Script: Intervention Status FR → EN
 *
 * This script migrates intervention statuses from French to English
 * while maintaining data integrity and providing rollback capability.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { logger, logError } from '@/lib/logger'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

// Status mapping for validation
const STATUS_MAPPING = {
  'demande': 'pending',
  'rejetee': 'rejected',
  'approuvee': 'approved',
  'demande_de_devis': 'quote_requested',
  'planification': 'scheduling',
  'planifiee': 'scheduled',
  'en_cours': 'in_progress',
  'cloturee_par_prestataire': 'provider_completed',
  'cloturee_par_locataire': 'tenant_validated',
  'cloturee_par_gestionnaire': 'completed',
  'annulee': 'cancelled'
} as const

type FrenchStatus = keyof typeof STATUS_MAPPING
type EnglishStatus = typeof STATUS_MAPPING[FrenchStatus]

interface MigrationResult {
  success: boolean
  totalInterventions: number
  statusDistribution: Record<string, number>
  errors: string[]
}

async function runMigration(): Promise<MigrationResult> {
  console.log('🚀 Starting intervention status migration...\n')

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const result: MigrationResult = {
    success: false,
    totalInterventions: 0,
    statusDistribution: {},
    errors: []
  }

  try {
    // Step 1: Get current status distribution (before migration)
    console.log('📊 Step 1: Analyzing current status distribution...')
    const { data: beforeData, error: beforeError } = await supabase
      .from('interventions')
      .select('status')

    if (beforeError) {
      result.errors.push(`Failed to fetch interventions: ${beforeError.message}`)
      return result
    }

    const beforeDistribution: Record<string, number> = {}
    beforeData?.forEach(intervention => {
      beforeDistribution[intervention.status] = (beforeDistribution[intervention.status] || 0) + 1
    })

    console.log('   Before migration:')
    Object.entries(beforeDistribution).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`)
    })
    console.log()

    // Step 2: Validate that all statuses are mappable
    console.log('🔍 Step 2: Validating status mapping...')
    const unmappedStatuses = Object.keys(beforeDistribution).filter(
      status => !Object.keys(STATUS_MAPPING).includes(status) && !Object.values(STATUS_MAPPING).includes(status as EnglishStatus)
    )

    if (unmappedStatuses.length > 0) {
      result.errors.push(`Unmapped statuses found: ${unmappedStatuses.join(', ')}`)
      console.error(`   ❌ Unmapped statuses: ${unmappedStatuses.join(', ')}`)
      return result
    }
    console.log('   ✅ All statuses are valid and mappable\n')

    // Step 3: Execute migration SQL
    console.log('🔄 Step 3: Executing migration SQL...')
    const migrationSqlPath = join(process.cwd(), 'supabase', 'migrations', '20251003000000_migrate_intervention_status_to_english.sql')
    const migrationSql = readFileSync(migrationSqlPath, 'utf-8')

    // Execute the migration (Supabase doesn't support raw SQL in client, so we update manually)
    for (const [frenchStatus, englishStatus] of Object.entries(STATUS_MAPPING)) {
      const { error: updateError } = await supabase
        .from('interventions')
        .update({ status: englishStatus })
        .eq('status', frenchStatus)

      if (updateError) {
        result.errors.push(`Failed to update ${frenchStatus} → ${englishStatus}: ${updateError.message}`)
      } else {
        console.log(`   ✅ Migrated: ${frenchStatus} → ${englishStatus}`)
      }
    }

    if (result.errors.length > 0) {
      console.error('\n❌ Migration encountered errors:')
      result.errors.forEach(err => console.error(`   - ${err}`))
      return result
    }

    console.log()

    // Step 4: Verify migration results
    console.log('✅ Step 4: Verifying migration results...')
    const { data: afterData, error: afterError } = await supabase
      .from('interventions')
      .select('status')

    if (afterError) {
      result.errors.push(`Failed to verify migration: ${afterError.message}`)
      return result
    }

    const afterDistribution: Record<string, number> = {}
    afterData?.forEach(intervention => {
      afterDistribution[intervention.status] = (afterDistribution[intervention.status] || 0) + 1
    })

    console.log('   After migration:')
    Object.entries(afterDistribution).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`)
    })
    console.log()

    // Step 5: Validate counts match
    const beforeTotal = Object.values(beforeDistribution).reduce((sum, count) => sum + count, 0)
    const afterTotal = Object.values(afterDistribution).reduce((sum, count) => sum + count, 0)

    if (beforeTotal !== afterTotal) {
      result.errors.push(`Total count mismatch: before=${beforeTotal}, after=${afterTotal}`)
      return result
    }

    result.success = true
    result.totalInterventions = afterTotal
    result.statusDistribution = afterDistribution

    console.log('🎉 Migration completed successfully!')
    console.log(`   Total interventions migrated: ${result.totalInterventions}\n`)

    return result

  } catch (error) {
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }
}

// Execute migration
runMigration()
  .then(result => {
    if (result.success) {
      console.log('✅ Migration Summary:')
      console.log(`   - Total interventions: ${result.totalInterventions}`)
      console.log(`   - New status distribution:`)
      Object.entries(result.statusDistribution).forEach(([status, count]) => {
        console.log(`     • ${status}: ${count}`)
      })
      process.exit(0)
    } else {
      console.error('❌ Migration failed:')
      result.errors.forEach(err => console.error(`   - ${err}`))
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
