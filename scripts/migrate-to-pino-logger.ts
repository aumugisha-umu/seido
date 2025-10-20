/**
 * 🔧 Script de Migration Automatique : console.* → logger.*
 *
 * Ce script migre automatiquement tous les fichiers de routes API
 * pour utiliser le logger Pino au lieu de console.*
 *
 * Usage: npx tsx scripts/migrate-to-pino-logger.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { logger, logError } from '@/lib/logger'

// Configuration
const API_ROUTES_DIR = path.join(process.cwd(), 'app', 'api')
const DRY_RUN = false // Set to true to preview changes without modifying files

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

/**
 * Mapping console methods → logger methods
 */
const CONSOLE_TO_LOGGER_MAP = {
  'console.log': 'logger.info',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error'
}

/**
 * Vérifie si un fichier doit être migré
 */
const shouldMigrateFile = (filePath: string): boolean => {
  return filePath.endsWith('route.ts') || filePath.endsWith('route.js')
}

/**
 * Ajoute l'import logger si nécessaire
 */
const ensureLoggerImport = (content: string): string => {
  // Vérifier si l'import existe déjà
  if (content.includes('from \'@/lib/logger\'') || content.includes('from "@/lib/logger"')) {
    return content
  }

  // Trouver la position après les autres imports
  const lines = content.split('\n')
  let lastImportIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i
    }
  }

  // Insérer l'import après le dernier import
  if (lastImportIndex !== -1) {
    lines.splice(
      lastImportIndex + 1,
      0,
      ""
    )
    return lines.join('\n')
  }

  // Si pas d'imports, ajouter au début
  return "\n\n" + content
}

/**
 * Remplace console.* par logger.*
 */
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

/**
 * Traite un fichier unique
 */
const processFile = (filePath: string): void => {
  try {
    stats.filesProcessed++

    // Lire le contenu
    const originalContent = fs.readFileSync(filePath, 'utf-8')

    // Étape 1: Ajouter l'import logger
    let modifiedContent = ensureLoggerImport(originalContent)

    // Étape 2: Remplacer console.* par logger.*
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
    const errorMsg = `❌ Erreur lors du traitement de ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    stats.errors.push(errorMsg)
    console.error(errorMsg)
  }
}

/**
 * Parcourt récursivement un dossier
 */
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

/**
 * Point d'entrée principal
 */
const main = () => {
  console.log('🚀 Migration console.* → logger.* - Démarrage...\n')
  console.log(`📁 Dossier: ${API_ROUTES_DIR}`)
  console.log(`${DRY_RUN ? '🔍 Mode DRY RUN activé' : '✍️  Mode ÉCRITURE activé'}\n`)

  if (!fs.existsSync(API_ROUTES_DIR)) {
    console.error(`❌ Dossier introuvable: ${API_ROUTES_DIR}`)
    process.exit(1)
  }

  processDirectory(API_ROUTES_DIR)

  // Afficher les statistiques
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
  console.log(DRY_RUN ? '\n🔍 DRY RUN terminé - Aucun fichier modifié' : '\n✅ Migration terminée avec succès!')
}

// Exécuter
main()
