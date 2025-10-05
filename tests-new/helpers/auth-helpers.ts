/**
 * 🔐 AUTH HELPERS - Helpers pour l'authentification
 *
 * Helpers réutilisables pour les tests d'authentification :
 * - Remplir formulaires
 * - Attendre redirections
 * - Vérifier états d'authentification
 */

import { Page, expect } from '@playwright/test'
import { TEST_CONFIG, TestUser } from '../config/test-config'

/**
 * Remplir le formulaire de signup
 */
export const fillSignupForm = async (
  page: Page,
  user: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
  }
): Promise<void> => {
  console.log('📝 Filling signup form...', { email: user.email })

  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  await page.fill('input[name="confirmPassword"]', user.password) // Confirmer le même password
  await page.fill('input[name="firstName"]', user.firstName)
  await page.fill('input[name="lastName"]', user.lastName)

  if (user.phone) {
    await page.fill('input[name="phone"]', user.phone)
  }

  // Accepter les conditions (cliquer sur le Checkbox shadcn/ui, pas l'input hidden)
  const termsCheckbox = page.locator('button[id="terms"]')
  await termsCheckbox.click()

  // Wait a bit for React state to update
  await page.waitForTimeout(500)

  console.log('✅ Signup form filled')
}

/**
 * Soumettre le formulaire de signup
 */
export const submitSignupForm = async (page: Page): Promise<void> => {
  console.log('🚀 Submitting signup form...')

  const submitButton = page.locator('button[type="submit"]')

  // Wait for button to be enabled (form validation may take time)
  await expect(submitButton).toBeEnabled({ timeout: 10000 })

  await submitButton.click()

  console.log('✅ Signup form submitted')
}

/**
 * Remplir le formulaire de login
 */
export const fillLoginForm = async (
  page: Page,
  credentials: {
    email: string
    password: string
  }
): Promise<void> => {
  console.log('📝 Filling login form...', { email: credentials.email })

  await page.fill('input[name="email"]', credentials.email)
  await page.fill('input[name="password"]', credentials.password)

  console.log('✅ Login form filled')
}

/**
 * Soumettre le formulaire de login
 */
export const submitLoginForm = async (page: Page): Promise<void> => {
  console.log('🚀 Submitting login form...')

  await page.click('button[type="submit"]')

  console.log('✅ Login form submitted')
}

/**
 * Attendre la redirection vers une page
 */
export const waitForRedirect = async (
  page: Page,
  expectedPath: string,
  options: {
    timeout?: number
    exact?: boolean
  } = {}
): Promise<void> => {
  const timeout = options.timeout || TEST_CONFIG.timeout.navigation
  const exact = options.exact !== false // Par défaut exact = true

  console.log(`⏳ Waiting for redirect to: ${expectedPath}`)

  await page.waitForURL(
    (url) => {
      const pathname = new URL(url).pathname
      return exact ? pathname === expectedPath : pathname.includes(expectedPath)
    },
    { timeout }
  )

  console.log(`✅ Redirected to: ${page.url()}`)
}

/**
 * Attendre la page de succès signup
 */
export const waitForSignupSuccess = async (
  page: Page,
  email: string
): Promise<void> => {
  console.log('⏳ Waiting for signup success page...')

  await waitForRedirect(page, '/auth/signup-success', { exact: false })

  // Vérifier que l'email est affiché
  await expect(page.locator('text=' + email)).toBeVisible()

  console.log('✅ Signup success page displayed')
}

/**
 * Attendre la redirection vers le dashboard
 */
export const waitForDashboard = async (
  page: Page,
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
): Promise<void> => {
  const dashboardPath = `/${role}/dashboard`

  console.log(`⏳ Waiting for dashboard redirect: ${dashboardPath}`)

  await waitForRedirect(page, dashboardPath)

  console.log(`✅ Redirected to dashboard: ${dashboardPath}`)
}

/**
 * Vérifier qu'on est connecté
 */
export const expectAuthenticated = async (page: Page): Promise<void> => {
  console.log('🔐 Checking authentication status...')

  // Vérifier qu'on n'est pas sur la page de login
  const url = page.url()
  expect(url).not.toContain('/auth/login')
  expect(url).not.toContain('/auth/signup')

  console.log('✅ User is authenticated')
}

/**
 * Vérifier qu'on n'est PAS connecté
 */
export const expectNotAuthenticated = async (page: Page): Promise<void> => {
  console.log('🔓 Checking that user is NOT authenticated...')

  // Vérifier qu'on est sur une page auth
  const url = page.url()
  const isAuthPage =
    url.includes('/auth/login') ||
    url.includes('/auth/signup') ||
    url.includes('/auth/unauthorized')

  expect(isAuthPage).toBeTruthy()

  console.log('✅ User is NOT authenticated')
}

/**
 * Se déconnecter
 */
export const logout = async (page: Page): Promise<void> => {
  console.log('🚪 Logging out...')

  // Étape 1: Ouvrir le menu utilisateur (dropdown)
  // Le bouton contient l'initiale + nom + rôle, utilise data-testid ou text partiel
  const userMenuButton = page.locator('button:has-text("Gestionnaire"), button:has-text("Prestataire"), button:has-text("Locataire"), button:has-text("Admin")').first()

  console.log('🔍 Opening user menu dropdown...')
  await userMenuButton.click()

  // Attendre que le dropdown menu soit visible
  await page.waitForTimeout(500) // Petit délai pour l'animation du dropdown

  // Étape 2: Cliquer sur "Se déconnecter" dans le dropdown
  console.log('🔍 Clicking logout button in dropdown...')
  const logoutButton = page.locator('span:has-text("Se déconnecter")').first()
  await logoutButton.click()

  // Attendre la redirection vers login
  await waitForRedirect(page, '/auth/login')

  console.log('✅ Logged out successfully')
}

/**
 * Alias pour logout (pour cohérence avec les noms de test)
 */
export const performLogout = logout

/**
 * Naviguer vers la page de signup
 */
export const navigateToSignup = async (page: Page): Promise<void> => {
  console.log('🔗 Navigating to signup page...')

  await page.goto('/auth/signup')
  await page.waitForLoadState('networkidle')

  console.log('✅ On signup page')
}

/**
 * Naviguer vers la page de login
 */
export const navigateToLogin = async (page: Page): Promise<void> => {
  console.log('🔗 Navigating to login page...')

  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  console.log('✅ On login page')
}

/**
 * Nettoyer un utilisateur de test dans Supabase
 * (Nécessite accès à Supabase Admin)
 */
export const cleanupTestUser = async (email: string): Promise<void> => {
  console.log(`🧹 Cleaning up test user: ${email}`)

  try {
    // Appeler l'API de cleanup (à implémenter)
    const response = await fetch(`${TEST_CONFIG.baseURL}/api/test/cleanup-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (response.ok) {
      console.log(`✅ Test user cleaned up: ${email}`)
    } else {
      console.warn(`⚠️  Failed to cleanup test user: ${email}`)
    }
  } catch (error) {
    console.warn('⚠️  Cleanup failed (non-blocking):', error)
  }
}

/**
 * Attendre qu'un toast apparaisse
 */
export const waitForToast = async (
  page: Page,
  message: string,
  options: {
    timeout?: number
    type?: 'success' | 'error' | 'info'
  } = {}
): Promise<void> => {
  const timeout = options.timeout || 5000

  console.log(`⏳ Waiting for toast: "${message}"`)

  // Chercher le toast (utilise Sonner dans SEIDO)
  const toast = page.locator(`[data-sonner-toast]:has-text("${message}")`)

  await toast.waitFor({ timeout })

  console.log(`✅ Toast appeared: "${message}"`)
}

/**
 * Attendre un message d'erreur
 */
export const waitForError = async (
  page: Page,
  errorMessage: string,
  options: { timeout?: number } = {}
): Promise<void> => {
  const timeout = options.timeout || 5000

  console.log(`⏳ Waiting for error: "${errorMessage}"`)

  const error = page.locator(`text="${errorMessage}"`)

  await error.waitFor({ timeout })

  console.log(`✅ Error appeared: "${errorMessage}"`)
}

/**
 * Attendre que le formulaire soit prêt
 */
export const waitForFormReady = async (page: Page): Promise<void> => {
  console.log('⏳ Waiting for form to be ready...')

  // Attendre que le formulaire soit visible et interactable
  await page.waitForSelector('form', { state: 'visible' })

  // Attendre que les inputs soient visibles
  await page.waitForSelector('input[name="email"]', { state: 'visible' })

  console.log('✅ Form is ready')
}

// ============================================================================
// LOGIN PAR RÔLE (HELPERS DE HAUT NIVEAU)
// ============================================================================

/**
 * Login générique avec credentials
 */
export const login = async (
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> => {
  console.log(`🔐 Logging in as: ${credentials.email}`)

  // Naviguer vers login
  await page.goto(`${TEST_CONFIG.baseURL}/auth/login`, { waitUntil: 'networkidle' })

  // Remplir et soumettre le formulaire
  await fillLoginForm(page, credentials)
  await submitLoginForm(page)

  // Attendre redirection dashboard (timeout 45s pour auth + middleware)
  await page.waitForURL('**/dashboard', { timeout: 45000 })

  console.log(`✅ Logged in successfully as: ${credentials.email}`)
}

/**
 * Login comme gestionnaire
 */
export const loginAsGestionnaire = async (page: Page): Promise<void> => {
  await login(page, {
    email: 'arthur@seido.pm',
    password: 'Wxcvbn123'
  })
}

/**
 * Login comme prestataire
 */
export const loginAsPrestataire = async (page: Page): Promise<void> => {
  await login(page, {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123'
  })
}

/**
 * Login comme locataire
 */
export const loginAsLocataire = async (page: Page): Promise<void> => {
  await login(page, {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123'
  })
}

/**
 * Attendre que l'authentification soit complète
 */
export const waitForAuth = async (page: Page, timeoutMs: number = 10000): Promise<void> => {
  console.log('⏳ Waiting for authentication to complete...')

  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const url = page.url()

    // Si on est sur un dashboard, c'est bon
    if (url.includes('/dashboard')) {
      console.log('✅ Authentication complete - on dashboard')
      return
    }

    await page.waitForTimeout(100)
  }

  throw new Error(`Authentication timeout after ${timeoutMs}ms`)
}

export default {
  fillSignupForm,
  submitSignupForm,
  fillLoginForm,
  submitLoginForm,
  waitForRedirect,
  waitForSignupSuccess,
  waitForDashboard,
  expectAuthenticated,
  expectNotAuthenticated,
  logout,
  performLogout,
  navigateToSignup,
  navigateToLogin,
  cleanupTestUser,
  waitForToast,
  waitForError,
  waitForFormReady,
  login,
  loginAsGestionnaire,
  loginAsPrestataire,
  loginAsLocataire,
  waitForAuth,
}
