#!/usr/bin/env node

/**
 * SEIDO - Validation complète Phase 2
 * Test exhaustif de l'architecture SSR, performance et fonctionnalités
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration des tests
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  testAccounts: {
    gestionnaire: { email: 'arthur+000@seido.pm', password: 'Wxcvbn123' },
    prestataire: { email: 'arthur+001@seido.pm', password: 'Wxcvbn123' },
    locataire: { email: 'arthur+002@seido.pm', password: 'Wxcvbn123' },
    admin: { email: 'arthur+003@seido.pm', password: 'Wxcvbn123' }
  }
};

// Métriques de validation
const metrics = {
  buildSuccess: false,
  buildTime: 0,
  bundleSize: 0,
  authPerformance: [],
  serverComponents: { total: 0, client: 0, ratio: 0 },
  apiValidation: [],
  workflowTests: [],
  cachePerformance: null,
  errors: []
};

/**
 * Phase 1: Test de compilation
 */
async function testBuildCompilation() {
  console.log('\n📦 Phase 1: Test de Compilation');
  console.log('═'.repeat(50));

  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync('npm run build');
    const buildTime = Date.now() - startTime;

    metrics.buildSuccess = true;
    metrics.buildTime = buildTime;

    // Extraction taille du bundle
    const bundleMatch = stdout.match(/First Load JS shared by all\s+(\S+)/);
    if (bundleMatch) {
      metrics.bundleSize = bundleMatch[1];
    }

    console.log('✅ Build réussi en', Math.round(buildTime / 1000), 'secondes');
    console.log('📊 Taille bundle:', metrics.bundleSize);

    // Analyser les composants Server vs Client
    const serverCount = (stdout.match(/○\s+\(Static\)/g) || []).length;
    const dynamicCount = (stdout.match(/ƒ\s+\(Dynamic\)/g) || []).length;
    metrics.serverComponents = {
      total: serverCount + dynamicCount,
      client: dynamicCount,
      ratio: ((dynamicCount / (serverCount + dynamicCount)) * 100).toFixed(1) + '%'
    };

    console.log('📈 Composants Server:', serverCount);
    console.log('📈 Composants Dynamic:', dynamicCount);
    console.log('📈 Ratio Client Components:', metrics.serverComponents.ratio);

  } catch (error) {
    console.error('❌ Échec du build:', error.message);
    metrics.errors.push({ phase: 'build', error: error.message });
    return false;
  }

  return true;
}

/**
 * Phase 2: Test des performances d'authentification
 */
async function testAuthPerformance() {
  console.log('\n🔐 Phase 2: Test Performance Authentification');
  console.log('═'.repeat(50));

  const browser = await chromium.launch({ headless: true });

  try {
    for (const [role, credentials] of Object.entries(TEST_CONFIG.testAccounts)) {
      const context = await browser.newContext();
      const page = await context.newPage();

      const startTime = Date.now();

      // Navigation vers login
      await page.goto(`${TEST_CONFIG.baseUrl}/auth/login`);

      // Remplir le formulaire
      await page.fill('input[name="email"]', credentials.email);
      await page.fill('input[name="password"]', credentials.password);

      // Soumettre et attendre la redirection
      await Promise.all([
        page.waitForNavigation({ url: new RegExp(`/${role}/`) }),
        page.click('button[type="submit"]')
      ]);

      const loginTime = Date.now() - startTime;

      metrics.authPerformance.push({
        role,
        time: loginTime,
        success: true
      });

      console.log(`✅ ${role}: ${loginTime}ms`);

      await context.close();
    }

    const avgTime = metrics.authPerformance.reduce((sum, m) => sum + m.time, 0) / metrics.authPerformance.length;
    console.log(`📊 Temps moyen authentification: ${Math.round(avgTime)}ms`);

  } catch (error) {
    console.error('❌ Erreur test auth:', error.message);
    metrics.errors.push({ phase: 'auth', error: error.message });
  } finally {
    await browser.close();
  }
}

/**
 * Phase 3: Test des workflows métier
 */
async function testBusinessWorkflows() {
  console.log('\n🔄 Phase 3: Test Workflows Métier');
  console.log('═'.repeat(50));

  const browser = await chromium.launch({ headless: true });

  try {
    // Test 1: Workflow création intervention (Locataire)
    console.log('\n📝 Test: Création intervention par locataire');
    const locataireContext = await browser.newContext();
    const locatairePage = await locataireContext.newPage();

    await locatairePage.goto(`${TEST_CONFIG.baseUrl}/auth/login`);
    await locatairePage.fill('input[name="email"]', TEST_CONFIG.testAccounts.locataire.email);
    await locatairePage.fill('input[name="password"]', TEST_CONFIG.testAccounts.locataire.password);
    await locatairePage.click('button[type="submit"]');
    await locatairePage.waitForURL('**/locataire/dashboard');

    // Navigation vers création intervention
    await locatairePage.goto(`${TEST_CONFIG.baseUrl}/locataire/interventions/nouvelle-demande`);
    const formExists = await locatairePage.isVisible('form');

    metrics.workflowTests.push({
      name: 'Création intervention',
      role: 'locataire',
      success: formExists
    });

    console.log(formExists ? '✅ Formulaire accessible' : '❌ Formulaire non trouvé');

    // Test 2: Dashboard Gestionnaire
    console.log('\n📊 Test: Dashboard Gestionnaire');
    const gestionnaireContext = await browser.newContext();
    const gestionnairePage = await gestionnaireContext.newPage();

    await gestionnairePage.goto(`${TEST_CONFIG.baseUrl}/auth/login`);
    await gestionnairePage.fill('input[name="email"]', TEST_CONFIG.testAccounts.gestionnaire.email);
    await gestionnairePage.fill('input[name="password"]', TEST_CONFIG.testAccounts.gestionnaire.password);
    await gestionnairePage.click('button[type="submit"]');
    await gestionnairePage.waitForURL('**/gestionnaire/dashboard');

    // Vérifier les éléments du dashboard
    const statsExist = await gestionnairePage.isVisible('[data-testid="stats-card"]');
    const interventionsExist = await gestionnairePage.isVisible('text=/interventions?/i');

    metrics.workflowTests.push({
      name: 'Dashboard gestionnaire',
      role: 'gestionnaire',
      success: statsExist || interventionsExist
    });

    console.log(statsExist || interventionsExist ? '✅ Dashboard chargé' : '❌ Dashboard incomplet');

    // Test 3: Dashboard Prestataire
    console.log('\n🔧 Test: Dashboard Prestataire');
    const prestataireContext = await browser.newContext();
    const prestatairePage = await prestataireContext.newPage();

    await prestatairePage.goto(`${TEST_CONFIG.baseUrl}/auth/login`);
    await prestatairePage.fill('input[name="email"]', TEST_CONFIG.testAccounts.prestataire.email);
    await prestatairePage.fill('input[name="password"]', TEST_CONFIG.testAccounts.prestataire.password);
    await prestatairePage.click('button[type="submit"]');
    await prestatairePage.waitForURL('**/prestataire/dashboard');

    const dashboardLoaded = await prestatairePage.isVisible('main');

    metrics.workflowTests.push({
      name: 'Dashboard prestataire',
      role: 'prestataire',
      success: dashboardLoaded
    });

    console.log(dashboardLoaded ? '✅ Dashboard accessible' : '❌ Dashboard non chargé');

    await locataireContext.close();
    await gestionnaireContext.close();
    await prestataireContext.close();

  } catch (error) {
    console.error('❌ Erreur test workflows:', error.message);
    metrics.errors.push({ phase: 'workflows', error: error.message });
  } finally {
    await browser.close();
  }
}

/**
 * Phase 4: Test du cache et des métriques
 */
async function testCachePerformance() {
  console.log('\n⚡ Phase 4: Test Cache & Performance');
  console.log('═'.repeat(50));

  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/cache-metrics`);

    if (response.ok) {
      const cacheData = await response.json();
      metrics.cachePerformance = cacheData;

      console.log('📊 Cache Stats:');
      console.log('  - Hit Rate:', cacheData.hitRate || 'N/A');
      console.log('  - Total Hits:', cacheData.hits || 0);
      console.log('  - Total Misses:', cacheData.misses || 0);
      console.log('✅ API cache-metrics fonctionnelle');
    } else {
      console.log('⚠️  API cache-metrics non disponible');
    }
  } catch (error) {
    console.log('⚠️  Impossible de récupérer les métriques cache');
  }
}

/**
 * Phase 5: Test validation API avec Zod
 */
async function testApiValidation() {
  console.log('\n🔒 Phase 5: Test Validation API (Zod)');
  console.log('═'.repeat(50));

  const testEndpoints = [
    {
      path: '/api/auth/login',
      method: 'POST',
      validPayload: { email: 'test@example.com', password: 'Test123!' },
      invalidPayload: { email: 'invalid', password: '' }
    },
    {
      path: '/api/create-intervention',
      method: 'POST',
      validPayload: {
        title: 'Test',
        description: 'Test description',
        urgency: 'low'
      },
      invalidPayload: { title: '' }
    }
  ];

  for (const endpoint of testEndpoints) {
    console.log(`\n📌 Testing ${endpoint.path}`);

    // Test avec payload invalide (devrait être rejeté)
    try {
      const invalidResponse = await fetch(`${TEST_CONFIG.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint.invalidPayload)
      });

      const validationWorking = invalidResponse.status === 400 || invalidResponse.status === 422;

      metrics.apiValidation.push({
        endpoint: endpoint.path,
        validation: validationWorking ? 'working' : 'not working',
        status: invalidResponse.status
      });

      console.log(validationWorking
        ? `✅ Validation Zod active (status: ${invalidResponse.status})`
        : `⚠️  Validation faible (status: ${invalidResponse.status})`
      );

    } catch (error) {
      console.log(`⚠️  Endpoint non testable: ${error.message}`);
    }
  }
}

/**
 * Génération du rapport final
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL - VALIDATION PHASE 2 SEIDO');
  console.log('='.repeat(60));

  // Résumé Build
  console.log('\n🏗️  BUILD & COMPILATION');
  console.log('├─ Status:', metrics.buildSuccess ? '✅ SUCCESS' : '❌ FAILED');
  console.log('├─ Temps:', Math.round(metrics.buildTime / 1000) + 's');
  console.log('├─ Bundle Size:', metrics.bundleSize);
  console.log('└─ Client Components:', metrics.serverComponents.ratio);

  // Résumé Auth Performance
  console.log('\n🔐 AUTHENTICATION PERFORMANCE');
  if (metrics.authPerformance.length > 0) {
    const avgTime = metrics.authPerformance.reduce((sum, m) => sum + m.time, 0) / metrics.authPerformance.length;
    console.log('├─ Temps moyen:', Math.round(avgTime) + 'ms');
    console.log('├─ Target (<3s):', avgTime < 3000 ? '✅ ACHIEVED' : '❌ MISSED');
    metrics.authPerformance.forEach(m => {
      console.log(`├─ ${m.role}:`, m.time + 'ms', m.success ? '✅' : '❌');
    });
  }

  // Résumé Workflows
  console.log('\n🔄 BUSINESS WORKFLOWS');
  if (metrics.workflowTests.length > 0) {
    const successRate = (metrics.workflowTests.filter(t => t.success).length / metrics.workflowTests.length) * 100;
    console.log('├─ Success Rate:', successRate.toFixed(0) + '%');
    metrics.workflowTests.forEach(test => {
      console.log(`├─ ${test.name}:`, test.success ? '✅ PASS' : '❌ FAIL');
    });
  }

  // Résumé API Validation
  console.log('\n🔒 API VALIDATION (Zod)');
  if (metrics.apiValidation.length > 0) {
    const workingCount = metrics.apiValidation.filter(v => v.validation === 'working').length;
    console.log('├─ Endpoints avec Zod:', workingCount + '/' + metrics.apiValidation.length);
    metrics.apiValidation.forEach(api => {
      console.log(`├─ ${api.endpoint}:`, api.validation === 'working' ? '✅' : '⚠️');
    });
  }

  // Résumé Cache
  console.log('\n⚡ CACHE PERFORMANCE');
  if (metrics.cachePerformance) {
    console.log('├─ Status: ✅ ACTIVE');
    console.log('├─ Hit Rate:', metrics.cachePerformance.hitRate || 'N/A');
  } else {
    console.log('└─ Status: ⚠️ NOT CONFIGURED');
  }

  // Erreurs
  if (metrics.errors.length > 0) {
    console.log('\n❌ ERRORS DETECTED');
    metrics.errors.forEach(err => {
      console.log(`├─ ${err.phase}:`, err.error);
    });
  }

  // Score global
  console.log('\n' + '='.repeat(60));
  const scores = {
    build: metrics.buildSuccess ? 100 : 0,
    auth: metrics.authPerformance.length > 0 &&
          metrics.authPerformance.every(m => m.time < 3000) ? 100 : 50,
    workflows: metrics.workflowTests.length > 0 ?
              (metrics.workflowTests.filter(t => t.success).length / metrics.workflowTests.length) * 100 : 0,
    api: metrics.apiValidation.length > 0 ?
         (metrics.apiValidation.filter(v => v.validation === 'working').length / metrics.apiValidation.length) * 100 : 0,
    cache: metrics.cachePerformance ? 100 : 50
  };

  const globalScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

  console.log('🎯 SCORES PAR CATÉGORIE');
  console.log('├─ Build:', scores.build.toFixed(0) + '%');
  console.log('├─ Auth Performance:', scores.auth.toFixed(0) + '%');
  console.log('├─ Workflows:', scores.workflows.toFixed(0) + '%');
  console.log('├─ API Validation:', scores.api.toFixed(0) + '%');
  console.log('└─ Cache:', scores.cache.toFixed(0) + '%');

  console.log('\n🏆 SCORE GLOBAL PHASE 2:', globalScore.toFixed(0) + '%');

  if (globalScore >= 80) {
    console.log('✅ PHASE 2 VALIDÉE AVEC SUCCÈS!');
  } else if (globalScore >= 60) {
    console.log('⚠️  PHASE 2 PARTIELLEMENT VALIDÉE');
  } else {
    console.log('❌ PHASE 2 NÉCESSITE DES CORRECTIONS');
  }

  console.log('='.repeat(60));

  // Sauvegarder le rapport
  return metrics;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 SEIDO - Validation Phase 2 Complete');
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('='.repeat(60));

  // Phase 1: Build
  const buildSuccess = await testBuildCompilation();

  if (!buildSuccess) {
    console.error('\n❌ Build échoué - Arrêt des tests');
    generateReport();
    process.exit(1);
  }

  // Démarrer le serveur de développement
  console.log('\n🚀 Démarrage du serveur de test...');
  const serverProcess = exec('npm run dev', { env: { ...process.env, PORT: '3000' } });

  // Attendre que le serveur soit prêt
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    // Phase 2: Auth Performance
    await testAuthPerformance();

    // Phase 3: Business Workflows
    await testBusinessWorkflows();

    // Phase 4: Cache Performance
    await testCachePerformance();

    // Phase 5: API Validation
    await testApiValidation();

  } finally {
    // Arrêter le serveur
    if (serverProcess && serverProcess.pid) {
      process.kill(serverProcess.pid, 'SIGTERM');
    }
  }

  // Générer le rapport final
  const finalMetrics = generateReport();

  // Sauvegarder le rapport JSON
  const reportPath = path.join(__dirname, 'reports', 'phase2-validation-' + Date.now() + '.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(finalMetrics, null, 2));
  console.log('\n📄 Rapport sauvegardé:', reportPath);
}

// Exécution
main().catch(console.error);