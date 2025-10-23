#!/usr/bin/env tsx

/**
 * Script d'Analyse des Résultats E2E
 * Utilise l'agent debugger pour analyser les derniers résultats de tests
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { SeidoDebuggerAgent, createSeidoDebugger } from './seido-debugger-agent'
import { logger, logError } from '@/lib/logger'
import { TestExecutionSummary } from './e2e-test-logger'

interface AnalysisOptions {
  reportsDir?: string
  outputFormat?: 'console' | 'html' | 'json' | 'all'
  verbose?: boolean
  daysBack?: number
}

/**
 * Analyser les résultats de tests E2E
 */
async function analyzeTestResults(options: AnalysisOptions = {}) {
  const {
    reportsDir = path.resolve(__dirname, '../reports'),
    outputFormat = 'all',
    verbose = false,
    daysBack = 7
  } = options

  console.log('🔍 Starting E2E test results analysis...')
  console.log(`📂 Reports directory: ${reportsDir}`)
  console.log(`📅 Analyzing last ${daysBack} days`)

  try {
    // Initialiser l'agent debugger
    const debugger = createSeidoDebugger()

    // Collecter les résultats de tests récents
    const testSummaries = await collectRecentTestResults(reportsDir, daysBack)

    if (testSummaries.length === 0) {
      console.log('⚠️  No test results found in the specified timeframe')
      console.log('💡 Try running some tests first: npm run test:e2e:auth')
      return
    }

    console.log(`📊 Found ${testSummaries.length} test executions to analyze`)

    // Exécuter l'analyse avec l'agent debugger
    console.log('🤖 Running intelligent analysis...')
    const analysis = await debugger.analyzeTestRun(testSummaries)

    // Afficher les résultats selon le format demandé
    await displayAnalysis(analysis, outputFormat, verbose)

    console.log('✅ Analysis complete!')
    console.log(`📁 Reports saved to: ${analysis.reportPaths.html}`)

  } catch (error) {
    console.error('❌ Analysis failed:', error)
    process.exit(1)
  }
}

/**
 * Collecter les résultats de tests récents
 */
async function collectRecentTestResults(
  reportsDir: string,
  daysBack: number
): Promise<TestExecutionSummary[]> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  const testSummaries: TestExecutionSummary[] = []

  try {
    // Chercher dans le dossier des logs structurés
    const logsDir = path.resolve(reportsDir, '../logs/structured')
    const files = await fs.readdir(logsDir)

    const jsonFiles = files
      .filter(f => f.endsWith('.json'))
      .filter(f => {
        // Extraire la date du nom de fichier si possible
        const match = f.match(/(\d{13})/) // timestamp
        if (match) {
          const timestamp = parseInt(match[1])
          const fileDate = new Date(timestamp)
          return fileDate >= cutoffDate
        }
        return true // Inclure les fichiers sans timestamp clair
      })

    console.log(`🔍 Examining ${jsonFiles.length} log files...`)

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(logsDir, file)
        const content = await fs.readFile(filePath, 'utf-8')

        // Tenter de parser comme un summary de test complet
        if (content.includes('"testId"') && content.includes('"totalSteps"')) {
          const summary = JSON.parse(content) as TestExecutionSummary
          testSummaries.push(summary)
        } else {
          // Tenter d'extraire les informations depuis les logs Pino
          const logs = content.split('\n').filter(line => line.trim())
          const parsedSummary = extractSummaryFromLogs(logs, file)
          if (parsedSummary) {
            testSummaries.push(parsedSummary)
          }
        }
      } catch (error) {
        if (process.env.DEBUG) {
          console.warn(`⚠️  Could not parse ${file}:`, error)
        }
      }
    }

  } catch (error) {
    console.warn('⚠️  Could not read logs directory:', error)
  }

  // Si pas de logs structurés, essayer les exports Playwright
  if (testSummaries.length === 0) {
    await tryParsePlaywrightReports(reportsDir, testSummaries, cutoffDate)
  }

  return testSummaries
}

/**
 * Extraire un résumé depuis les logs Pino
 */
function extractSummaryFromLogs(logs: string[], fileName: string): TestExecutionSummary | null {
  try {
    const testEvents = logs
      .map(line => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(log => log && log.testId)

    if (testEvents.length === 0) return null

    const testId = testEvents[0].testId
    const testName = testEvents[0].testFile || fileName.replace('.json', '')
    const userRole = testEvents[0].userRole || 'unknown'

    // Calculer les statistiques depuis les events
    const startEvent = testEvents.find(e => e.event === 'test_start')
    const endEvent = testEvents.find(e => e.event === 'test_complete')

    const startTime = startEvent ? new Date(startEvent.timestamp).getTime() : Date.now()
    const endTime = endEvent ? new Date(endEvent.timestamp).getTime() : Date.now()

    const steps = testEvents.filter(e => e.event === 'test_step')
    const errorSteps = testEvents.filter(e => e.event === 'test_step_error')

    return {
      testId,
      testName,
      userRole,
      totalSteps: steps.length,
      totalDuration: endTime - startTime,
      successfulSteps: steps.length - errorSteps.length,
      errorSteps: errorSteps.length,
      screenshots: testEvents
        .filter(e => e.screenshotPath)
        .map(e => e.screenshotPath),
      performanceReport: {
        stepDuration: steps.length > 0
          ? steps.reduce((acc, s) => acc + (s.stepDuration || 0), 0) / steps.length
          : 0,
        totalDuration: endTime - startTime,
        memoryUsage: process.memoryUsage()
      },
      logFiles: {
        structured: fileName,
        performance: fileName.replace('.json', '-perf.log'),
        errors: errorSteps.length > 0 ? fileName.replace('.json', '-errors.log') : ''
      }
    }
  } catch (error) {
    return null
  }
}

/**
 * Essayer de parser les rapports Playwright
 */
async function tryParsePlaywrightReports(
  reportsDir: string,
  testSummaries: TestExecutionSummary[],
  cutoffDate: Date
) {
  try {
    const debuggerDir = path.join(reportsDir, 'debugger')
    const files = await fs.readdir(debuggerDir)

    const playwrightExports = files
      .filter(f => f.startsWith('playwright-export-') && f.endsWith('.json'))

    for (const file of playwrightExports) {
      try {
        const filePath = path.join(debuggerDir, file)
        const stats = await fs.stat(filePath)

        if (stats.mtime >= cutoffDate) {
          const content = await fs.readFile(filePath, 'utf-8')
          const data = JSON.parse(content)

          // Convertir les données Playwright en format TestExecutionSummary
          if (data.projects && Array.isArray(data.projects)) {
            for (const project of data.projects) {
              if (project.results && Array.isArray(project.results)) {
                for (const result of project.results) {
                  testSummaries.push({
                    testId: `${project.name}-${Date.now()}`,
                    testName: project.name,
                    userRole: project.name.includes('admin') ? 'admin' :
                             project.name.includes('gestionnaire') ? 'gestionnaire' :
                             project.name.includes('locataire') ? 'locataire' :
                             project.name.includes('prestataire') ? 'prestataire' : 'unknown',
                    totalSteps: 1, // Approximation
                    totalDuration: result.duration || 0,
                    successfulSteps: result.status === 'passed' ? 1 : 0,
                    errorSteps: result.status === 'failed' ? 1 : 0,
                    screenshots: [],
                    performanceReport: {
                      stepDuration: result.duration || 0,
                      totalDuration: result.duration || 0
                    },
                    logFiles: {
                      structured: file,
                      performance: '',
                      errors: result.errors ? file : ''
                    }
                  })
                }
              }
            }
          }
        }
      } catch (error) {
        if (process.env.DEBUG) {
          console.warn(`⚠️  Could not parse Playwright export ${file}:`, error)
        }
      }
    }
  } catch (error) {
    // Pas de dossier debugger, ce n'est pas grave
  }
}

/**
 * Afficher l'analyse selon le format demandé
 */
async function displayAnalysis(
  analysis: any,
  format: string,
  verbose: boolean
) {
  const { summary, errorPatterns, performanceIssues, recommendations, stabilityMetrics } = analysis

  // Toujours afficher un résumé console
  if (format === 'console' || format === 'all') {
    console.log('\n📊 ANALYSIS SUMMARY')
    console.log('==================')
    console.log(`🧪 Total tests: ${summary.totalTests}`)
    console.log(`✅ Successful: ${summary.successfulTests} (${Math.round(summary.successfulTests/summary.totalTests*100)}%)`)
    console.log(`❌ Failed: ${summary.failedTests} (${Math.round(summary.failedTests/summary.totalTests*100)}%)`)
    console.log(`⏱️  Average duration: ${Math.round(summary.averageTestDuration/1000)}s`)
    console.log(`📈 Overall success rate: ${Math.round(stabilityMetrics.overallSuccessRate)}%`)

    if (errorPatterns.length > 0) {
      console.log('\n🚨 ERROR PATTERNS')
      console.log('==================')
      errorPatterns.slice(0, 5).forEach((pattern: any) => {
        console.log(`${pattern.type}: ${pattern.frequency} occurrences (${pattern.severity})`)
        if (verbose) {
          console.log(`  → ${pattern.recommendation}`)
        }
      })
    }

    if (performanceIssues.length > 0) {
      console.log('\n⚡ PERFORMANCE ISSUES')
      console.log('=====================')
      performanceIssues.slice(0, 3).forEach((issue: any) => {
        console.log(`${issue.type}: ${issue.affectedSteps.length} steps affected (${issue.impact} impact)`)
        if (verbose) {
          console.log(`  → ${issue.recommendation}`)
        }
      })
    }

    console.log('\n💡 TOP RECOMMENDATIONS')
    console.log('=======================')
    recommendations.slice(0, 5).forEach((rec: any, index: number) => {
      const priority = rec.priority.toUpperCase()
      const icon = rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : '💡'
      console.log(`${index + 1}. ${icon} [${priority}] ${rec.description}`)
      if (verbose && rec.actionItems.length > 0) {
        rec.actionItems.forEach((item: string) => {
          console.log(`     • ${item}`)
        })
      }
    })

    if (stabilityMetrics.flakyTests.length > 0) {
      console.log('\n🔄 FLAKY TESTS')
      console.log('===============')
      stabilityMetrics.flakyTests.slice(0, 3).forEach((flaky: any) => {
        console.log(`${flaky.testName}: ${Math.round(flaky.failureRate)}% failure rate`)
      })
    }
  }

  // Informations sur les rapports générés
  console.log('\n📁 GENERATED REPORTS')
  console.log('=====================')
  console.log(`HTML Report: ${analysis.reportPaths.html}`)
  console.log(`JSON Report: ${analysis.reportPaths.json}`)
  console.log(`Detailed Data: ${analysis.reportPaths.detailed}`)

  if (format === 'html' || format === 'all') {
    console.log('\n🌐 Opening HTML report...')
    // Tenter d'ouvrir le rapport HTML
    try {
      const { exec } = require('child_process')
      const command = process.platform === 'win32' ? 'start' :
                     process.platform === 'darwin' ? 'open' : 'xdg-open'
      exec(`${command} "${analysis.reportPaths.html}"`)
    } catch (error) {
      console.log(`Manual open: file://${analysis.reportPaths.html}`)
    }
  }
}

/**
 * Parser les arguments de ligne de commande
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const options: AnalysisOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--format':
        options.outputFormat = args[++i] as any
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--days':
        options.daysBack = parseInt(args[++i]) || 7
        break
      case '--reports-dir':
        options.reportsDir = args[++i]
        break
      case '--help':
      case '-h':
        console.log(`
🚀 SEIDO E2E Test Results Analyzer

Usage: npm run test:analyze [options]

Options:
  --format <type>     Output format: console|html|json|all (default: all)
  --verbose, -v       Verbose output with detailed recommendations
  --days <number>     Days back to analyze (default: 7)
  --reports-dir <dir> Custom reports directory
  --help, -h          Show this help

Examples:
  npm run test:analyze                    # Full analysis with all formats
  npm run test:analyze -- --format html  # HTML report only
  npm run test:analyze -- --verbose      # Detailed console output
  npm run test:analyze -- --days 3       # Last 3 days only
        `)
        process.exit(0)
    }
  }

  return options
}

// Exécution du script
if (require.main === module) {
  const options = parseArgs()
  analyzeTestResults(options).catch(console.error)
}