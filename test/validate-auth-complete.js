/**
 * Script de validation complète de l'authentification SEIDO
 * Test avec les vrais comptes Supabase et le mot de passe Wxcvbn123
 */

const TEST_ACCOUNTS = [
  { email: 'arthur@umumentum.com', role: 'gestionnaire', name: 'Arthur (Gestionnaire)' },
  { email: 'arthur+prest@seido.pm', role: 'prestataire', name: 'Arthur (Prestataire)' },
  { email: 'arthur+loc@seido.pm', role: 'locataire', name: 'Arthur (Locataire)' },
  { email: 'arthur+admin@seido.pm', role: 'admin', name: 'Arthur (Admin)' }
];

const PASSWORD = 'Wxcvbn123';
const BASE_URL = 'http://localhost:3001';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'bright');
  console.log('='.repeat(60));
}

function logTest(test, result, details = '') {
  const symbol = result ? '✅' : '❌';
  const color = result ? 'green' : 'red';
  log(`${symbol} ${test}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLogin(email, _password) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const _data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testDashboardAccess(role, cookies) {
  try {
    const cookieHeader = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const response = await fetch(`${BASE_URL}/dashboard/${role}`, {
      headers: {
        'Cookie': cookieHeader
      },
      redirect: 'manual'
    });

    return {
      success: response.status === 200,
      status: response.status,
      redirected: response.status === 302 || response.status === 307,
      location: response.headers.get('location')
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testAPIEndpoint(endpoint, cookies) {
  try {
    const cookieHeader = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Cookie': cookieHeader
      }
    });

    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text();

    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function extractCookies(headers) {
  const cookies = {};
  const setCookieHeaders = headers.raw()['set-cookie'] || [];

  setCookieHeaders.forEach(cookie => {
    const [pair] = cookie.split(';');
    const [key, value] = pair.split('=');
    if (key && value) {
      cookies[key.trim()] = value.trim();
    }
  });

  return cookies;
}

async function runCompleteValidation() {
  console.clear();
  log(`
╔══════════════════════════════════════════════════════════╗
║     VALIDATION COMPLÈTE AUTHENTIFICATION SEIDO           ║
║     Mot de passe: Wxcvbn123                             ║
╚══════════════════════════════════════════════════════════╝
`, 'cyan');

  let allTestsPassed = true;
  const results = {
    authentication: [],
    dashboard: [],
    api: [],
    errors: []
  };

  // Test 1: Authentification pour chaque compte
  logSection('1. TEST D\'AUTHENTIFICATION');

  for (const account of TEST_ACCOUNTS) {
    log(`\nTest: ${account.name}`, 'yellow');

    const loginResult = await testLogin(account.email, PASSWORD);

    if (loginResult.success) {
      logTest(`Login ${account.email}`, true,
        `Status: ${loginResult.status} | User ID: ${loginResult.data.user?.id}`);

      // Vérification des données retournées
      const hasUser = !!loginResult.data.user;
      const hasRole = loginResult.data.user?.role === account.role;
      const hasSession = !!loginResult.data.session;

      logTest('  → User data', hasUser, `ID: ${loginResult.data.user?.id || 'N/A'}`);
      logTest('  → Role correct', hasRole, `Expected: ${account.role}, Got: ${loginResult.data.user?.role}`);
      logTest('  → Session créée', hasSession);

      results.authentication.push({
        account: account.email,
        success: true,
        userId: loginResult.data.user?.id,
        role: loginResult.data.user?.role
      });

    } else {
      logTest(`Login ${account.email}`, false,
        `Error: ${loginResult.error || loginResult.data?.message}`);
      allTestsPassed = false;
      results.errors.push({
        test: 'Authentication',
        account: account.email,
        error: loginResult.error || loginResult.data?.message
      });
    }

    await delay(500); // Petit délai entre les tests
  }

  // Test 2: Test d'accès au dashboard avec un compte
  logSection('2. TEST D\'ACCÈS AUX DASHBOARDS');

  log('\nTest avec le compte gestionnaire...', 'yellow');
  const testLoginResult = await testLogin('arthur@umumentum.com', PASSWORD);

  if (testLoginResult.success && testLoginResult.data.session) {
    // Simuler les cookies de session
    const cookies = {
      'sb-access-token': testLoginResult.data.session.access_token,
      'sb-refresh-token': testLoginResult.data.session.refresh_token
    };

    // Test accès dashboard gestionnaire
    const dashboardResult = await testDashboardAccess('gestionnaire', cookies);
    logTest('Accès dashboard gestionnaire', dashboardResult.success,
      `Status: ${dashboardResult.status}`);

    // Test accès dashboard non autorisé
    const wrongDashboardResult = await testDashboardAccess('admin', cookies);
    logTest('Blocage dashboard admin (non autorisé)', !wrongDashboardResult.success && dashboardResult.redirected,
      `Status: ${wrongDashboardResult.status} - Devrait être redirigé`);

    results.dashboard.push({
      role: 'gestionnaire',
      authorizedAccess: dashboardResult.success,
      unauthorizedBlocked: !wrongDashboardResult.success
    });
  }

  // Test 3: Test des endpoints API
  logSection('3. TEST DES ENDPOINTS API');

  if (testLoginResult.success && testLoginResult.data.session) {
    const cookies = {
      'sb-access-token': testLoginResult.data.session.access_token,
      'sb-refresh-token': testLoginResult.data.session.refresh_token
    };

    const apiEndpoints = [
      '/api/auth/session',
      '/api/auth/user'
    ];

    for (const endpoint of apiEndpoints) {
      const apiResult = await testAPIEndpoint(endpoint, cookies);
      logTest(`API ${endpoint}`, apiResult.success,
        `Status: ${apiResult.status}`);

      if (apiResult.success && apiResult.data) {
        console.log(`   Data: ${JSON.stringify(apiResult.data).substring(0, 100)}...`);
      }

      results.api.push({
        endpoint,
        success: apiResult.success,
        status: apiResult.status
      });
    }
  }

  // Test 4: Vérification des erreurs communes
  logSection('4. VÉRIFICATION DES ERREURS COMMUNES');

  const commonErrors = [
    { pattern: 'authCacheManager', description: 'Erreur authCacheManager' },
    { pattern: 'user-gestionnaire-1', description: 'UUID mock invalide' },
    { pattern: 'PRODUCTION', description: 'Référence environnement PRODUCTION' },
    { pattern: 'STAGING', description: 'Référence environnement STAGING' },
    { pattern: 'mock', description: 'Référence aux données mock' }
  ];

  log('\nVérification de l\'absence d\'erreurs connues...', 'yellow');

  // Pour une vérification complète, on devrait parser les logs du serveur
  // Ici on va juste marquer comme "à vérifier manuellement"
  commonErrors.forEach(error => {
    log(`⚠️  ${error.description}: À vérifier dans la console du navigateur`, 'yellow');
  });

  // Résumé final
  logSection('RÉSUMÉ DES TESTS');

  const authSuccess = results.authentication.filter(a => a.success).length;
  const authTotal = results.authentication.length;

  log(`\n📊 Statistiques:`, 'bright');
  log(`   • Authentifications réussies: ${authSuccess}/${authTotal}`, authSuccess === authTotal ? 'green' : 'red');
  log(`   • Tests dashboard: ${results.dashboard.length} effectués`, 'blue');
  log(`   • Tests API: ${results.api.filter(a => a.success).length}/${results.api.length} réussis`, 'blue');

  if (results.errors.length > 0) {
    log(`\n❌ Erreurs détectées:`, 'red');
    results.errors.forEach(err => {
      log(`   • ${err.test} - ${err.account}: ${err.error}`, 'red');
    });
  }

  log('\n' + '='.repeat(60), 'cyan');
  if (allTestsPassed && results.errors.length === 0) {
    log('✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !', 'green');
  } else {
    log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFIER LES ERREURS', 'yellow');
  }
  log('='.repeat(60) + '\n', 'cyan');

  // Instructions finales
  log('📝 PROCHAINES ÉTAPES:', 'magenta');
  log('   1. Vérifier la console du navigateur pour les erreurs JavaScript', 'reset');
  log('   2. Tester la navigation dans chaque dashboard', 'reset');
  log('   3. Vérifier le chargement des données réelles', 'reset');
  log('   4. Confirmer l\'absence de références aux mocks', 'reset');

  return results;
}

// Attendre que le serveur soit prêt
async function waitForServer() {
  log('⏳ Attente du serveur de développement...', 'yellow');

  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok || response.status === 307) {
        log('✅ Serveur prêt!', 'green');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await delay(1000);
  }

  log('❌ Timeout: Le serveur n\'a pas démarré', 'red');
  return false;
}

// Exécution principale
async function main() {
  const serverReady = await waitForServer();

  if (!serverReady) {
    log('❌ Impossible de lancer les tests - serveur non disponible', 'red');
    process.exit(1);
  }

  await delay(2000); // Attendre que tout soit bien initialisé

  const results = await runCompleteValidation();

  // Sauvegarder les résultats
  const fs = require('fs');
  const reportPath = 'test/reports/auth-validation-' + new Date().toISOString().replace(/:/g, '-') + '.json';

  fs.mkdirSync('test/reports', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`\n📄 Rapport sauvegardé: ${reportPath}`, 'cyan');
}

main().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});