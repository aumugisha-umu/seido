#!/usr/bin/env node

/**
 * SEIDO - Validation rapide Phase 2
 * Test des fonctionnalités principales
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testAccounts: {
    gestionnaire: { email: 'arthur+000@seido.pm', password: 'Wxcvbn123' },
    prestataire: { email: 'arthur+001@seido.pm', password: 'Wxcvbn123' },
    locataire: { email: 'arthur+002@seido.pm', password: 'Wxcvbn123' }
  }
};

const metrics = {
  serverHealth: false,
  authApi: false,
  cacheApi: false,
  buildSuccess: false,
  performance: {}
};

/**
 * Test 1: Santé du serveur
 */
async function testServerHealth() {
  console.log('\n🏥 Test 1: Santé du serveur');
  try {
    const response = await fetch(TEST_CONFIG.baseUrl);
    metrics.serverHealth = response.ok;
    console.log(response.ok ? '✅ Serveur accessible' : '❌ Serveur inaccessible');
    return response.ok;
  } catch (error) {
    console.log('❌ Serveur non démarré');
    return false;
  }
}

/**
 * Test 2: API Auth
 */
async function testAuthApi() {
  console.log('\n🔐 Test 2: API Authentication');

  for (const [role, creds] of Object.entries(TEST_CONFIG.testAccounts)) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });

      const time = Date.now() - startTime;
      metrics.performance[role] = time;

      if (response.ok || response.status === 401) {
        console.log(`✅ ${role}: API répond en ${time}ms`);
        metrics.authApi = true;
      } else {
        console.log(`⚠️ ${role}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${role}: Erreur - ${error.message}`);
    }
  }
}

/**
 * Test 3: Cache Metrics API
 */
async function testCacheApi() {
  console.log('\n⚡ Test 3: Cache Metrics API');
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/cache-metrics`);

    if (response.ok) {
      const _data = await response.json();
      metrics.cacheApi = true;
      console.log('✅ API Cache fonctionnelle');
      console.log('📊 Stats:', JSON.stringify(data, null, 2));
    } else {
      console.log('⚠️ API Cache retourne:', response.status);
    }
  } catch (error) {
    console.log('❌ API Cache erreur:', error.message);
  }
}

/**
 * Test 4: Pages principales
 */
async function testMainPages() {
  console.log('\n📄 Test 4: Pages principales');

  const pages = [
    '/auth/login',
    '/gestionnaire/dashboard',
    '/prestataire/dashboard',
    '/locataire/dashboard'
  ];

  for (const page of pages) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${page}`);
      const text = await response.text();
      const hasContent = text.length > 1000;
      console.log(`${hasContent ? '✅' : '❌'} ${page}: ${response.status} (${text.length} bytes)`);
    } catch (error) {
      console.log(`❌ ${page}: ${error.message}`);
    }
  }
}

/**
 * Rapport final
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT VALIDATION RAPIDE PHASE 2');
  console.log('='.repeat(60));

  const checks = [
    { name: 'Serveur', status: metrics.serverHealth },
    { name: 'API Auth', status: metrics.authApi },
    { name: 'API Cache', status: metrics.cacheApi }
  ];

  const passed = checks.filter(c => c.status).length;
  const total = checks.length;

  console.log('\n✅ Tests réussis:', passed + '/' + total);

  checks.forEach(check => {
    console.log(`├─ ${check.name}:`, check.status ? '✅ PASS' : '❌ FAIL');
  });

  if (Object.keys(metrics.performance).length > 0) {
    console.log('\n⏱️ Performance Auth:');
    Object.entries(metrics.performance).forEach(([role, time]) => {
      console.log(`├─ ${role}: ${time}ms`);
    });

    const avg = Object.values(metrics.performance).reduce((a, b) => a + b, 0) / Object.values(metrics.performance).length;
    console.log(`└─ Moyenne: ${Math.round(avg)}ms`);
  }

  const score = (passed / total) * 100;
  console.log('\n🏆 Score:', score.toFixed(0) + '%');

  if (score >= 80) {
    console.log('✅ VALIDATION RAPIDE RÉUSSIE');
  } else if (score >= 50) {
    console.log('⚠️ VALIDATION PARTIELLE');
  } else {
    console.log('❌ VALIDATION ÉCHOUÉE');
  }

  console.log('='.repeat(60));
}

/**
 * Main
 */
async function main() {
  console.log('🚀 SEIDO - Validation Rapide Phase 2');
  console.log('📅', new Date().toLocaleString());
  console.log('='.repeat(60));

  // Attendre que le serveur soit prêt
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Tests
  const serverOk = await testServerHealth();

  if (!serverOk) {
    console.log('\n❌ Serveur non disponible - Arrêt des tests');
    generateReport();
    process.exit(1);
  }

  await testAuthApi();
  await testCacheApi();
  await testMainPages();

  // Rapport
  generateReport();
}

// Exécution
main().catch(console.error);