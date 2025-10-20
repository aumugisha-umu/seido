/**
 * 🔧 Script Ultimate Fix : Tous les imports logger
 *
 * Stratégie: Retirer TOUS les imports logger, puis les réinsérer au bon endroit
 */

import * as fs from 'fs'
import * as path from 'path'
import { logger, logError } from '@/lib/logger'

const ROOT_DIR = process.cwd()
const LOGGER_IMPORT = ""

let fixedCount = 0

const fixAllImports = (content: string): { fixed: string; changed: boolean } => {
  // Étape 1: Retirer TOUS les imports logger (même mal placés)
  let fixed = content.replace(/import\s+\{\s+logger,\s+logError\s+\}\s+from\s+['"]@\/lib\/logger['"];?\s*\n?/g, '')

  // Étape 2: Trouver où insérer (après le dernier import)
  const lines = fixed.split('\n')
  let lastImportIndex = -1
  let hasUseClient = false
  let useClientIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === "'use client'" || line === '"use client"') {
      hasUseClient = true
      useClientIndex = i
    }

    // Identifier un vrai import (pas un commentaire, pas vide)
    if (line.startsWith('import ') && !line.includes('logger')) {
      lastImportIndex = i
    }
  }

  // Étape 3: Insérer au bon endroit
  if (lastImportIndex !== -1) {
    // Insérer après le dernier import
    lines.splice(lastImportIndex + 1, 0, LOGGER_IMPORT)
    fixed = lines.join('\n')
    return { fixed, changed: true }
  } else if (hasUseClient && useClientIndex !== -1) {
    // S'il y a 'use client' mais pas d'imports, insérer après
    lines.splice(useClientIndex + 1, 0, '', LOGGER_IMPORT)
    fixed = lines.join('\n')
    return { fixed, changed: true }
  }

  // Pas d'imports trouvés, ajouter au début (après 'use client' si présent)
  if (hasUseClient) {
    lines.splice(useClientIndex + 1, 0, '', LOGGER_IMPORT)
  } else {
    lines.unshift(LOGGER_IMPORT, '')
  }

  return { fixed: lines.join('\n'), changed: true }
}

const processFile = (filePath: string): void => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')

    // Ne traiter que les fichiers qui ont console.log ou console.error ou logger déjà
    if (!content.includes('logger') && !content.includes('console.')) {
      return
    }

    const { fixed, changed } = fixAllImports(content)

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

    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('.next') && !entry.name.includes('test')) {
      processDirectory(fullPath)
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
      processFile(fullPath)
    }
  }
}

const main = () => {
  console.log('🔧 Ultimate Fix - Tous les imports logger...\n')

  processDirectory(ROOT_DIR)

  console.log(`\n✅ ${fixedCount} fichiers corrigés !`)
}

main()
