#!/usr/bin/env node

/**
 * Script de migration automatique des API routes vers la validation Zod
 * et l'architecture SSR Supabase
 */

const fs = require('fs')
const path = require('path')

const API_DIR = path.join(__dirname, '..', 'app', 'api')

// Routes critiques à migrer en priorité
const PRIORITY_ROUTES = [
  'auth/session',
  'invite-user',
  'update-user-profile',
  'create-contact',
  'intervention-approve',
  'intervention-reject',
  'intervention-complete',
  'quotes/[id]/approve',
  'quotes/[id]/reject'
]

// Pattern de détection des types 'any'
const ANY_TYPE_PATTERNS = [
  /:\s*any\b/g,
  /any\[\]/g,
  /Record<string,\s*any>/g,
  /\(.*:\s*any.*\)/g
]

// Template pour une route migrée
const MIGRATED_ROUTE_TEMPLATE = `import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  withApiHandler,
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  validateRequestBody,
  logApiActivity
} from '@/lib/api-utils'
// TODO: Import appropriate Zod schema from @/lib/validations

export const POST = withApiHandler(async (request: NextRequest) => {
  // Get authenticated user with role validation
  const authResult = await getAuthenticatedUser(/* ['required', 'roles'] */)
  if (!authResult.success) {
    return authResult.error
  }

  const { userProfile, supabase } = authResult.data

  // TODO: Validate request body with Zod schema
  // const validation = await validateRequestBody(request, yourSchema)
  // if (!validation.success) {
  //   return validation.error
  // }

  try {
    // TODO: Implement business logic here

    // Log activity
    await logApiActivity(userProfile, 'action', 'entity', 'id')

    return createApiResponse({
      // Your response data
    })
  } catch (error) {
    console.error('API Error:', error)
    return createErrorResponse('Erreur serveur', 500)
  }
})
`

/**
 * Analyse un fichier de route pour détecter les problèmes
 */
function analyzeRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const issues = []

  // Détecter les types 'any'
  ANY_TYPE_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) {
      issues.push({
        type: 'any_type',
        count: matches.length,
        pattern: pattern.source
      })
    }
  })

  // Détecter l'usage de l'ancien client Supabase
  if (content.includes('createServerClient') && !content.includes('@/utils/supabase/server')) {
    issues.push({
      type: 'old_supabase_client',
      description: 'Uses old Supabase client pattern'
    })
  }

  // Détecter l'absence de validation Zod
  if (!content.includes('zod') && !content.includes('validateRequestBody')) {
    issues.push({
      type: 'no_validation',
      description: 'No Zod validation found'
    })
  }

  // Détecter l'absence du wrapper withApiHandler
  if (!content.includes('withApiHandler')) {
    issues.push({
      type: 'no_error_handler',
      description: 'No error handling wrapper'
    })
  }

  return {
    filePath: filePath.replace(API_DIR, ''),
    issues,
    needsMigration: issues.length > 0,
    priority: PRIORITY_ROUTES.some(route => filePath.includes(route))
  }
}

/**
 * Scanne récursivement le dossier API
 */
function scanApiRoutes(dir = API_DIR) {
  const results = []

  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      results.push(...scanApiRoutes(fullPath))
    } else if (item === 'route.ts') {
      results.push(analyzeRouteFile(fullPath))
    }
  }

  return results
}

/**
 * Génère un rapport de migration
 */
function generateMigrationReport(routes) {
  const report = {
    total: routes.length,
    needsMigration: routes.filter(r => r.needsMigration).length,
    priority: routes.filter(r => r.priority).length,
    issues: {
      anyTypes: 0,
      oldSupabaseClient: 0,
      noValidation: 0,
      noErrorHandler: 0
    },
    priorityRoutes: [],
    allIssues: []
  }

  routes.forEach(route => {
    if (route.priority && route.needsMigration) {
      report.priorityRoutes.push(route.filePath)
    }

    route.issues.forEach(issue => {
      report.allIssues.push({
        file: route.filePath,
        ...issue
      })

      switch (issue.type) {
        case 'any_type':
          report.issues.anyTypes += issue.count || 1
          break
        case 'old_supabase_client':
          report.issues.oldSupabaseClient++
          break
        case 'no_validation':
          report.issues.noValidation++
          break
        case 'no_error_handler':
          report.issues.noErrorHandler++
          break
      }
    })
  })

  return report
}

/**
 * Crée un fichier de sauvegarde
 */
function createBackup(filePath) {
  const backupPath = filePath + '.backup'
  fs.copyFileSync(filePath, backupPath)
  console.log(`📦 Backup created: ${backupPath}`)
}

/**
 * Fonction principale
 */
function main() {
  console.log('🔍 Scanning API routes for migration needs...\n')

  const routes = scanApiRoutes()
  const report = generateMigrationReport(routes)

  console.log('📊 MIGRATION REPORT')
  console.log('==================')
  console.log(`Total routes: ${report.total}`)
  console.log(`Need migration: ${report.needsMigration}`)
  console.log(`Priority routes: ${report.priority}`)
  console.log()

  console.log('🚨 ISSUES SUMMARY')
  console.log('================')
  console.log(`'any' types found: ${report.issues.anyTypes}`)
  console.log(`Old Supabase client: ${report.issues.oldSupabaseClient}`)
  console.log(`Missing Zod validation: ${report.issues.noValidation}`)
  console.log(`Missing error handler: ${report.issues.noErrorHandler}`)
  console.log()

  if (report.priorityRoutes.length > 0) {
    console.log('🎯 PRIORITY ROUTES TO MIGRATE')
    console.log('=============================')
    report.priorityRoutes.forEach(route => {
      console.log(`❗ ${route}`)
    })
    console.log()
  }

  console.log('📝 DETAILED ISSUES')
  console.log('==================')

  // Group issues by file
  const issuesByFile = {}
  report.allIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = []
    }
    issuesByFile[issue.file].push(issue)
  })

  Object.entries(issuesByFile).forEach(([file, issues]) => {
    console.log(`\n📁 ${file}`)
    issues.forEach(issue => {
      switch (issue.type) {
        case 'any_type':
          console.log(`  ⚠️  ${issue.count} 'any' type(s) found`)
          break
        case 'old_supabase_client':
          console.log(`  🔄 Needs Supabase client migration`)
          break
        case 'no_validation':
          console.log(`  🛡️  Missing Zod validation`)
          break
        case 'no_error_handler':
          console.log(`  🚨 Missing error handling wrapper`)
          break
      }
    })
  })

  // Save report to file
  const reportPath = path.join(__dirname, '..', 'docs', 'api-migration-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n💾 Detailed report saved to: ${reportPath}`)

  console.log('\n✅ Migration analysis complete!')
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Review priority routes and migrate them first')
  console.log('2. Use the patterns from migrated routes as templates')
  console.log('3. Update database-service.ts to eliminate remaining any types')
  console.log('4. Run tests after each migration to ensure functionality')
}

// Run the script
if (require.main === module) {
  main()
}

module.exports = {
  scanApiRoutes,
  analyzeRouteFile,
  generateMigrationReport
}