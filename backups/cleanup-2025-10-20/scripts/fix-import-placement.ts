/**
 * 🔧 Script de Fix Final : Déplacer l'import logger après tous les imports
 */

import * as fs from 'fs'
import * as path from 'path'
import { logger, logError } from '@/lib/logger'

const ROOT_DIR = process.cwd()
let fixedCount = 0

const fixImportPlacement = (content: string): { fixed: string; changed: boolean } => {
  const lines = content.split('\n')
  let loggerImportIndex = -1
  let lastRealImportIndex = -1
  let useClientIndex = -1

  // Trouver l'index de 'use client', logger import, et le dernier vrai import
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === "'use client'" || line === '"use client"') {
      useClientIndex = i
    }

    if (line.includes("")) {
      loggerImportIndex = i
    } else if (line.startsWith('import ') && !line.includes('logger')) {
      lastRealImportIndex = i
    }
  }

  // Si logger import n'est pas après le dernier import, le déplacer
  if (loggerImportIndex !== -1 && lastRealImportIndex !== -1 && loggerImportIndex < lastRealImportIndex) {
    const loggerImportLine = lines[loggerImportIndex]
    lines.splice(loggerImportIndex, 1) // Retirer
    lines.splice(lastRealImportIndex, 0, loggerImportLine) // Insérer après le dernier import

    return { fixed: lines.join('\n'), changed: true }
  }

  // Si 'use client' vient après des imports, le déplacer en premier
  if (useClientIndex > 0) {
    const useClientLine = lines[useClientIndex]
    lines.splice(useClientIndex, 1)
    lines.unshift(useClientLine, '')

    return { fixed: lines.join('\n'), changed: true }
  }

  return { fixed: content, changed: false }
}

const processFile = (filePath: string): void => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const { fixed, changed } = fixImportPlacement(content)

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
  console.log('🔧 Fix Import Placement - Démarrage...\n')

  processDirectory(ROOT_DIR)

  console.log(`\n✅ ${fixedCount} fichiers corrigés !`)
}

main()
