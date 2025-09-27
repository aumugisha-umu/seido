#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 PHASE 1 - FINAL VALIDATION TESTS');
console.log('=====================================\n');

// Créer le dossier test-results si nécessaire
const resultsDir = path.join(__dirname, '..', 'test-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
  console.log('✅ Created test-results directory\n');
}

// Vérifier que l'application est bien sur le port 3000
console.log('🔍 Checking application on port 3000...');

const checkApp = async () => {
  try {
    const response = await fetch('http://localhost:3000/auth/login');
    if (response.ok || response.status === 200) {
      console.log('✅ Application is running on port 3000\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Application not responding on port 3000');
    console.log('Please ensure the application is running with:');
    console.log('  npm run dev:test or npm run build && npm run start\n');
    return false;
  }
};

const runTests = () => {
  console.log('🧪 Running Playwright tests...\n');

  const testProcess = spawn('npx', [
    'playwright',
    'test',
    'test/e2e/phase1-final-validation.spec.ts',
    '--reporter=list',
    '--timeout=60000',
    '--workers=1'
  ], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
  });

  testProcess.on('close', (code) => {
    console.log('\n' + '='.repeat(50));

    if (code === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('PHASE 1 - AUTHENTICATION STABILIZATION: SUCCESS');

      // Afficher un récapitulatif
      console.log('\n📊 Summary:');
      console.log('  • Middleware Protection: ✅');
      console.log('  • Gestionnaire Login: ✅');
      console.log('  • Prestataire Login: ✅');
      console.log('  • Locataire Login: ✅');
      console.log('  • Performance < 3s: ✅');
      console.log('  • DOM Stability: ✅');

      console.log('\n📸 Screenshots saved in test-results/');
      console.log('📄 Full report: npx playwright show-report\n');
    } else {
      console.log('❌ Some tests failed.');
      console.log('Check the output above for details.');
      console.log('Screenshots saved in test-results/\n');
    }

    console.log('='.repeat(50));
    process.exit(code);
  });

  testProcess.on('error', (error) => {
    console.error('❌ Failed to run tests:', error);
    process.exit(1);
  });
};

// Lancer la vérification puis les tests
(async () => {
  const appRunning = await checkApp();

  if (appRunning) {
    runTests();
  } else {
    process.exit(1);
  }
})();