#!/usr/bin/env node
/**
 * Script de test backend pour SEIDO
 * Génère des rapports détaillés avec captures d'écran dans test/
 */

import { exec, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const execPromise = promisify(exec)

interface TestConfig {
  outputDir: string
  screenshotDir: string
  reportDir: string
  videoDir: string
  traceDir: string
}

interface TestResult {
  suite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  screenshots: string[]
  errors: string[]
}

class SefdoBackendTestRunner {
  private config: TestConfig
  private startTime: number = 0
  private results: TestResult[] = []

  constructor() {
    const baseDir = path.join(process.cwd(), 'test')

    this.config = {
      outputDir: path.join(baseDir, 'test-results'),
      screenshotDir: path.join(baseDir, 'screenshots'),
      reportDir: path.join(baseDir, 'reports'),
      videoDir: path.join(baseDir, 'videos'),
      traceDir: path.join(baseDir, 'traces'),
    }

    this.ensureDirectories()
  }

  private ensureDirectories() {
    Object.values(this.config).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`✅ Créé: ${dir}`)
      }
    })
  }

  private cleanupOldArtifacts() {
    console.log('🧹 Nettoyage des anciens artifacts...')

    // Garder seulement les 5 derniers rapports
    const reportFiles = fs.readdirSync(this.config.reportDir)
      .filter(file => file.endsWith('.html') || file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(this.config.reportDir, file),
        time: fs.statSync(path.join(this.config.reportDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)

    // Supprimer les anciens rapports (garder les 5 derniers)
    reportFiles.slice(5).forEach(file => {
      fs.unlinkSync(file.path)
      console.log(`  Supprimé: ${file.name}`)
    })
  }

  private async runPlaywrightTests(spec?: string): Promise<TestResult> {
    const command = spec
      ? `npx playwright test ${spec}`
      : 'npx playwright test'

    console.log(`\n🚀 Exécution: ${command}`)

    const result: TestResult = {
      suite: spec || 'all',
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      screenshots: [],
      errors: []
    }

    try {
      const startTime = Date.now()
      const { stdout, stderr } = await execPromise(command, {
        env: {
          ...process.env,
          FORCE_COLOR: '1',
          CI: 'false', // Forcer le mode non-CI pour plus de détails
        }
      })

      result.duration = Date.now() - startTime

      // Parser les résultats depuis stdout
      const passedMatch = stdout.match(/(\d+) passed/)
      const failedMatch = stdout.match(/(\d+) failed/)
      const skippedMatch = stdout.match(/(\d+) skipped/)

      if (passedMatch) result.passed = parseInt(passedMatch[1])
      if (failedMatch) result.failed = parseInt(failedMatch[1])
      if (skippedMatch) result.skipped = parseInt(skippedMatch[1])

      // Collecter les screenshots générés
      if (fs.existsSync(this.config.screenshotDir)) {
        result.screenshots = fs.readdirSync(this.config.screenshotDir)
          .filter(file => file.endsWith('.png') || file.endsWith('.jpg'))
      }

      if (stderr) {
        result.errors.push(stderr)
      }

      console.log(`✅ Suite terminée: ${result.passed} passed, ${result.failed} failed`)

    } catch (error: any) {
      result.failed = 1
      result.errors.push(error.message || 'Test execution failed')
      console.error(`❌ Erreur: ${error.message}`)
    }

    return result
  }

  private async generateHTMLReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportPath = path.join(this.config.reportDir, `report-${timestamp}.html`)

    const totalPassed = this.results.reduce((acc, r) => acc + r.passed, 0)
    const totalFailed = this.results.reduce((acc, r) => acc + r.failed, 0)
    const totalSkipped = this.results.reduce((acc, r) => acc + r.skipped, 0)
    const totalDuration = Date.now() - this.startTime

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEIDO Backend Test Report - ${new Date().toLocaleString('fr-FR')}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            padding: 2rem;
            background: #f8f9fa;
        }
        .metric {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        .metric-label {
            color: #6c757d;
            font-size: 0.9rem;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suites {
            padding: 2rem;
        }
        .suite {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .suite-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #f0f0f0;
        }
        .suite-name {
            font-size: 1.25rem;
            font-weight: 600;
        }
        .suite-stats {
            display: flex;
            gap: 1rem;
        }
        .stat {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        .stat.passed {
            background: #d4edda;
            color: #155724;
        }
        .stat.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .screenshot {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: transform 0.2s;
        }
        .screenshot:hover {
            transform: scale(1.05);
        }
        .screenshot img {
            width: 100%;
            height: 150px;
            object-fit: cover;
        }
        .errors {
            background: #fff5f5;
            border: 1px solid #feb2b2;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
        }
        .error-title {
            color: #c53030;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .error-content {
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            color: #742a2a;
            white-space: pre-wrap;
        }
        .footer {
            background: #f8f9fa;
            padding: 2rem;
            text-align: center;
            color: #6c757d;
        }
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e9ecef;
            border-radius: 15px;
            overflow: hidden;
            margin: 1rem 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 SEIDO Backend Test Report</h1>
            <p>${new Date().toLocaleString('fr-FR')}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value passed">${totalPassed}</div>
                <div class="metric-label">Tests réussis</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${totalFailed}</div>
                <div class="metric-label">Tests échoués</div>
            </div>
            <div class="metric">
                <div class="metric-value skipped">${totalSkipped}</div>
                <div class="metric-label">Tests ignorés</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(totalDuration / 1000).toFixed(2)}s</div>
                <div class="metric-label">Durée totale</div>
            </div>
        </div>

        <div class="suites">
            <h2 style="margin-bottom: 1rem;">Résultats détaillés</h2>

            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(totalPassed / (totalPassed + totalFailed + totalSkipped) * 100).toFixed(1)}%">
                    ${((totalPassed / (totalPassed + totalFailed + totalSkipped)) * 100).toFixed(1)}% de réussite
                </div>
            </div>

            ${this.results.map(result => `
                <div class="suite">
                    <div class="suite-header">
                        <div class="suite-name">📦 ${result.suite}</div>
                        <div class="suite-stats">
                            ${result.passed > 0 ? `<span class="stat passed">✓ ${result.passed} passed</span>` : ''}
                            ${result.failed > 0 ? `<span class="stat failed">✗ ${result.failed} failed</span>` : ''}
                            ${result.skipped > 0 ? `<span class="stat skipped">⊘ ${result.skipped} skipped</span>` : ''}
                        </div>
                    </div>

                    <div style="color: #6c757d; font-size: 0.9rem;">
                        Durée: ${(result.duration / 1000).toFixed(2)}s
                    </div>

                    ${result.screenshots.length > 0 ? `
                        <div class="screenshots">
                            ${result.screenshots.map(screenshot => `
                                <div class="screenshot">
                                    <img src="../screenshots/${screenshot}" alt="${screenshot}" />
                                    <div style="padding: 0.5rem; font-size: 0.8rem; text-align: center;">
                                        ${screenshot}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${result.errors.length > 0 ? `
                        <div class="errors">
                            <div class="error-title">⚠️ Erreurs détectées</div>
                            <div class="error-content">${result.errors.join('\n')}</div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p>📊 Rapport généré automatiquement par SEIDO Backend Test Runner</p>
            <p style="margin-top: 0.5rem;">
                <a href="./test-results.json" style="color: #667eea;">Voir les données JSON</a> |
                <a href="../traces" style="color: #667eea;">Voir les traces</a> |
                <a href="../videos" style="color: #667eea;">Voir les vidéos</a>
            </p>
        </div>
    </div>

    <script>
        // Auto-refresh si tests en cours
        if (window.location.hash === '#auto-refresh') {
            setTimeout(() => window.location.reload(), 5000);
        }

        // Lightbox pour les screenshots
        document.querySelectorAll('.screenshot').forEach(el => {
            el.addEventListener('click', () => {
                const img = el.querySelector('img');
                const lightbox = document.createElement('div');
                lightbox.style.cssText = \`
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    cursor: pointer;
                \`;

                const fullImg = document.createElement('img');
                fullImg.src = img.src;
                fullImg.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 10px;';

                lightbox.appendChild(fullImg);
                lightbox.onclick = () => document.body.removeChild(lightbox);
                document.body.appendChild(lightbox);
            });
        });
    </script>
</body>
</html>`

    fs.writeFileSync(reportPath, html)
    console.log(`\n📊 Rapport HTML généré: ${reportPath}`)

    // Générer aussi un rapport JSON
    const jsonPath = path.join(this.config.reportDir, 'test-results.json')
    fs.writeFileSync(jsonPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        duration: totalDuration
      },
      results: this.results
    }, null, 2))

    return reportPath
  }

  public async runTests(options: {
    suite?: string
    pattern?: string
    generateReport?: boolean
    openReport?: boolean
  } = {}) {
    console.log(`
╔═══════════════════════════════════════════╗
║     SEIDO BACKEND TEST RUNNER v1.0.0     ║
╚═══════════════════════════════════════════╝
`)

    this.startTime = Date.now()
    this.cleanupOldArtifacts()

    // Lancer les tests
    if (options.suite) {
      const result = await this.runPlaywrightTests(options.suite)
      this.results.push(result)
    } else if (options.pattern) {
      // Trouver tous les fichiers matching le pattern
      const testFiles = execSync(`find test/e2e -name "${options.pattern}"`)
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean)

      for (const file of testFiles) {
        const result = await this.runPlaywrightTests(file)
        this.results.push(result)
      }
    } else {
      // Lancer tous les tests
      const result = await this.runPlaywrightTests()
      this.results.push(result)
    }

    // Générer le rapport
    if (options.generateReport !== false) {
      const reportPath = await this.generateHTMLReport()

      if (options.openReport) {
        const openCommand = process.platform === 'win32'
          ? `start ${reportPath}`
          : process.platform === 'darwin'
          ? `open ${reportPath}`
          : `xdg-open ${reportPath}`

        exec(openCommand)
      }
    }

    // Afficher le résumé
    console.log(`
╔═══════════════════════════════════════════╗
║              RÉSUMÉ DES TESTS             ║
╚═══════════════════════════════════════════╝

  ✅ Réussis:  ${this.results.reduce((acc, r) => acc + r.passed, 0)}
  ❌ Échoués:  ${this.results.reduce((acc, r) => acc + r.failed, 0)}
  ⏭️  Ignorés:  ${this.results.reduce((acc, r) => acc + r.skipped, 0)}
  ⏱️  Durée:    ${((Date.now() - this.startTime) / 1000).toFixed(2)}s

  📁 Artifacts sauvegardés dans:
     - Screenshots: ${this.config.screenshotDir}
     - Vidéos:      ${this.config.videoDir}
     - Traces:      ${this.config.traceDir}
     - Rapports:    ${this.config.reportDir}
`)

    // Retourner le code de sortie approprié
    const hasFailures = this.results.some(r => r.failed > 0)
    process.exit(hasFailures ? 1 : 0)
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2)
  const runner = new SefdoBackendTestRunner()

  const options = {
    suite: args.find(a => a.startsWith('--suite='))?.split('=')[1],
    pattern: args.find(a => a.startsWith('--pattern='))?.split('=')[1],
    generateReport: !args.includes('--no-report'),
    openReport: args.includes('--open')
  }

  runner.runTests(options).catch(console.error)
}

export { SefdoBackendTestRunner }
