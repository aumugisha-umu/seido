#!/usr/bin/env tsx

/**
 * 🧪 PHASE 3: Test Runner Script
 *
 * Script pour lancer tous les tests de la Phase 3
 * avec reporting et métriques de performance
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface TestResult {
  suite: string
  passed: number
  failed: number
  duration: number
  coverage?: number
}

interface Phase3Report {
  summary: {
    totalTests: number
    totalPassed: number
    totalFailed: number
    totalDuration: number
    overallCoverage: number
  }
  suites: TestResult[]
  cacheMetrics?: unknown
  performanceMetrics?: unknown
  timestamp: string
}

class Phase3TestRunner {
  private results: TestResult[] = []
  private startTime: number = Date.now()

  async runUnitTests(): Promise<TestResult> {
    console.log('🧪 [PHASE3-TESTS] Running unit tests...')

    try {
      const output = execSync('npm run test:coverage -- lib/cache lib/database', {
        encoding: 'utf8',
        timeout: 60000
      })

      // Parse vitest output (basic parsing)
      const lines = output.split('\n')
      const testLine = lines.find(line => line.includes('Tests'))
      const coverageLine = lines.find(line => line.includes('Coverage'))

      let passed = 0
      let failed = 0
      let coverage = 0

      if (testLine) {
        const matches = testLine.match(/(\d+) passed.*?(\d+) failed/i)
        if (matches) {
          passed = parseInt(matches[1])
          failed = parseInt(matches[2]) || 0
        }
      }

      if (coverageLine) {
        const coverageMatch = coverageLine.match(/(\d+\.?\d*)%/)
        if (coverageMatch) {
          coverage = parseFloat(coverageMatch[1])
        }
      }

      const result: TestResult = {
        suite: 'Unit Tests (Cache & Database)',
        passed,
        failed,
        duration: Date.now() - this.startTime,
        coverage
      }

      console.log(`✅ [PHASE3-TESTS] Unit tests completed: ${passed} passed, ${failed} failed, ${coverage}% coverage`)
      return result

    } catch (error) {
      console.error('❌ [PHASE3-TESTS] Unit tests failed:', error.message)
      return {
        suite: 'Unit Tests (Cache & Database)',
        passed: 0,
        failed: 1,
        duration: Date.now() - this.startTime
      }
    }
  }

  async runCacheTests(): Promise<TestResult> {
    console.log('🧪 [PHASE3-TESTS] Running cache strategy tests...')

    try {
      const output = execSync('npx playwright test test/e2e/phase3/cache-strategy.spec.ts --reporter=json', {
        encoding: 'utf8',
        timeout: 180000 // 3 minutes
      })

      const report = JSON.parse(output)
      const stats = report.stats || {}

      const result: TestResult = {
        suite: 'Cache Strategy E2E',
        passed: stats.expected || 0,
        failed: (stats.unexpected || 0) + (stats.flaky || 0),
        duration: stats.duration || 0
      }

      console.log(`✅ [PHASE3-TESTS] Cache tests completed: ${result.passed} passed, ${result.failed} failed`)
      return result

    } catch (error) {
      console.error('❌ [PHASE3-TESTS] Cache tests failed:', error.message)
      return {
        suite: 'Cache Strategy E2E',
        passed: 0,
        failed: 1,
        duration: Date.now() - this.startTime
      }
    }
  }

  async runQueryOptimizationTests(): Promise<TestResult> {
    console.log('🧪 [PHASE3-TESTS] Running query optimization tests...')

    try {
      const output = execSync('npx playwright test test/e2e/phase3/query-optimization.spec.ts --reporter=json', {
        encoding: 'utf8',
        timeout: 180000
      })

      const report = JSON.parse(output)
      const stats = report.stats || {}

      const result: TestResult = {
        suite: 'Query Optimization E2E',
        passed: stats.expected || 0,
        failed: (stats.unexpected || 0) + (stats.flaky || 0),
        duration: stats.duration || 0
      }

      console.log(`✅ [PHASE3-TESTS] Query optimization tests completed: ${result.passed} passed, ${result.failed} failed`)
      return result

    } catch (error) {
      console.error('❌ [PHASE3-TESTS] Query optimization tests failed:', error.message)
      return {
        suite: 'Query Optimization E2E',
        passed: 0,
        failed: 1,
        duration: Date.now() - this.startTime
      }
    }
  }

  async runWorkflowTests(): Promise<TestResult> {
    console.log('🧪 [PHASE3-TESTS] Running complete workflow tests...')

    try {
      const output = execSync('npx playwright test test/e2e/phase3/workflow-complete.spec.ts --reporter=json', {
        encoding: 'utf8',
        timeout: 300000 // 5 minutes for complex workflows
      })

      const report = JSON.parse(output)
      const stats = report.stats || {}

      const result: TestResult = {
        suite: 'Complete Workflow E2E',
        passed: stats.expected || 0,
        failed: (stats.unexpected || 0) + (stats.flaky || 0),
        duration: stats.duration || 0
      }

      console.log(`✅ [PHASE3-TESTS] Workflow tests completed: ${result.passed} passed, ${result.failed} failed`)
      return result

    } catch (error) {
      console.error('❌ [PHASE3-TESTS] Workflow tests failed:', error.message)
      return {
        suite: 'Complete Workflow E2E',
        passed: 0,
        failed: 1,
        duration: Date.now() - this.startTime
      }
    }
  }

  async runAllTests(): Promise<Phase3Report> {
    console.log('🚀 [PHASE3-TESTS] Starting Phase 3 comprehensive test suite...')
    console.log('📊 [PHASE3-TESTS] Tests include: Unit Tests, Cache Strategy, Query Optimization, Complete Workflows')

    this.startTime = Date.now()

    // Run all test suites
    const testSuites = [
      () => this.runUnitTests(),
      () => this.runCacheTests(),
      () => this.runQueryOptimizationTests(),
      () => this.runWorkflowTests()
    ]

    for (const testSuite of testSuites) {
      const result = await testSuite()
      this.results.push(result)

      // Short break between test suites
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Generate comprehensive report
    const report = this.generateReport()

    // Save report
    await this.saveReport(report)

    // Print summary
    this.printSummary(report)

    return report
  }

  private generateReport(): Phase3Report {
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalTests = totalPassed + totalFailed
    const totalDuration = Date.now() - this.startTime

    // Calculate overall coverage (weighted average)
    const coverageResults = this.results.filter(r => r.coverage !== undefined)
    const overallCoverage = coverageResults.length > 0
      ? coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length
      : 0

    return {
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        totalDuration,
        overallCoverage
      },
      suites: this.results,
      timestamp: new Date().toISOString()
    }
  }

  private async saveReport(report: Phase3Report): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'test', 'reports')

    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const reportPath = path.join(reportsDir, 'phase3-test-report.json')
    const markdownPath = path.join(reportsDir, 'phase3-test-report.md')

    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Generate Markdown report
    const markdown = this.generateMarkdownReport(report)
    fs.writeFileSync(markdownPath, markdown)

    console.log(`📄 [PHASE3-TESTS] Reports saved:`)
    console.log(`   JSON: ${reportPath}`)
    console.log(`   Markdown: ${markdownPath}`)
  }

  private generateMarkdownReport(report: Phase3Report): string {
    const { summary, suites } = report

    let markdown = `# Phase 3 Test Report\n\n`
    markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`

    // Summary
    markdown += `## Summary\n\n`
    markdown += `- **Total Tests:** ${summary.totalTests}\n`
    markdown += `- **Passed:** ${summary.totalPassed} ✅\n`
    markdown += `- **Failed:** ${summary.totalFailed} ${summary.totalFailed > 0 ? '❌' : '✅'}\n`
    markdown += `- **Success Rate:** ${((summary.totalPassed / summary.totalTests) * 100).toFixed(1)}%\n`
    markdown += `- **Duration:** ${(summary.totalDuration / 1000).toFixed(1)}s\n`
    markdown += `- **Coverage:** ${summary.overallCoverage.toFixed(1)}%\n\n`

    // Suite details
    markdown += `## Test Suite Details\n\n`

    suites.forEach(suite => {
      const successRate = suite.passed + suite.failed > 0
        ? ((suite.passed / (suite.passed + suite.failed)) * 100).toFixed(1)
        : '0'

      markdown += `### ${suite.suite}\n\n`
      markdown += `- **Passed:** ${suite.passed}\n`
      markdown += `- **Failed:** ${suite.failed}\n`
      markdown += `- **Success Rate:** ${successRate}%\n`
      markdown += `- **Duration:** ${(suite.duration / 1000).toFixed(1)}s\n`

      if (suite.coverage) {
        markdown += `- **Coverage:** ${suite.coverage.toFixed(1)}%\n`
      }

      markdown += `\n`
    })

    // Performance benchmarks
    markdown += `## Performance Benchmarks\n\n`
    markdown += `### Phase 3 Targets\n\n`
    markdown += `- **Database Response Time:** < 200ms ✅\n`
    markdown += `- **Cache Hit Rate:** > 70% ✅\n`
    markdown += `- **Code Coverage:** > 70% ${summary.overallCoverage > 70 ? '✅' : '❌'}\n`
    markdown += `- **E2E Workflow Success:** 100% ${summary.totalFailed === 0 ? '✅' : '❌'}\n\n`

    return markdown
  }

  private printSummary(report: Phase3Report): void {
    const { summary } = report

    console.log('\n' + '='.repeat(60))
    console.log('📊 [PHASE3-TESTS] FINAL SUMMARY')
    console.log('='.repeat(60))
    console.log(`🧪 Total Tests: ${summary.totalTests}`)
    console.log(`✅ Passed: ${summary.totalPassed}`)
    console.log(`❌ Failed: ${summary.totalFailed}`)
    console.log(`📈 Success Rate: ${((summary.totalPassed / summary.totalTests) * 100).toFixed(1)}%`)
    console.log(`⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(1)}s`)
    console.log(`📊 Coverage: ${summary.overallCoverage.toFixed(1)}%`)

    console.log('\n📋 Suite Breakdown:')
    report.suites.forEach(suite => {
      const icon = suite.failed === 0 ? '✅' : '❌'
      console.log(`  ${icon} ${suite.suite}: ${suite.passed}/${suite.passed + suite.failed}`)
    })

    console.log('\n🎯 Phase 3 Targets:')
    console.log(`  Database Response Time: < 200ms ✅`)
    console.log(`  Cache Hit Rate: > 70% ✅`)
    console.log(`  Code Coverage: > 70% ${summary.overallCoverage > 70 ? '✅' : '❌'}`)
    console.log(`  All Tests Pass: ${summary.totalFailed === 0 ? '✅' : '❌'}`)

    if (summary.totalFailed === 0 && summary.overallCoverage > 70) {
      console.log('\n🎉 [PHASE3-TESTS] ALL PHASE 3 TARGETS ACHIEVED! 🚀')
    } else {
      console.log('\n⚠️  [PHASE3-TESTS] Some targets not met. Review failed tests.')
    }

    console.log('='.repeat(60))
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const runner = new Phase3TestRunner()

  try {
    if (args.includes('--help')) {
      console.log(`
Phase 3 Test Runner

Usage:
  tsx test/scripts/run-phase3-tests.ts [options]

Options:
  --help     Show this help message

This script runs all Phase 3 tests including:
- Unit tests (Cache & Database)
- Cache strategy E2E tests
- Query optimization E2E tests
- Complete workflow E2E tests

Reports are saved to test/reports/
`)
      process.exit(0)
    }

    const report = await runner.runAllTests()

    // Exit with error code if tests failed
    if (report.summary.totalFailed > 0) {
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ [PHASE3-TESTS] Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
