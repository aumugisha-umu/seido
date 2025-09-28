import { Page, BrowserContext, expect } from '@playwright/test'
import { SELECTORS, fillFirstAvailable, clickFirstAvailable, waitForFirstAvailable } from './test-selectors'
import { ScreenshotHelper } from './screenshot-helpers'

export interface TestUser {
  email: string
  password: string
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  expectedDashboard: string
  roleName: string
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'marie.dubois@seido.fr',
    password: 'demo123',
    role: 'admin',
    expectedDashboard: '/admin/dashboard',
    roleName: 'Administrateur'
  },
  gestionnaire: {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    role: 'gestionnaire',
    expectedDashboard: '/gestionnaire/dashboard',
    roleName: 'Gestionnaire'
  },
  prestataire: {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123',
    role: 'prestataire',
    expectedDashboard: '/prestataire/dashboard',
    roleName: 'Prestataire'
  },
  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    role: 'locataire',
    expectedDashboard: '/locataire/dashboard',
    roleName: 'Locataire'
  }
}

/**
 * Helper d'authentification avec captures d'écran automatiques
 */
export class AuthHelper {
  constructor(
    private page: Page,
    private screenshotHelper?: ScreenshotHelper
  ) {}

  /**
   * Connexion avec captures d'écran étendues
   */
  async login(user: TestUser, options?: { captureSteps?: boolean }) {
    const captureSteps = options?.captureSteps ?? true

    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('login_start', {
        annotations: [{ type: 'step', description: `Début de connexion pour ${user.roleName}` }]
      })
    }

    // Nettoyer l'état d'auth précédent
    await this.clearAuthState()

    // Naviguer vers la page de login
    await this.page.goto('/auth/login')

    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('login_page_loaded')
    }

    // Attendre que le formulaire soit prêt
    const formSelector = await waitForFirstAvailable(this.page, ['form', '[data-testid="login-form"]'])
    if (!formSelector) {
      throw new Error('Formulaire de connexion introuvable')
    }

    // Remplir l'email avec sélecteurs robustes
    const emailFilled = await fillFirstAvailable(this.page, SELECTORS.auth.emailInput, user.email)
    if (!emailFilled) {
      throw new Error('Impossible de remplir le champ email')
    }

    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('email_filled')
    }

    // Remplir le mot de passe
    const passwordFilled = await fillFirstAvailable(this.page, SELECTORS.auth.passwordInput, user.password)
    if (!passwordFilled) {
      throw new Error('Impossible de remplir le champ mot de passe')
    }

    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('password_filled')
    }

    // Cliquer sur submit
    const submitClicked = await clickFirstAvailable(this.page, SELECTORS.auth.submitButton)
    if (!submitClicked) {
      throw new Error('Impossible de cliquer sur le bouton de connexion')
    }

    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('submit_clicked')
    }

    // Attendre la redirection vers le dashboard
    try {
      await this.page.waitForURL(user.expectedDashboard, { timeout: 15000 })

      if (captureSteps && this.screenshotHelper) {
        await this.screenshotHelper.captureStep('login_success', {
          annotations: [
            { type: 'success', description: `Connexion réussie pour ${user.roleName}` },
            { type: 'info', description: `URL: ${this.page.url()}` }
          ]
        })
      }
    } catch (error) {
      // Vérifier s'il y a un message d'erreur
      const errorVisible = await waitForFirstAvailable(this.page, SELECTORS.auth.errorMessage, { timeout: 3000 })

      if (captureSteps && this.screenshotHelper) {
        await this.screenshotHelper.captureStep('login_failed', {
          annotations: [
            { type: 'failure', description: `Échec de connexion pour ${user.roleName}` },
            { type: 'error', description: errorVisible ? 'Message d\'erreur visible' : 'Timeout de redirection' }
          ]
        })
      }

      throw new Error(`Échec de connexion pour ${user.roleName}: ${error}`)
    }

    // Vérifier que nous sommes bien sur le dashboard
    await this.verifyDashboardAccess(user, captureSteps)
  }

  /**
   * Vérification de l'accès au dashboard
   */
  async verifyDashboardAccess(user: TestUser, captureSteps: boolean = true) {
    // Vérifier l'URL
    expect(this.page.url()).toContain(user.expectedDashboard)

    // Attendre que le contenu du dashboard soit visible
    const titleSelector = await waitForFirstAvailable(this.page, SELECTORS.dashboard.title, { timeout: 10000 })
    if (titleSelector) {
      await expect(this.page.locator(titleSelector)).toBeVisible()
    }

    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('dashboard_verified', {
        annotations: [
          { type: 'verification', description: `Dashboard ${user.roleName} vérifié` },
          { type: 'info', description: `URL actuelle: ${this.page.url()}` }
        ]
      })
    }

    // Log du contenu pour debug
    const pageContent = await this.page.textContent('body')
    console.log(`Dashboard content preview for ${user.roleName}:`, pageContent?.substring(0, 200))
  }

  /**
   * Déconnexion avec captures
   */
  async logout(captureSteps: boolean = true) {
    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('logout_start')
    }

    // Essayer de cliquer sur le bouton de déconnexion
    const logoutClicked = await clickFirstAvailable(this.page, SELECTORS.auth.logoutButton, { timeout: 5000 })

    if (logoutClicked) {
      // Attendre la redirection vers login
      await this.page.waitForURL('**/auth/login', { timeout: 10000 })

      if (captureSteps && this.screenshotHelper) {
        await this.screenshotHelper.captureStep('logout_success')
      }
    } else {
      // Fallback: navigation directe
      console.log('Bouton de déconnexion non trouvé, navigation directe vers /auth/logout')
      await this.page.goto('/auth/logout')

      if (captureSteps && this.screenshotHelper) {
        await this.screenshotHelper.captureStep('logout_fallback')
      }
    }

    // Vérifier que nous sommes bien déconnectés
    expect(this.page.url()).toContain('/auth/login')
  }

  /**
   * Nettoyer l'état d'authentification
   */
  async clearAuthState() {
    await this.page.context().clearCookies()
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  }

  /**
   * Vérifier l'accès interdit à un rôle
   */
  async verifyAccessDenied(forbiddenPath: string, currentUser: TestUser, captureSteps: boolean = true) {
    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep(`access_test_${forbiddenPath.replace(/[\/]/g, '_')}`)
    }

    // Essayer d'accéder au chemin interdit
    await this.page.goto(forbiddenPath)

    // Attendre un peu pour voir la réaction
    await this.page.waitForTimeout(2000)

    // Vérifier qu'on n'est PAS sur le chemin interdit
    expect(this.page.url()).not.toContain(forbiddenPath)

    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('access_denied_verified', {
        annotations: [
          { type: 'security', description: `Accès correctement refusé à ${forbiddenPath}` },
          { type: 'info', description: `Utilisateur: ${currentUser.roleName}` },
          { type: 'info', description: `URL actuelle: ${this.page.url()}` }
        ]
      })
    }
  }

  /**
   * Test de performance de connexion
   */
  async loginPerformanceTest(user: TestUser): Promise<number> {
    const startTime = Date.now()

    await this.login(user, { captureSteps: false })

    const endTime = Date.now()
    const loginTime = endTime - startTime

    if (this.screenshotHelper) {
      await this.screenshotHelper.captureStep('performance_login_complete', {
        annotations: [
          { type: 'performance', description: `Connexion complétée en ${loginTime}ms` },
          { type: 'info', description: `Utilisateur: ${user.roleName}` }
        ]
      })
    }

    return loginTime
  }

  /**
   * Test de persistance de session
   */
  async testSessionPersistence(user: TestUser, captureSteps: boolean = true) {
    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('session_test_start')
    }

    // Recharger la page
    await this.page.reload()

    // Attendre et vérifier qu'on est toujours sur le dashboard
    await this.page.waitForURL(user.expectedDashboard, { timeout: 10000 })
    expect(this.page.url()).toContain(user.expectedDashboard)

    if (captureSteps && this.screenshotHelper) {
      await this.screenshotHelper.captureStep('session_persistence_verified', {
        annotations: [
          { type: 'verification', description: 'Session maintenue après rechargement' },
          { type: 'info', description: `Utilisateur: ${user.roleName}` }
        ]
      })
    }
  }
}

/**
 * Fonction helper pour créer un AuthHelper
 */
export function createAuthHelper(page: Page, screenshotHelper?: ScreenshotHelper): AuthHelper {
  return new AuthHelper(page, screenshotHelper)
}

/**
 * Setup d'authentification pour les tests
 */
export async function setupAuth(page: Page, context: BrowserContext, userRole: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userRole]
  const authHelper = new AuthHelper(page)

  await authHelper.login(user)

  // Sauvegarder l'état d'auth pour réutilisation
  await context.storageState({ path: `./test/auth-states/${userRole}.json` })

  return { user, authHelper }
}
