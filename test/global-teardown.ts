/**
 * Global teardown pour les tests Playwright
 * Nettoie les ressources et génère des rapports finaux
 */

import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Nettoyage global des tests...\n')

  const testDir = path.join(process.cwd(), 'test')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  // 1. Archiver les résultats actuels
  const archiveDir = path.join(testDir, 'archives', timestamp)
  if (!fs.existsSync(path.join(testDir, 'archives'))) {
    fs.mkdirSync(path.join(testDir, 'archives'), { recursive: true })
  }

  // 2. Copier les artifacts importants dans l'archive
  const artifactsToCopy = [
    { src: 'test-results', dest: 'test-results' },
    { src: 'screenshots', dest: 'screenshots' },
    { src: 'videos', dest: 'videos' },
    { src: 'traces', dest: 'traces' },
    { src: 'reports/test-results.json', dest: 'test-results.json' }
  ]

  for (const artifact of artifactsToCopy) {
    const srcPath = path.join(testDir, artifact.src)
    const destPath = path.join(archiveDir, artifact.dest)

    if (fs.existsSync(srcPath)) {
      // Créer le dossier parent si nécessaire
      const destDir = path.dirname(destPath)
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }

      // Copier récursivement
      if (fs.statSync(srcPath).isDirectory()) {
        copyRecursiveSync(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
      console.log(`  ✅ Archivé: ${artifact.src}`)
    }
  }

  // 3. Générer un rapport de synthèse
  await generateSummaryReport(testDir, timestamp)

  // 4. Nettoyer les fichiers temporaires
  cleanupTempFiles(testDir)

  // 5. Optimiser les screenshots (compression)
  await optimizeScreenshots(testDir)

  // 6. Vérifier l'espace disque et nettoyer si nécessaire
  await checkAndCleanupDiskSpace(testDir)

  console.log('\n✨ Nettoyage terminé avec succès!\n')
}

/**
 * Copie récursive de dossiers
 */
function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src)
  const stats = exists && fs.statSync(src)
  const isDirectory = exists && stats && stats.isDirectory()

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest)
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      )
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}

/**
 * Génère un rapport de synthèse avec organisation par rôle
 */
async function generateSummaryReport(testDir: string, timestamp: string) {
  const reportPath = path.join(testDir, 'reports', `summary-${timestamp}.md`)

  // Lire les résultats JSON si disponibles
  let testResults: unknown = {}
  const jsonPath = path.join(testDir, 'reports', 'test-results.json')
  if (fs.existsSync(jsonPath)) {
    testResults = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  }

  // Compter les artifacts par rôle
  const roles = ['admin', 'gestionnaire', 'prestataire', 'locataire', 'auth', 'general']
  const artifactsByRole: Record<string, { screenshots: number; videos: number; traces: number }> = {}

  for (const role of roles) {
    artifactsByRole[role] = {
      screenshots: countFiles(path.join(testDir, 'screenshots', role), '.png'),
      videos: countFiles(path.join(testDir, 'videos', role), '.webm'),
      traces: countFiles(path.join(testDir, 'traces', role), '.zip')
    }
  }

  // Totaux
  const screenshotCount = Object.values(artifactsByRole).reduce((sum, r) => sum + r.screenshots, 0)
  const videoCount = Object.values(artifactsByRole).reduce((sum, r) => sum + r.videos, 0)
  const traceCount = Object.values(artifactsByRole).reduce((sum, r) => sum + r.traces, 0)

  const summary = `# SEIDO Test Summary Report
Generated: ${new Date().toLocaleString('fr-FR')}

## Test Results
- ✅ **Passed**: ${testResults.summary?.passed || 0}
- ❌ **Failed**: ${testResults.summary?.failed || 0}
- ⏭️ **Skipped**: ${testResults.summary?.skipped || 0}
- ⏱️ **Duration**: ${((testResults.summary?.duration || 0) / 1000).toFixed(2)}s

## Artifacts Generated (Total)
- 📸 **Screenshots**: ${screenshotCount} files
- 🎥 **Videos**: ${videoCount} files
- 🔍 **Traces**: ${traceCount} files

## Artifacts by Role
${roles.map(role => {
  const count = artifactsByRole[role]
  if (count.screenshots + count.videos + count.traces === 0) return ''

  const roleEmoji = {
    admin: '👨‍💼',
    gestionnaire: '🏢',
    prestataire: '🔧',
    locataire: '🏠',
    auth: '🔐',
    general: '📋'
  }[role] || '📁'

  return `
### ${roleEmoji} ${role.charAt(0).toUpperCase() + role.slice(1)}
- Screenshots: ${count.screenshots}
- Videos: ${count.videos}
- Traces: ${count.traces}`
}).filter(Boolean).join('\n')}

## Test Suites
${testResults.results?.map((_r: unknown) => `
### ${r.suite}
- Passed: ${r.passed}
- Failed: ${r.failed}
- Duration: ${(r.duration / 1000).toFixed(2)}s
${r.errors?.length > 0 ? `\n#### Errors:\n${r.errors.join('\n')}` : ''}
`).join('\n') || 'No suite results available'}

## Archive Location
\`${path.join('test', 'archives', timestamp)}\`

## Next Steps
1. Review failed tests in the HTML report
2. Check screenshots for visual issues
3. Analyze traces for debugging
4. Update tests as needed

---
*Generated by SEIDO Test Infrastructure*
`

  // Créer le dossier reports s'il n'existe pas
  const reportsDir = path.dirname(reportPath)
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  fs.writeFileSync(reportPath, summary)
  console.log(`  📊 Rapport de synthèse généré: ${reportPath}`)
}

/**
 * Compte les fichiers avec une extension donnée
 */
function countFiles(dir: string, extension: string): number {
  if (!fs.existsSync(dir)) return 0

  let count = 0
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      count += countFiles(fullPath, extension)
    } else if (file.endsWith(extension)) {
      count++
    }
  }

  return count
}

/**
 * Nettoie les fichiers temporaires
 */
function cleanupTempFiles(_testDir: string) {
  const tempPatterns = [
    '*.tmp',
    '*.log',
    '.DS_Store',
    'Thumbs.db'
  ]

  console.log('  🗑️ Nettoyage des fichiers temporaires...')

  for (const pattern of tempPatterns) {
    try {
      // Utiliser find sur Unix ou dir sur Windows
      if (process.platform === 'win32') {
        execSync(`del /s /q "${path.join(testDir, pattern)}" 2>nul`, {
          shell: 'cmd.exe'
        })
      } else {
        execSync(`find "${testDir}" -name "${pattern}" -delete 2>/dev/null || true`)
      }
    } catch {
      // Ignorer les erreurs
    }
  }
}

/**
 * Optimise les screenshots (compression)
 */
async function optimizeScreenshots(_testDir: string) {
  const screenshotDir = path.join(testDir, 'screenshots')

  if (!fs.existsSync(screenshotDir)) return

  console.log('  🖼️ Optimisation des screenshots...')

  // Compter la taille totale avant
  const sizeBefore = getDirectorySize(screenshotDir)

  // Note: Pour une vraie compression, il faudrait installer sharp ou imagemin
  // Ici on fait juste un placeholder
  // Pour l'instant, on garde les images telles quelles

  const sizeAfter = getDirectorySize(screenshotDir)

  if (sizeBefore > 0) {
    const saved = ((sizeBefore - sizeAfter) / 1024 / 1024).toFixed(2)
    console.log(`     Économisé: ${saved} MB`)
  }
}

/**
 * Calcule la taille d'un dossier
 */
function getDirectorySize(_dir: string): number {
  if (!fs.existsSync(dir)) return 0

  let size = 0
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      size += getDirectorySize(fullPath)
    } else {
      size += stat.size
    }
  }

  return size
}

/**
 * Vérifie l'espace disque et nettoie si nécessaire
 */
async function checkAndCleanupDiskSpace(_testDir: string) {
  const archiveDir = path.join(testDir, 'archives')

  if (!fs.existsSync(archiveDir)) return

  // Calculer la taille totale des archives
  const totalSize = getDirectorySize(archiveDir)
  const maxSizeGB = 5 // Limite à 5GB

  if (totalSize > maxSizeGB * 1024 * 1024 * 1024) {
    console.log('  ⚠️ Espace disque: nettoyage des anciennes archives...')

    // Lister et trier les archives par date
    const archives = fs.readdirSync(archiveDir)
      .map(dir => ({
        name: dir,
        path: path.join(archiveDir, dir),
        time: fs.statSync(path.join(archiveDir, dir)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)

    // Garder seulement les 10 dernières archives
    const toDelete = archives.slice(10)

    for (const archive of toDelete) {
      fs.rmSync(archive.path, { recursive: true, force: true })
      console.log(`     Supprimé: ${archive.name}`)
    }
  }

  // Afficher l'espace utilisé
  const usedSpaceMB = (getDirectorySize(testDir) / 1024 / 1024).toFixed(2)
  console.log(`  💾 Espace utilisé par les tests: ${usedSpaceMB} MB`)
}

export default globalTeardown
