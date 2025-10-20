/**
 * 🔧 Script de Fix Automatique : Imports Logger Mal Placés
 *
 * Corrige les imports logger insérés au milieu d'imports multi-lignes
 *
 * Usage: npx tsx scripts/fix-import-syntax.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { logger, logError } from '@/lib/logger'

const ROOT_DIR = process.cwd()

let fixedCount = 0

const fixImportSyntax = (content: string): { fixed: string; changed: boolean } => {
  // Pattern: import { \n import { logger...
  const problematicPattern = /import\s+\{[\s\n]+import\s+\{\s+logger,\s+logError\s+\}\s+from\s+['"]@\/lib\/logger['"]\s*\n/g

  if (!problematicPattern.test(content)) {
    return { fixed: content, changed: false }
  }

  // Extraire l'import logger
  const loggerImport = ""

  // Remplacer le pattern problématique
  let fixed = content.replace(
    /import\s+\{[\s\n]+import\s+\{\s+logger,\s+logError\s+\}\s+from\s+['"]@\/lib\/logger['"]\s*\n/g,
    `${loggerImport}\nimport {\n`
  )

  return { fixed, changed: true }
}

const processFile = (filePath: string): void => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const { fixed, changed } = fixImportSyntax(content)

    if (changed) {
      fs.writeFileSync(filePath, fixed, 'utf-8')
      fixedCount++
      console.log(`✅ Corrigé: ${path.relative(ROOT_DIR, filePath)}`)
    }
  } catch (error) {
    console.error(`❌ Erreur: ${filePath}: ${error}`)
  }
}

const processDirectory = (dirPath: string): void => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('.next')) {
      processDirectory(fullPath)
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      processFile(fullPath)
    }
  }
}

const main = () => {
  console.log('🔧 Fix Import Syntax - Démarrage...\n')

  processDirectory(ROOT_DIR)

  console.log(`\n✅ ${fixedCount} fichiers corrigés !`)
}

main()
