/**
 * Global Setup for Playwright E2E Tests
 * Initializes test environment before running test suites
 *
 * This setup ensures:
 * 1. Port 3000 is freed from any existing processes
 * 2. Next.js cache is cleaned
 * 3. Fresh dev server starts on port 3000
 * 4. Server is ready before tests begin
 */

import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { execSync, spawn, ChildProcess } from 'child_process'

// Global variable to store dev server process
let devServerProcess: ChildProcess | null = null

/**
 * Kill process using a specific port (Windows-compatible)
 */
function killPort(port: number): void {
  console.log(`🔪 Killing any process on port ${port}...`)

  try {
    // Windows: Find PID using netstat
    const netstatOutput = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    })

    // Extract PIDs from netstat output
    const lines = netstatOutput.split('\n').filter(line => line.trim())
    const pids = new Set<string>()

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && pid !== '0') {
        pids.add(pid)
      }
    }

    // Kill each PID
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' })
        console.log(`✅ Killed process ${pid} on port ${port}`)
      } catch (err) {
        // Process might already be dead
      }
    }

    if (pids.size === 0) {
      console.log(`✅ Port ${port} is already free`)
    }
  } catch (error) {
    // No process found on port - this is good
    console.log(`✅ Port ${port} is already free`)
  }
}

/**
 * Clean Next.js cache
 */
function cleanNextCache(): void {
  console.log('🧹 Cleaning Next.js cache...')

  const projectRoot = path.resolve(__dirname, '../../../..')
  const nextDir = path.join(projectRoot, '.next')

  try {
    if (fs.existsSync(nextDir)) {
      fs.rmSync(nextDir, { recursive: true, force: true })
      console.log('✅ .next directory removed')
    } else {
      console.log('✅ .next directory does not exist (already clean)')
    }
  } catch (error) {
    console.warn('⚠️  Could not remove .next directory:', error)
  }
}

/**
 * Start dev server on port 3000
 */
async function startDevServer(): Promise<void> {
  console.log('🚀 Starting fresh dev server on port 3000...')

  const projectRoot = path.resolve(__dirname, '../../../..')

  return new Promise((resolve, reject) => {
    // Spawn dev server process
    devServerProcess = spawn('npm', ['run', 'dev'], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: {
        ...process.env,
        PORT: '3000',
        NODE_ENV: 'development'
      }
    })

    let output = ''
    let serverReady = false

    // Monitor stdout
    devServerProcess.stdout?.on('data', (data) => {
      const text = data.toString()
      output += text

      // Check if server is ready
      if (text.includes('Ready in') || text.includes('Local:') || text.includes('http://localhost:3000')) {
        if (!serverReady) {
          serverReady = true
          console.log('✅ Dev server started successfully')
          resolve()
        }
      }
    })

    // Monitor stderr
    devServerProcess.stderr?.on('data', (data) => {
      const text = data.toString()
      output += text

      // Still check for ready state (Next.js sometimes uses stderr)
      if (text.includes('Ready in') || text.includes('Local:') || text.includes('http://localhost:3000')) {
        if (!serverReady) {
          serverReady = true
          console.log('✅ Dev server started successfully')
          resolve()
        }
      }
    })

    // Handle process exit
    devServerProcess.on('exit', (code) => {
      if (!serverReady) {
        reject(new Error(`Dev server exited with code ${code}`))
      }
    })

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!serverReady) {
        console.log('📋 Server output:', output)
        reject(new Error('Dev server did not start within 60 seconds'))
      }
    }, 60000)
  })
}

/**
 * Wait for server to be fully responsive
 */
async function waitForServer(baseURL: string, maxAttempts = 30): Promise<void> {
  console.log(`⏳ Waiting for server to be fully responsive at ${baseURL}...`)

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const browser = await chromium.launch()
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto(baseURL, { timeout: 5000, waitUntil: 'domcontentloaded' })

      await browser.close()
      console.log('✅ Server is fully responsive')
      return
    } catch (error) {
      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  throw new Error(`Server at ${baseURL} did not become responsive after ${maxAttempts} attempts`)
}

async function globalSetup(config: FullConfig) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 Starting SEIDO E2E Test Suite - Global Setup')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Step 1: Kill any process on port 3000
  killPort(3000)

  // Step 2: Clean Next.js cache
  cleanNextCache()

  // Step 3: Create necessary directories
  const dirs = [
    path.resolve(__dirname, '../screenshots'),
    path.resolve(__dirname, '../screenshots/auth'),
    path.resolve(__dirname, '../screenshots/workflows'),
    path.resolve(__dirname, '../screenshots/errors'),
    path.resolve(__dirname, '../logs'),
    path.resolve(__dirname, '../logs/structured'),
    path.resolve(__dirname, '../logs/performance'),
    path.resolve(__dirname, '../logs/test-runs'),
    path.resolve(__dirname, '../logs/debugger-analysis'),
    path.resolve(__dirname, '../reports'),
    path.resolve(__dirname, '../reports/html'),
    path.resolve(__dirname, '../reports/json'),
    path.resolve(__dirname, '../reports/debugger')
  ]

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // Step 4: Start fresh dev server
  await startDevServer()

  // Step 5: Wait for server to be responsive
  const baseURL = 'http://localhost:3000'
  await waitForServer(baseURL)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Global setup complete - Ready to run tests')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

// Store process reference globally for teardown
export { devServerProcess }

export default globalSetup