/**
 * Script de Migration Automatique : logger.info() → Format Pino Correct
 *
 * Ce script migre automatiquement tous les appels logger.* qui utilisent
 * le pattern incorrect (msg, ...args) vers le format Pino correct ({data}, msg)
 *
 * Avant:  logger.info('Message', data1, data2)
 * Après:  logger.info({ data1, data2 }, 'Message')
 *
 * Usage:
 *   npm run migrate:logger-format        # Mode dry-run (affichage seulement)
 *   npm run migrate:logger-format:write  # Écriture effective des fichiers
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

// Configuration
const DRY_RUN = !process.argv.includes('--write')
const DIRECTORIES = ['app', 'lib', 'hooks', 'components']
const EXTENSIONS = ['.ts', '.tsx']

// Statistiques
let filesProcessed = 0
let filesModified = 0
let callsFixed = 0

// Patterns de logging à migrer
const LOGGER_METHODS = ['info', 'error', 'warn', 'debug', 'trace', 'fatal']

/**
 * Détecte si un appel logger utilise le pattern incorrect
 * Pattern incorrect: logger.info('msg', arg1, arg2, ...)
 * Pattern correct:   logger.info({...}, 'msg') ou logger.info('msg')
 */
function detectIncorrectPattern(line: string): {
  isIncorrect: boolean
  method: string
  fullMatch: string
  messageContent: string
  additionalArgs: string[]
} | null {
  // Regex pour capturer logger.METHOD('message', arg1, arg2, ...)
  const regex = new RegExp(
    `logger\\.(${LOGGER_METHODS.join('|')})\\((['"\`][^'"\`]*['"\`])(?:,\\s*(.+?))?\\)`,
    'g'
  )

  const match = regex.exec(line)
  if (!match) return null

  const [fullMatch, method, messageContent, additionalArgs] = match

  // Si pas d'arguments supplémentaires, c'est déjà correct
  if (!additionalArgs || additionalArgs.trim() === '') {
    return null
  }

  // Si le premier argument après le message est un objet {}, c'est déjà correct
  if (additionalArgs.trim().startsWith('{')) {
    return null
  }

  // Pattern incorrect détecté
  const args = additionalArgs.split(',').map(arg => arg.trim()).filter(Boolean)

  return {
    isIncorrect: true,
    method,
    fullMatch,
    messageContent,
    additionalArgs: args
  }
}

/**
 * Génère le code corrigé au format Pino
 */
function generateFixedCall(detection: NonNullable<ReturnType<typeof detectIncorrectPattern>>): string {
  const { method, messageContent, additionalArgs } = detection

  // Si un seul argument, on le nomme automatiquement
  if (additionalArgs.length === 1) {
    const arg = additionalArgs[0]

    // Essayer de déduire un nom de variable si c'est une variable simple
    const varName = arg.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) ? arg : 'data'

    return `logger.${method}({ ${varName}: ${arg} }, ${messageContent})`
  }

  // Si plusieurs arguments, créer un objet avec des noms génériques
  const dataObject = additionalArgs.map((arg, index) => {
    const varName = arg.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) ? arg : `data${index + 1}`
    return `${varName}: ${arg}`
  }).join(', ')

  return `logger.${method}({ ${dataObject} }, ${messageContent})`
}

/**
 * Traite un fichier et retourne le contenu corrigé
 */
function processFile(filePath: string): { content: string; modified: boolean; fixCount: number } {
  const originalContent = fs.readFileSync(filePath, 'utf-8')
  const lines = originalContent.split('\n')
  let modified = false
  let fixCount = 0

  const processedLines = lines.map(line => {
    const detection = detectIncorrectPattern(line)

    if (!detection) {
      return line
    }

    // Pattern incorrect trouvé, générer le correctif
    const fixedCall = generateFixedCall(detection)
    const fixedLine = line.replace(detection.fullMatch, fixedCall)

    console.log(`\n📝 [FIX] ${path.relative(process.cwd(), filePath)}`)
    console.log(`   ❌ Before: ${line.trim()}`)
    console.log(`   ✅ After:  ${fixedLine.trim()}`)

    modified = true
    fixCount++

    return fixedLine
  })

  return {
    content: processedLines.join('\n'),
    modified,
    fixCount
  }
}

/**
 * Scan et traite tous les fichiers
 */
async function migrateLoggerCalls() {
  console.log('🔍 Pino Logger Migration Script')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY-RUN (no files will be modified)' : '✍️ WRITE MODE'}`)
  console.log(`Scanning directories: ${DIRECTORIES.join(', ')}`)
  console.log(`Extensions: ${EXTENSIONS.join(', ')}`)
  console.log('')

  // Trouver tous les fichiers TypeScript
  const patterns = DIRECTORIES.flatMap(dir =>
    EXTENSIONS.map(ext => `${dir}/**/*${ext}`)
  )

  const files: string[] = []
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/*.d.ts', '**/dist/**', '**/.next/**']
    })
    files.push(...matches)
  }

  console.log(`📂 Found ${files.length} files to process\n`)

  // Traiter chaque fichier
  for (const file of files) {
    filesProcessed++
    const result = processFile(file)

    if (result.modified) {
      filesModified++
      callsFixed += result.fixCount

      if (!DRY_RUN) {
        fs.writeFileSync(file, result.content, 'utf-8')
        console.log(`✅ File updated: ${path.relative(process.cwd(), file)}`)
      }
    }
  }

  // Statistiques finales
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Files processed:      ${filesProcessed}`)
  console.log(`Files modified:       ${filesModified}`)
  console.log(`Logger calls fixed:   ${callsFixed}`)
  console.log('')

  if (DRY_RUN) {
    console.log('ℹ️  This was a DRY-RUN. No files were modified.')
    console.log('   To apply changes, run with --write flag:')
    console.log('   npm run migrate:logger-format:write')
  } else {
    console.log('✅ Migration completed successfully!')
    console.log('   All files have been updated.')
    console.log('   Please review the changes before committing.')
  }
}

// Exécution
migrateLoggerCalls().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
