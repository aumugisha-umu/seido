/**
 * Global Teardown for Playwright E2E Tests
 * Cleanup and final reporting after all tests complete
 */

import { FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

async function globalTeardown(config: FullConfig) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏁 SEIDO E2E Test Suite - Global Teardown')

  // Generate test run summary
  const reportsDir = path.resolve(__dirname, '../reports')
  const summaryPath = path.join(reportsDir, 'test-run-summary.json')

  const summary = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    baseURL: config.projects[0].use.baseURL || 'http://localhost:3000',
    totalProjects: config.projects.length,
    testDir: config.testDir,
    completed: true
  }

  try {
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
    console.log(`✅ Test run summary saved: ${summaryPath}`)
  } catch (error) {
    console.error('❌ Failed to save test run summary:', error)
  }

  // List generated artifacts
  console.log('\n📊 Generated Artifacts:')
  const artifactDirs = [
    path.resolve(__dirname, '../screenshots'),
    path.resolve(__dirname, '../logs'),
    path.resolve(__dirname, '../reports')
  ]

  for (const dir of artifactDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true }) as string[]
      const count = files.filter(f => {
        const fullPath = path.join(dir, f)
        return fs.statSync(fullPath).isFile()
      }).length
      console.log(`  • ${path.basename(dir)}: ${count} files`)
    }
  }

  console.log('\n✅ Global teardown complete')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

export default globalTeardown