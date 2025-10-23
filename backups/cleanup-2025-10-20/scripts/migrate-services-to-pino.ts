/**
 * 🔧 Script de Migration Automatique : Services & Repositories → Pino Logger
 *
 * Migre les services et repositories vers le logger Pino
 *
 * Usage: npx tsx scripts/migrate-services-to-pino.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { logger, logError } from '@/lib/logger'

const SERVICES_DIR = path.join(process.cwd(), 'lib', 'services')
const LIB_DIR = path.join(process.cwd(), 'lib')
const HOOKS_DIR = path.join(process.cwd(), 'hooks')
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
  // Ignorer les fichiers de test
  if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) {
    return false
  }

  // Ignorer logger.ts lui-même et les fichiers déjà migrés
  if (filePath.includes('logger.ts') || filePath.includes('console-override.ts')) {
    return false
  }

  return filePath.endsWith('.ts') || filePath.endsWith('.tsx')
}

const ensureLoggerImport = (content: string, filePath: string): string => {
  // Déjà importé
  if (content.includes('from \'@/lib/logger\'') || content.includes('from "@/lib/logger"')) {
    return content
  }

  // Déterminer le chemin d'import relatif
  let importPath = '@/lib/logger'

  // Si c'est un hook React, utiliser 'use client'
  const isReactHook = filePath.includes('/hooks/') || content.includes("'use client'")

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

  // Ajouter l'import
  const importLine = isReactHook && !hasUseClient
    ? "'use client'\n\n"
    : ""

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, importLine)
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

    // Ne pas migrer si aucun console.*
    if (!originalContent.includes('console.')) {
      return
    }

    let modifiedContent = ensureLoggerImport(originalContent, filePath)
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
  console.log('🚀 Migration Services/Hooks/Lib → logger.* - Démarrage...\n')

  // Migrer lib/services
  console.log('📁 Migration: lib/services/')
  if (fs.existsSync(SERVICES_DIR)) {
    processDirectory(SERVICES_DIR)
  }

  // Migrer lib/ (fichiers racine seulement)
  console.log('\n📁 Migration: lib/ (fichiers racine)')
  const libFiles = fs.readdirSync(LIB_DIR, { withFileTypes: true })
  for (const entry of libFiles) {
    if (entry.isFile() && shouldMigrateFile(path.join(LIB_DIR, entry.name))) {
      processFile(path.join(LIB_DIR, entry.name))
    }
  }

  // Migrer hooks/
  console.log('\n📁 Migration: hooks/')
  if (fs.existsSync(HOOKS_DIR)) {
    processDirectory(HOOKS_DIR)
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
