/**
 * Test rapide de validation des API Routes SEIDO
 */

const BASE_URL = 'http://localhost:3000'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

async function testAPI(endpoint, method = 'GET', body = null) {
  const startTime = Date.now()

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const responseTime = Date.now() - startTime

    let data = null
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    }

    return {
      endpoint,
      status: response.status,
      success: response.ok,
      responseTime,
      data
    }
  } catch (error) {
    return {
      endpoint,
      status: 0,
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message
    }
  }
}

async function runTests() {
  console.log(`${colors.cyan}🔧 SEIDO API Validation Tests${colors.reset}`)
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)

  const tests = [
    // Test Auth API
    {
      name: 'Auth Login',
      endpoint: '/api/auth/login',
      method: 'POST',
      body: {
        email: 'admin@seido.fr',
        password: 'Admin123!'
      }
    },

    // Test Session API
    {
      name: 'Get Session',
      endpoint: '/api/auth/session',
      method: 'GET'
    },

    // Test Cache Metrics
    {
      name: 'Cache Metrics',
      endpoint: '/api/cache-metrics',
      method: 'GET'
    },

    // Test Activity Stats
    {
      name: 'Activity Stats',
      endpoint: '/api/activity-stats',
      method: 'GET'
    }
  ]

  const results = []
  let passedTests = 0
  let totalResponseTime = 0

  for (const test of tests) {
    console.log(`${colors.blue}Testing:${colors.reset} ${test.name}...`)

    const result = await testAPI(test.endpoint, test.method, test.body)
    results.push(result)
    totalResponseTime += result.responseTime

    if (result.success || (result.status >= 200 && result.status < 400)) {
      passedTests++
      console.log(`  ${colors.green}✅ PASS${colors.reset} - Status: ${result.status} - Time: ${result.responseTime}ms`)
    } else {
      console.log(`  ${colors.red}❌ FAIL${colors.reset} - Status: ${result.status} - ${result.error || 'Request failed'}`)
    }

    // Log response data for debugging
    if (result.data && process.env.DEBUG) {
      console.log(`  Response:`, JSON.stringify(result.data).substring(0, 100) + '...')
    }

    console.log()
  }

  // Summary
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.cyan}📊 Test Summary${colors.reset}`)
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)

  console.log(`Tests Run: ${tests.length}`)
  console.log(`Tests Passed: ${colors.green}${passedTests}${colors.reset}`)
  console.log(`Tests Failed: ${colors.red}${tests.length - passedTests}${colors.reset}`)
  console.log(`Average Response Time: ${colors.yellow}${Math.round(totalResponseTime / tests.length)}ms${colors.reset}`)

  // Performance Analysis
  console.log(`\n${colors.cyan}⚡ Performance Analysis${colors.reset}`)
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)

  const avgTime = totalResponseTime / tests.length
  if (avgTime < 100) {
    console.log(`${colors.green}✅ Excellent!${colors.reset} Average response time under 100ms`)
  } else if (avgTime < 200) {
    console.log(`${colors.yellow}⚠️ Good${colors.reset} Average response time under 200ms`)
  } else {
    console.log(`${colors.red}❌ Needs Optimization${colors.reset} Average response time over 200ms`)
  }

  // Check if server is running
  if (results.every(r => r.status === 0)) {
    console.log(`\n${colors.red}⚠️ Server appears to be offline!${colors.reset}`)
    console.log(`Please start the server with: ${colors.cyan}npm run dev${colors.reset}`)
  }

  return {
    passed: passedTests,
    total: tests.length,
    avgResponseTime: Math.round(avgTime)
  }
}

// Run tests
console.log(`${colors.yellow}Starting API validation tests...${colors.reset}\n`)

runTests()
  .then(summary => {
    console.log(`\n${colors.green}✅ Tests completed!${colors.reset}`)
    process.exit(summary.passed === summary.total ? 0 : 1)
  })
  .catch(error => {
    console.error(`${colors.red}❌ Test suite failed:${colors.reset}`, error)
    process.exit(1)
  })