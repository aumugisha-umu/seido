/**
 * Global Setup for Playwright E2E Tests
 * Initializes test environment before running test suites
 */

import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting SEIDO E2E Test Suite - Global Setup')

  // Create necessary directories
  const dirs = [
    path.resolve(__dirname, '../screenshots'),
    path.resolve(__dirname, '../screenshots/auth'),
    path.resolve(__dirname, '../screenshots/workflows'),
    path.resolve(__dirname, '../screenshots/errors'),
    path.resolve(__dirname, '../logs'),
    path.resolve(__dirname, '../logs/structured'),
    path.resolve(__dirname, '../logs/performance'),
    path.resolve(__dirname, '../logs/test-runs'),
    path.resolve(__dirname, '../reports'),
    path.resolve(__dirname, '../reports/html'),
    path.resolve(__dirname, '../reports/json'),
    path.resolve(__dirname, '../reports/debugger')
  ]

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`✅ Created directory: ${dir}`)
    }
  }

  // Check if dev server is running
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
  console.log(`🔍 Checking dev server at ${baseURL}...`)

  try {
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(baseURL, { timeout: 30000 })
    console.log('✅ Dev server is running')

    await browser.close()
  } catch (error) {
    console.error('❌ Dev server is not accessible:', error)
    console.error('Please ensure the dev server is running with: npm run dev')
    throw new Error('Dev server not accessible')
  }

  console.log('✅ Global setup complete')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

export default globalSetup