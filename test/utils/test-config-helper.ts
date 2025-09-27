/**
 * Helper pour utiliser la configuration de test de manière consistante
 */

import { Page, BrowserContext } from '@playwright/test';

// Import de la configuration centralisée
const TEST_CONFIG = {
  PORT: 3000,
  BASE_URL: 'http://localhost:3000',
  TIMEOUTS: {
    SERVER_START: 120000,
    NAVIGATION: 30000,
    ACTION: 15000,
    AUTH: 10000,
    API_RESPONSE: 5000,
  },
  TEST_ACCOUNTS: {
    gestionnaire: {
      email: 'arthur@umumentum.com',
      password: 'Wxcvbn123',
      expectedRedirect: '/gestionnaire/dashboard'
    },
    prestataire: {
      email: 'arthur+prest@seido.pm',
      password: 'Wxcvbn123',
      expectedRedirect: '/prestataire/dashboard'
    },
    locataire: {
      email: 'arthur+loc@seido.pm',
      password: 'Wxcvbn123',
      expectedRedirect: '/locataire/dashboard'
    },
    admin: {
      email: 'arthur+admin@seido.pm',
      password: 'Wxcvbn123',
      expectedRedirect: '/admin/dashboard'
    }
  }
};

export const getTestConfig = () => TEST_CONFIG;

/**
 * Obtenir l'URL complète pour un chemin donné
 */
export function getTestUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${TEST_CONFIG.BASE_URL}${cleanPath}`;
}

/**
 * Obtenir les credentials de test pour un rôle
 */
export function getTestAccount(role: 'gestionnaire' | 'prestataire' | 'locataire' | 'admin') {
  return TEST_CONFIG.TEST_ACCOUNTS[role];
}

/**
 * Helper pour la navigation avec timeout approprié
 */
export async function navigateToPage(page: Page, path: string) {
  const url = getTestUrl(path);
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: TEST_CONFIG.TIMEOUTS.NAVIGATION
  });
}

/**
 * Helper pour le login avec un rôle spécifique
 */
export async function loginAsRole(
  page: Page,
  role: 'gestionnaire' | 'prestataire' | 'locataire' | 'admin'
) {
  const account = getTestAccount(role);

  // Aller à la page de login
  await navigateToPage(page, '/auth/login');

  // Remplir le formulaire
  await page.fill('input#email', account.email);
  await page.fill('input#password', account.password);

  // Soumettre
  await page.click('button[type="submit"]');

  // Attendre la redirection
  await page.waitForURL(
    url => url.includes(account.expectedRedirect),
    { timeout: TEST_CONFIG.TIMEOUTS.AUTH }
  );
}

/**
 * Helper pour attendre que l'authentification soit prête
 */
export async function waitForAuthReady(page: Page) {
  try {
    await page.waitForFunction(
      () => (window as any).__AUTH_READY__ === true,
      { timeout: TEST_CONFIG.TIMEOUTS.AUTH }
    );
  } catch {
    // AUTH_READY n'est pas toujours implémenté, continuer sans
    console.log('AUTH_READY flag not detected, continuing...');
  }
}

/**
 * Helper pour vérifier l'URL actuelle
 */
export async function verifyCurrentPath(page: Page, expectedPath: string): Promise<boolean> {
  const currentUrl = page.url();
  const expectedUrl = getTestUrl(expectedPath);
  return currentUrl.includes(expectedPath) || currentUrl === expectedUrl;
}

/**
 * Helper pour créer un contexte avec storage d'authentification
 */
export async function createAuthenticatedContext(
  browser: any,
  role: 'gestionnaire' | 'prestataire' | 'locataire' | 'admin'
): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL: TEST_CONFIG.BASE_URL
  });

  const page = await context.newPage();
  await loginAsRole(page, role);

  // Sauvegarder l'état d'authentification
  await context.storageState({
    path: `test/auth-states/${role}.json`
  });

  await page.close();
  return context;
}

/**
 * Helper pour attendre une réponse API spécifique
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number } = {}
) {
  return page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: options.timeout || TEST_CONFIG.TIMEOUTS.API_RESPONSE }
  );
}

/**
 * Helper pour prendre une capture d'écran avec nom standardisé
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {}
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `test/screenshots/${name}-${timestamp}.png`;

  await page.screenshot({
    path: fileName,
    fullPage: options.fullPage !== false
  });

  return fileName;
}

export default {
  config: TEST_CONFIG,
  getTestUrl,
  getTestAccount,
  navigateToPage,
  loginAsRole,
  waitForAuthReady,
  verifyCurrentPath,
  createAuthenticatedContext,
  waitForApiResponse,
  takeScreenshot
};