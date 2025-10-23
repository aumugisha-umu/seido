#!/usr/bin/env node

/**
 * SEIDO Phase 2 - Benchmark Final
 * Mesure des performances réelles après optimisation
 */

const TESTS = {
  endpoints: [
    { path: '/api/auth/login', method: 'POST', body: { email: 'test@test.com', password: 'test' } },
    { path: '/api/auth/session', method: 'GET' },
    { path: '/api/cache-metrics', method: 'GET' },
    { path: '/api/dashboard/stats', method: 'GET' }
  ],
  pages: [
    '/',
    '/auth/login',
    '/gestionnaire/dashboard',
    '/prestataire/dashboard',
    '/locataire/dashboard'
  ]
};

async function measureEndpoint(baseUrl, endpoint) {
  const start = Date.now();
  try {
    const options = {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    const response = await fetch(`${baseUrl}${endpoint.path}`, options);
    const time = Date.now() - start;

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: response.status,
      time: time,
      success: response.ok || response.status < 500
    };
  } catch (error) {
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: 0,
      time: Date.now() - start,
      success: false,
      error: error.message
    };
  }
}

async function measurePage(baseUrl, page) {
  const start = Date.now();
  try {
    const response = await fetch(`${baseUrl}${page}`);
    const time = Date.now() - start;
    const text = await response.text();

    return {
      page: page,
      status: response.status,
      time: time,
      size: text.length,
      success: response.ok
    };
  } catch (error) {
    return {
      page: page,
      status: 0,
      time: Date.now() - start,
      size: 0,
      success: false,
      error: error.message
    };
  }
}

async function runBenchmark() {
  const baseUrl = 'http://localhost:3001';
  console.log('🚀 SEIDO Phase 2 - Performance Benchmark');
  console.log('📅', new Date().toLocaleString());
  console.log('🔗 Server:', baseUrl);
  console.log('='.repeat(60));

  // Test API Endpoints
  console.log('\n📡 API ENDPOINTS PERFORMANCE');
  console.log('─'.repeat(60));

  const apiResults = [];
  for (const endpoint of TESTS.endpoints) {
    const result = await measureEndpoint(baseUrl, endpoint);
    apiResults.push(result);

    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${endpoint.method} ${endpoint.path}`);
    console.log(`   Status: ${result.status} | Time: ${result.time}ms`);
  }

  // Test Pages
  console.log('\n📄 PAGES PERFORMANCE');
  console.log('─'.repeat(60));

  const pageResults = [];
  for (const page of TESTS.pages) {
    const result = await measurePage(baseUrl, page);
    pageResults.push(result);

    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${page}`);
    console.log(`   Status: ${result.status} | Time: ${result.time}ms | Size: ${(result.size/1024).toFixed(1)}KB`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY STATISTICS');
  console.log('─'.repeat(60));

  // API Stats
  const apiTimes = apiResults.map(r => r.time);
  const apiAvg = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
  const apiMin = Math.min(...apiTimes);
  const apiMax = Math.max(...apiTimes);

  console.log('\n🔌 API Performance:');
  console.log(`   Average: ${apiAvg.toFixed(0)}ms`);
  console.log(`   Min: ${apiMin}ms`);
  console.log(`   Max: ${apiMax}ms`);
  console.log(`   Success Rate: ${(apiResults.filter(r => r.success).length / apiResults.length * 100).toFixed(0)}%`);

  // Page Stats
  const pageTimes = pageResults.map(r => r.time);
  const pageAvg = pageTimes.reduce((a, b) => a + b, 0) / pageTimes.length;
  const pageMin = Math.min(...pageTimes);
  const pageMax = Math.max(...pageTimes);

  console.log('\n📑 Page Load Performance:');
  console.log(`   Average: ${pageAvg.toFixed(0)}ms`);
  console.log(`   Min: ${pageMin}ms`);
  console.log(`   Max: ${pageMax}ms`);
  console.log(`   Success Rate: ${(pageResults.filter(r => r.success).length / pageResults.length * 100).toFixed(0)}%`);

  // Performance Grade
  console.log('\n' + '='.repeat(60));
  console.log('🏆 PERFORMANCE GRADE');
  console.log('─'.repeat(60));

  const grades = {
    'A+': apiAvg < 50 && pageAvg < 100,
    'A': apiAvg < 100 && pageAvg < 200,
    'B': apiAvg < 200 && pageAvg < 500,
    'C': apiAvg < 500 && pageAvg < 1000,
    'D': apiAvg < 1000 && pageAvg < 2000,
    'F': true
  };

  const grade = Object.entries(grades).find(([_, condition]) => condition)[0];

  console.log(`\n   Overall Grade: ${grade}`);
  console.log(`   API Speed: ${apiAvg < 100 ? '⚡ EXCELLENT' : apiAvg < 200 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);
  console.log(`   Page Load: ${pageAvg < 200 ? '⚡ EXCELLENT' : pageAvg < 500 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);

  // Phase 2 Targets
  console.log('\n📌 PHASE 2 TARGETS:');
  console.log(`   Auth < 3s: ${apiResults.find(r => r.endpoint.includes('login'))?.time < 3000 ? '✅ ACHIEVED' : '❌ MISSED'}`);
  console.log(`   API < 200ms: ${apiAvg < 200 ? '✅ ACHIEVED' : '❌ MISSED'}`);
  console.log(`   Pages < 500ms: ${pageAvg < 500 ? '✅ ACHIEVED' : '❌ MISSED'}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Benchmark Complete!');
}

// Run
runBenchmark().catch(console.error);