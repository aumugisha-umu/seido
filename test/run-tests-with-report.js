#!/usr/bin/env node

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Démarrage des tests SEIDO avec génération de rapport complet...\n')

// Nettoyer les anciens résultats
const testDir = path.join(__dirname)
const dirsToClean = ['test-results', 'reports', 'screenshots', 'videos']

dirsToClean.forEach(dir => {
  const fullPath = path.join(testDir, dir)
  if (fs.existsSync(fullPath)) {
    console.log(`🧹 Nettoyage de ${dir}/...`)
    fs.rmSync(fullPath, { recursive: true, force: true })
  }
  fs.mkdirSync(fullPath, { recursive: true })
})

// Configuration des tests à exécuter
const testSuites = process.argv.includes('--quick') ? [
  { name: 'auth', command: 'npx playwright test test/e2e/auth' },
] : [
  { name: 'all', command: 'npx playwright test' },
]

let totalPassed = 0
let totalFailed = 0
let totalSkipped = 0
let totalDuration = 0

// Fonction pour exécuter un test
function runTest(suite, callback) {
  const startTime = Date.now()
  console.log(`\n📋 Exécution de la suite: ${suite.name}`)
  console.log('─'.repeat(50))

  exec(suite.command, (error, stdout, stderr) => {
    const duration = Date.now() - startTime
    totalDuration += duration

    // Parser les résultats du stdout
    const passedMatch = stdout.match(/(\d+) passed/)
    const failedMatch = stdout.match(/(\d+) failed/)
    const skippedMatch = stdout.match(/(\d+) skipped/)

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0

    totalPassed += passed
    totalFailed += failed
    totalSkipped += skipped

    console.log(stdout)

    if (error && failed === 0) {
      console.error(`⚠️ Erreur lors de l'exécution: ${error.message}`)
    }

    if (stderr && !stderr.includes('DeprecationWarning')) {
      console.error(`⚠️ Stderr: ${stderr}`)
    }

    console.log(`\n📊 Résultats ${suite.name}:`)
    console.log(`   ✅ Réussis: ${passed}`)
    console.log(`   ❌ Échoués: ${failed}`)
    console.log(`   ⏭️  Ignorés: ${skipped}`)
    console.log(`   ⏱️  Durée: ${(duration / 1000).toFixed(2)}s`)

    callback()
  })
}

// Fonction pour générer le rapport final
function generateFinalReport() {
  console.log('\n' + '═'.repeat(60))
  console.log('📊 RAPPORT FINAL DE TEST SEIDO')
  console.log('═'.repeat(60))

  const reportContent = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalPassed + totalFailed + totalSkipped,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration: totalDuration,
      success_rate: totalPassed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2) + '%' : '0%'
    },
    artifacts: {
      screenshots: 0,
      videos: 0,
      traces: 0
    }
  }

  // Compter les artefacts
  const screenshotsDir = path.join(testDir, 'screenshots')
  const videosDir = path.join(testDir, 'videos')
  const testResultsDir = path.join(testDir, 'test-results')

  if (fs.existsSync(screenshotsDir)) {
    reportContent.artifacts.screenshots = fs.readdirSync(screenshotsDir)
      .filter(f => f.endsWith('.png')).length
  }

  if (fs.existsSync(videosDir)) {
    reportContent.artifacts.videos = fs.readdirSync(videosDir)
      .filter(f => f.endsWith('.webm') || f.endsWith('.mp4')).length
  }

  // Organiser les screenshots dans test-results
  if (fs.existsSync(testResultsDir)) {
    const dirs = fs.readdirSync(testResultsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())

    dirs.forEach(dir => {
      const dirPath = path.join(testResultsDir, dir.name)
      const files = fs.readdirSync(dirPath)

      files.forEach(file => {
        if (file.endsWith('.png')) {
          const source = path.join(dirPath, file)
          const dest = path.join(screenshotsDir, `${dir.name}-${file}`)
          try {
            fs.copyFileSync(source, dest)
            reportContent.artifacts.screenshots++
            console.log(`📸 Screenshot copié: ${file}`)
          } catch (err) {
            console.error(`Erreur copie screenshot: ${err.message}`)
          }
        } else if (file.endsWith('.webm') || file.endsWith('.mp4')) {
          const source = path.join(dirPath, file)
          const dest = path.join(videosDir, `${dir.name}-${file}`)
          try {
            fs.copyFileSync(source, dest)
            reportContent.artifacts.videos++
            console.log(`🎬 Vidéo copiée: ${file}`)
          } catch (err) {
            console.error(`Erreur copie vidéo: ${err.message}`)
          }
        }
      })
    })
  }

  // Afficher le résumé
  console.log(`\n📈 Tests exécutés: ${reportContent.summary.total}`)
  console.log(`   ✅ Réussis: ${reportContent.summary.passed}`)
  console.log(`   ❌ Échoués: ${reportContent.summary.failed}`)
  console.log(`   ⏭️  Ignorés: ${reportContent.summary.skipped}`)
  console.log(`   📊 Taux de réussite: ${reportContent.summary.success_rate}`)
  console.log(`   ⏱️  Durée totale: ${(reportContent.summary.duration / 1000).toFixed(2)}s`)

  console.log(`\n📁 Artefacts générés:`)
  console.log(`   📸 Screenshots: ${reportContent.artifacts.screenshots}`)
  console.log(`   🎬 Vidéos: ${reportContent.artifacts.videos}`)

  // Sauvegarder le rapport JSON
  const jsonReportPath = path.join(testDir, 'reports', 'final-report.json')
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportContent, null, 2))
  console.log(`\n💾 Rapport JSON sauvegardé: ${jsonReportPath}`)

  // Créer un rapport markdown
  const markdownReport = `# Rapport de Test SEIDO
Date: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}

## 📊 Résumé des Tests

- **Total de tests:** ${reportContent.summary.total}
- **Tests réussis:** ${reportContent.summary.passed} ✅
- **Tests échoués:** ${reportContent.summary.failed} ❌
- **Tests ignorés:** ${reportContent.summary.skipped} ⏭️
- **Taux de réussite:** ${reportContent.summary.success_rate}
- **Durée totale:** ${(reportContent.summary.duration / 1000).toFixed(2)}s

## 📁 Artefacts Générés

- **Screenshots:** ${reportContent.artifacts.screenshots} captures
- **Vidéos:** ${reportContent.artifacts.videos} enregistrements

## 🔍 Consultation des Résultats

### Rapport HTML Interactif
\`\`\`bash
npx playwright show-report test/reports/html
\`\`\`

### Screenshots
Disponibles dans: \`test/screenshots/\`

### Vidéos
Disponibles dans: \`test/videos/\`

### Traces Playwright
Disponibles dans: \`test/test-results/\`

## ${reportContent.summary.failed > 0 ? '❌ Tests Échoués' : '✅ Tous les Tests Réussis'}

${reportContent.summary.failed > 0 ?
`Les tests suivants ont échoué et nécessitent votre attention.
Consultez les screenshots et vidéos pour plus de détails.` :
'Félicitations! Tous les tests sont passés avec succès.'}

---
*Rapport généré automatiquement par SEIDO Test Runner*
`

  const markdownPath = path.join(testDir, 'reports', 'test-summary.md')
  fs.writeFileSync(markdownPath, markdownReport)
  console.log(`📄 Rapport Markdown créé: ${markdownPath}`)

  // Ouvrir le rapport HTML si disponible
  if (!process.argv.includes('--no-open')) {
    console.log('\n🌐 Ouverture du rapport HTML...')
    exec('npx playwright show-report test/reports/html', (err) => {
      if (err) {
        console.log('ℹ️  Pour voir le rapport HTML: npx playwright show-report test/reports/html')
      }
    })
  }

  // Retourner le code de sortie approprié
  process.exit(reportContent.summary.failed > 0 ? 1 : 0)
}

// Exécuter les tests
let currentIndex = 0

function runNextTest() {
  if (currentIndex < testSuites.length) {
    runTest(testSuites[currentIndex], () => {
      currentIndex++
      runNextTest()
    })
  } else {
    generateFinalReport()
  }
}

// Démarrer l'exécution
console.log('🎯 Suites de test à exécuter:', testSuites.map(s => s.name).join(', '))
runNextTest()