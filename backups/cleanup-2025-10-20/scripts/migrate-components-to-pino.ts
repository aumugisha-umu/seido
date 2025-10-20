/**
 * 🔧 Script de Migration Automatique : Components & Pages → Pino Logger
 *
 * Migre les components et pages vers le logger Pino
 *
 * Usage: npx tsx scripts/migrate-components-to-pino.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { logger, logError } from '@/lib/logger'

const COMPONENTS_DIR = path.join(process.cwd(), 'components')
const APP_DIR = path.join(process.cwd(), 'app')
const DRY_RUN = false

interface MigrationStats {
  filesProcessed: number
  filesModified: number
  consoleReplacements: number
  errors: string[]
}

const stats: MigrationStats = {
  filesProcessed: 0,
  filesModified: 0,
  consoleReplacements: 0,
  errors: []
}

const CONSOLE_TO_LOGGER_MAP = {
  'console.log': 'logger.info',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error'
}

const shouldMigrateFile = (filePath: string): boolean => {
  // Ignorer tests
  if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) {
    return false
  }

  // Ignorer les fichiers système
  if (filePath.includes('logger') || filePath.includes('console-override')) {
    return false
  }

  // Ignorer globals.css et autres config
  if (filePath.endsWith('.css') || filePath.endsWith('.json') || filePath.endsWith('.md')) {
    return false
  }

  return filePath.endsWith('.tsx') || filePath.endsWith('.ts')
}

const ensureLoggerImport = (content: string): string => {
  // Déjà importé
  if (content.includes('from \'@/lib/logger\'') || content.includes('from "@/lib/logger"')) {
    return content
  }

  const lines = content.split('\n')
  let lastImportIndex = -1
  let hasUseClient = false

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "'use client'" || lines[i].trim() === '"use client"') {
      hasUseClient = true
    }
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i
    }
  }

  // Pour les composants client React, ajouter après 'use client'
  const importLine = ""

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, importLine)
    return lines.join('\n')
  }

  // Si 'use client' mais pas d'imports
  if (hasUseClient) {
    const useClientIndex = lines.findIndex(
      line => line.trim() === "'use client'" || line.trim() === '"use client"'
    )
    lines.splice(useClientIndex + 1, 0, '', importLine)
    return lines.join('\n')
  }

  return importLine + '\n\n' + content
}

const replaceConsoleCalls = (content: string): { content: string; count: number } => {
  let modifiedContent = content
  let replacementCount = 0

  for (const [consoleMethod, loggerMethod] of Object.entries(CONSOLE_TO_LOGGER_MAP)) {
    const regex = new RegExp(consoleMethod.replace('.', '\\.'), 'g')
    const matches = modifiedContent.match(regex)

    if (matches) {
      replacementCount += matches.length
      modifiedContent = modifiedContent.replace(regex, loggerMethod)
    }
  }

  return { content: modifiedContent, count: replacementCount }
}

const processFile = (filePath: string): void => {
  try {
    stats.filesProcessed++

    const originalContent = fs.readFileSync(filePath, 'utf-8')

    // Ne migrer que si console.* présent
    if (!originalContent.includes('console.')) {
      return
    }

    let modifiedContent = ensureLoggerImport(originalContent)
    const { content: finalContent, count } = replaceConsoleCalls(modifiedContent)

    if (count > 0) {
      stats.filesModified++
      stats.consoleReplacements += count

      if (!DRY_RUN) {
        fs.writeFileSync(filePath, finalContent, 'utf-8')
        console.log(`✅ Migré: ${path.relative(process.cwd(), filePath)} (${count} remplacements)`)
      } else {
        console.log(`[DRY RUN] Migré: ${path.relative(process.cwd(), filePath)} (${count} remplacements)`)
      }
    }
  } catch (error) {
    const errorMsg = `❌ Erreur: ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    stats.errors.push(errorMsg)
    console.error(errorMsg)
  }
}

const processDirectory = (dirPath: string): void => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      processDirectory(fullPath)
    } else if (entry.isFile() && shouldMigrateFile(fullPath)) {
      processFile(fullPath)
    }
  }
}

const main = () => {
  console.log('🚀 Migration Components & Pages → logger.* - Démarrage...\n')

  // Migrer components/
  console.log('📁 Migration: components/')
  if (fs.existsSync(COMPONENTS_DIR)) {
    processDirectory(COMPONENTS_DIR)
  }

  // Migrer app/ (pages, layouts, etc.)
  console.log('\n📁 Migration: app/ (pages & layouts)')
  if (fs.existsSync(APP_DIR)) {
    processDirectory(APP_DIR)
  }

  // Statistiques
  console.log('\n' + '='.repeat(60))
  console.log('📊 Statistiques de Migration')
  console.log('='.repeat(60))
  console.log(`✅ Fichiers traités: ${stats.filesProcessed}`)
  console.log(`📝 Fichiers modifiés: ${stats.filesModified}`)
  console.log(`🔄 Remplacements console.*: ${stats.consoleReplacements}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Erreurs (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  console.log('='.repeat(60))
  console.log(DRY_RUN ? '\n🔍 DRY RUN terminé' : '\n✅ Migration terminée!')
}

main()
