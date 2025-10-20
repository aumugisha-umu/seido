const puppeteer = require('puppeteer');

// Configuration des comptes
const TEST_ACCOUNTS = [
  { email: 'admin@seido.pm', password: 'password123', role: 'admin', expectedPath: '/dashboard/admin' },
  { email: 'arthur@umumentum.com', password: 'password123', role: 'gestionnaire', expectedPath: '/dashboard/gestionnaire' },
  { email: 'arthur+prest@seido.pm', password: 'password123', role: 'prestataire', expectedPath: '/dashboard/prestataire' },
  { email: 'arthur+loc@seido.pm', password: 'password123', role: 'locataire', expectedPath: '/dashboard/locataire' }
];

// Fonction pour attendre que l'auth soit prête
async function waitForAuthReady(page) {
  try {
    await page.waitForFunction(
      () => window.__AUTH_READY__ === true,
      { timeout: 5000 }
    );
    return true;
  } catch (error) {
    console.error('❌ Auth not ready après 5s');
    return false;
  }
}

// Fonction pour mesurer le temps d'auth
async function measureAuthTime(page, email, _password) {
  const startTime = Date.now();

  try {
    // Aller à la page de login
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' });

    // Remplir le formulaire
    await page.type('input#email', email);
    await page.type('input#password', _password);

    // Soumettre
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);

    // Attendre que l'auth soit prête
    await waitForAuthReady(page);

    const endTime = Date.now();
    return endTime - startTime;
  } catch (error) {
    console.error('❌ Erreur pendant l\'auth:', error.message);
    return -1;
  }
}

// Fonction principale de test
async function runValidation() {
  console.log('🚀 DÉMARRAGE VALIDATION PHASE 1 - SEIDO AUTH\n');
  console.log('='.repeat(60));

  const browser = await puppeteer.launch({
    headless: false, // Visible pour debug
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    total: TEST_ACCOUNTS.length,
    passed: 0,
    failed: 0,
    avgTime: 0,
    times: []
  };

  try {
    // Tester chaque compte
    for (const account of TEST_ACCOUNTS) {
      console.log(`\n🧪 Test ${account.role.toUpperCase()}`);
      console.log('-'.repeat(40));

      const page = await browser.newPage();

      try {
        // Mesurer le temps d'auth
        const authTime = await measureAuthTime(page, account.email, account._password);

        if (authTime > 0) {
          console.log(`✅ Login réussi: ${authTime}ms`);
          results.times.push(authTime);

          // Vérifier l'URL
          const currentUrl = page.url();
          if (currentUrl.includes(account.expectedPath)) {
            console.log(`✅ Redirection correcte: ${account.expectedPath}`);

            // Vérifier que le dashboard est chargé
            try {
              await page.waitForSelector('h1', { timeout: 3000 });
              console.log('✅ Dashboard chargé');

              // Vérifier la stabilité du DOM
              const elementCount = await page.$$eval('*', elements => elements.length);
              await page.waitForTimeout(1000);
              const elementCountAfter = await page.$$eval('*', elements => elements.length);

              const diff = Math.abs(elementCountAfter - elementCount);
              if (diff < 10) {
                console.log(`✅ DOM stable: ${elementCount} → ${elementCountAfter} éléments`);
                results.passed++;
              } else {
                console.log(`⚠️ DOM instable: différence de ${diff} éléments`);
                results.failed++;
              }
            } catch (error) {
              console.log('❌ Dashboard non chargé:', error.message);
              results.failed++;
            }
          } else {
            console.log(`❌ Mauvaise redirection: ${currentUrl}`);
            results.failed++;
          }
        } else {
          console.log('❌ Login échoué');
          results.failed++;
        }

      } catch (error) {
        console.error('❌ Erreur test:', error.message);
        results.failed++;
      } finally {
        await page.close();
      }
    }

    // Calculer les statistiques
    if (results.times.length > 0) {
      results.avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length;
    }

    // Afficher le rapport final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT FINAL - VALIDATION PHASE 1');
    console.log('='.repeat(60));
    console.log(`\n✅ Tests réussis: ${results.passed}/${results.total}`);
    console.log(`❌ Tests échoués: ${results.failed}/${results.total}`);
    console.log(`⏱️ Temps moyen d'auth: ${results.avgTime.toFixed(0)}ms`);
    console.log(`📈 Temps détaillés: ${results.times.map(t => t + 'ms').join(', ')}`);

    // Vérifier les critères de succès
    console.log('\n🎯 CRITÈRES DE SUCCÈS PHASE 1:');
    console.log('-'.repeat(40));

    const successRate = (results.passed / results.total) * 100;
    console.log(`${successRate >= 95 ? '✅' : '❌'} Taux de succès: ${successRate.toFixed(0)}% (objectif: 95%+)`);
    console.log(`${results.passed === 4 ? '✅' : '❌'} Rôles fonctionnels: ${results.passed}/4 (objectif: 4/4)`);
    console.log(`${results.avgTime < 3000 ? '✅' : '❌'} Time to auth: ${results.avgTime.toFixed(0)}ms (objectif: < 3000ms)`);

    if (successRate >= 95 && results.avgTime < 3000) {
      console.log('\n🎉 PHASE 1 - STABILISATION AUTH: SUCCÈS TOTAL !');
      console.log('✨ Prêt pour PHASE 2 - Optimisation Architecture');
    } else {
      console.log('\n⚠️ Des améliorations sont encore nécessaires');
    }

  } catch (error) {
    console.error('❌ Erreur globale:', error);
  } finally {
    await browser.close();
  }
}

// Lancer la validation
runValidation().catch(console.error);