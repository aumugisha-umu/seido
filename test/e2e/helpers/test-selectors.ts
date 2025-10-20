/**
 * Sélecteurs optimisés et stables pour les tests E2E Seido
 * Utilise une hiérarchie de priorité pour la fiabilité
 */

export const SELECTORS = {
  // === AUTHENTICATION ===
  auth: {
    emailInput: [
      '[data-testid="email-input"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]'
    ],
    passwordInput: [
      '[data-testid="password-input"]',
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="mot de passe" i]',
      'input[placeholder*="password" i]'
    ],
    submitButton: [
      '[data-testid="login-submit"]',
      'button[type="submit"]',
      'button:has-text("Se connecter")',
      'button:has-text("Connexion")',
      'button:has-text("Login")'
    ],
    logoutButton: [
      '[data-testid="logout-button"]',
      'button:has-text("Déconnexion")',
      'button:has-text("Se déconnecter")',
      'button:has-text("Logout")',
      'a[href="/auth/logout"]'
    ],
    errorMessage: [
      '[data-testid="error-message"]',
      '.error-message',
      '[role="alert"]',
      'text=/erreur|error|invalid|incorrect/i'
    ]
  },

  // === NAVIGATION ===
  navigation: {
    mobileMenu: [
      '[data-testid="mobile-menu"]',
      '[data-testid="hamburger-menu"]',
      'button[aria-label*="menu" i]',
      '.mobile-menu-toggle'
    ],
    mobileNavigation: [
      '[data-testid="mobile-navigation"]',
      '[data-testid="mobile-nav"]',
      '.mobile-navigation',
      'nav[aria-label*="mobile" i]'
    ],
    mainNavigation: [
      '[data-testid="main-navigation"]',
      'nav[role="navigation"]',
      '.main-nav',
      'nav.navigation'
    ]
  },

  // === DASHBOARDS ===
  dashboard: {
    title: [
      '[data-testid="dashboard-title"]',
      'h1',
      'h2',
      '.dashboard-title'
    ],
    content: [
      '[data-testid="dashboard-content"]',
      '.dashboard-content',
      'main'
    ],
    statsCards: [
      '[data-testid="stats-card"]',
      '.stats-card',
      '.dashboard-stats .card'
    ]
  },

  // === INTERVENTIONS ===
  intervention: {
    // Listes et cartes
    card: [
      '[data-testid="intervention-card"]',
      '.intervention-card',
      '[data-intervention-id]'
    ],
    reference: [
      '[data-testid="intervention-reference"]',
      '[data-field="reference"]',
      '.intervention-reference'
    ],
    status: [
      '[data-testid="intervention-status"]',
      '[data-field="status"]',
      '.intervention-status'
    ],

    // Formulaires
    form: {
      type: [
        '[data-testid="intervention-type"]',
        'select[name="type"]',
        'select[name="intervention_type"]'
      ],
      urgency: [
        '[data-testid="intervention-urgency"]',
        'select[name="urgency"]',
        'select[name="priority"]'
      ],
      title: [
        '[data-testid="intervention-title"]',
        'input[name="title"]',
        'input[name="intervention_title"]'
      ],
      description: [
        '[data-testid="intervention-description"]',
        'textarea[name="description"]',
        'textarea[name="intervention_description"]'
      ],
      location: [
        '[data-testid="intervention-location"]',
        'input[name="location_details"]',
        'input[name="location"]'
      ]
    },

    // Actions
    actions: {
      approve: [
        '[data-testid="approve-intervention"]',
        'button[data-action="approve"]',
        'button:has-text("Approuver")'
      ],
      reject: [
        '[data-testid="reject-intervention"]',
        'button[data-action="reject"]',
        'button:has-text("Rejeter")'
      ],
      schedule: [
        '[data-testid="schedule-intervention"]',
        'button[data-action="schedule"]',
        'button:has-text("Programmer")'
      ],
      start: [
        '[data-testid="start-intervention"]',
        'button[data-action="start"]',
        'button:has-text("Commencer")'
      ],
      complete: [
        '[data-testid="complete-intervention"]',
        'button[data-action="complete"]',
        'button:has-text("Terminer")'
      ]
    }
  },

  // === MESSAGES ET FEEDBACK ===
  feedback: {
    successMessage: [
      '[data-testid="success-message"]',
      '.success-message',
      '[role="status"]',
      '.alert-success'
    ],
    errorMessage: [
      '[data-testid="error-message"]',
      '.error-message',
      '[role="alert"]',
      '.alert-error'
    ],
    loadingSpinner: [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[aria-label*="loading" i]'
    ]
  },

  // === FORMS GÉNÉRIQUES ===
  form: {
    submit: [
      '[data-testid="form-submit"]',
      'button[type="submit"]',
      '.submit-button'
    ],
    cancel: [
      '[data-testid="form-cancel"]',
      'button[type="button"]:has-text("Annuler")',
      '.cancel-button'
    ],
    required: [
      '[required]',
      '[aria-required="true"]',
      '.required'
    ]
  }
}

/**
 * Fonction helper pour obtenir le premier sélecteur disponible
 */
export async function getFirstAvailableSelector(
  page: unknown,
  selectors: string[],
  options?: { timeout?: number }
): Promise<string | null> {
  const timeout = options?.timeout || 5000

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: timeout / selectors.length })
      return selector
    } catch {
      // Continue avec le sélecteur suivant
    }
  }

  return null
}

/**
 * Fonction helper pour cliquer sur le premier élément disponible
 */
export async function clickFirstAvailable(
  page: unknown,
  selectors: string[],
  options?: { timeout?: number }
): Promise<boolean> {
  const availableSelector = await getFirstAvailableSelector(page, selectors, options)

  if (availableSelector) {
    await page.click(availableSelector)
    return true
  }

  return false
}

/**
 * Fonction helper pour remplir le premier champ disponible
 */
export async function fillFirstAvailable(
  page: unknown,
  selectors: string[],
  value: string,
  options?: { timeout?: number }
): Promise<boolean> {
  const availableSelector = await getFirstAvailableSelector(page, selectors, options)

  if (availableSelector) {
    await page.fill(availableSelector, value)
    return true
  }

  return false
}

/**
 * Fonction helper pour attendre un élément avec plusieurs sélecteurs
 */
export async function waitForFirstAvailable(
  page: unknown,
  selectors: string[],
  options?: { timeout?: number; state?: 'visible' | 'attached' | 'detached' | 'hidden' }
): Promise<string | null> {
  const timeout = options?.timeout || 10000
  const state = options?.state || 'visible'

  const promises = selectors.map(async (selector, index) => {
    try {
      await page.waitForSelector(selector, {
        timeout,
        state
      })
      return { selector, index }
    } catch {
      return null
    }
  })

  const results = await Promise.allSettled(promises)

  // Retourner le premier sélecteur qui a réussi (par ordre de priorité)
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled' && result.value) {
      return selectors[i]
    }
  }

  return null
}
