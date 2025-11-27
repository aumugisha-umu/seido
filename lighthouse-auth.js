/**
 * Script Puppeteer pour authentification Lighthouse CI
 * Permet de tester les pages nécessitant une connexion
 */
module.exports = async (browser, { url }) => {
  // Ouvrir une nouvelle page
  const page = await browser.newPage();

  // Augmenter le viewport pour éviter les problèmes responsive
  await page.setViewport({ width: 1280, height: 720 });

  console.log('[Lighthouse Auth] Navigating to login page...');

  // Aller à la page de connexion et attendre le chargement complet
  await page.goto('http://localhost:3000/auth/login', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Attendre un peu pour que React hydrate le composant
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('[Lighthouse Auth] Waiting for email input...');

  // Attendre que le formulaire soit chargé (sélecteur plus spécifique)
  await page.waitForSelector('#email', { timeout: 20000 });

  console.log('[Lighthouse Auth] Filling login form...');

  // Remplir le formulaire de connexion
  await page.type('#email', 'arthur@seido.pm', { delay: 50 });
  await page.type('#password', 'Wxcvbn123', { delay: 50 });

  console.log('[Lighthouse Auth] Submitting form...');

  // Cliquer sur le bouton de connexion
  await page.click('button[type="submit"]');

  // Attendre la redirection après connexion
  await page.waitForNavigation({
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  console.log('[Lighthouse Auth] Login successful, URL:', page.url());

  // Fermer la page (Lighthouse ouvrira la sienne avec les cookies)
  await page.close();
};
