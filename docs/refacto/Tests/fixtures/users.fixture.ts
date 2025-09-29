/**
 * Fixtures Utilisateurs pour Tests E2E SEIDO
 * Données de test cohérentes pour les 4 rôles utilisateur avec métadonnées enrichies
 */

export interface TestUser {
  email: string
  password: string
  role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  name: string
  displayName?: string
  teamId?: string
  lotId?: string
  expectedDashboard: string
  permissions: string[]
  testContext: {
    description: string
    priority: 'high' | 'medium' | 'low'
    workflows: string[]
  }
}

export interface TestTeam {
  id: string
  name: string
  description: string
  members: string[] // User emails
}

/**
 * Utilisateurs de test pour chaque rôle
 * Basés sur les comptes existants dans le système SEIDO
 */
export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'arthur+admin@seido.pm',
    password: 'Test123!@#',
    role: 'admin',
    name: 'Arthur Admin',
    displayName: 'Admin SEIDO',
    teamId: 'team-admin',
    expectedDashboard: '/admin/dashboard',
    permissions: [
      'system:read',
      'system:write',
      'users:manage',
      'teams:manage',
      'buildings:manage',
      'interventions:manage',
      'stats:global'
    ],
    testContext: {
      description: 'Administrateur système avec tous les droits',
      priority: 'high',
      workflows: [
        'user-management',
        'system-statistics',
        'global-oversight',
        'team-administration'
      ]
    }
  },

  gestionnaire: {
    email: 'arthur@seido.pm',
    password: 'Test123!@#',
    role: 'gestionnaire',
    name: 'Arthur Gestionnaire',
    displayName: 'Gestionnaire Principal',
    teamId: 'team-gestionnaire',
    expectedDashboard: '/gestionnaire/dashboard',
    permissions: [
      'team:read',
      'team:write',
      'buildings:read',
      'buildings:write',
      'lots:read',
      'lots:write',
      'interventions:read',
      'interventions:write',
      'interventions:approve',
      'contacts:manage',
      'stats:team'
    ],
    testContext: {
      description: 'Gestionnaire d\'équipe avec gestion complète des biens et interventions',
      priority: 'high',
      workflows: [
        'property-management',
        'team-management',
        'intervention-approval',
        'contact-management',
        'dashboard-overview'
      ]
    }
  },

  locataire: {
    email: 'arthur+loc@seido.pm',
    password: 'Test123!@#',
    role: 'locataire',
    name: 'Arthur Locataire',
    displayName: 'Locataire Test',
    lotId: 'lot-test-001',
    expectedDashboard: '/locataire/dashboard',
    permissions: [
      'interventions:create',
      'interventions:read:own',
      'lot:read:own',
      'building:read:limited'
    ],
    testContext: {
      description: 'Locataire avec accès limité à ses propres interventions et informations logement',
      priority: 'high',
      workflows: [
        'intervention-request',
        'intervention-tracking',
        'property-information',
        'contact-manager'
      ]
    }
  },

  prestataire: {
    email: 'arthur+prest@seido.pm',
    password: 'Test123!@#',
    role: 'prestataire',
    name: 'Arthur Prestataire',
    displayName: 'Prestataire Test',
    teamId: 'team-prestataire',
    expectedDashboard: '/prestataire/dashboard',
    permissions: [
      'interventions:read:assigned',
      'interventions:update:assigned',
      'quotes:create',
      'quotes:update',
      'availability:manage',
      'documents:upload'
    ],
    testContext: {
      description: 'Prestataire avec accès aux interventions assignées et gestion des devis',
      priority: 'high',
      workflows: [
        'intervention-execution',
        'quote-management',
        'availability-management',
        'document-upload',
        'status-updates'
      ]
    }
  }
}

/**
 * Équipes de test pour validation des relations
 */
export const TEST_TEAMS: Record<string, TestTeam> = {
  'team-admin': {
    id: 'team-admin',
    name: 'Équipe Administration',
    description: 'Équipe administrative système',
    members: ['arthur+admin@seido.pm']
  },

  'team-gestionnaire': {
    id: 'team-gestionnaire',
    name: 'Équipe Gestion Immobilière',
    description: 'Équipe de gestionnaires immobiliers',
    members: ['arthur@seido.pm']
  },

  'team-prestataire': {
    id: 'team-prestataire',
    name: 'Équipe Prestataires',
    description: 'Équipe de prestataires de services',
    members: ['arthur+prest@seido.pm']
  }
}

/**
 * Données de test pour différents scénarios
 */
export const TEST_SCENARIOS = {
  // Scénario d'authentification réussie
  SUCCESSFUL_AUTH: {
    name: 'successful_authentication',
    description: 'Authentification réussie pour tous les rôles',
    users: Object.values(TEST_USERS),
    expectedOutcomes: {
      redirections: true,
      dashboardLoad: true,
      userMenu: true,
      roleSpecificContent: true
    }
  },

  // Scénario d'authentification échouée
  FAILED_AUTH: {
    name: 'failed_authentication',
    description: 'Tentatives d\'authentification avec mauvais credentials',
    testCases: [
      {
        email: 'arthur+admin@seido.pm',
        password: 'WrongPassword123',
        expectedError: 'Invalid credentials'
      },
      {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
        expectedError: 'User not found'
      },
      {
        email: 'arthur@umumentum.com',
        password: '',
        expectedError: 'Password required'
      }
    ]
  },

  // Scénario d'accès non autorisé
  UNAUTHORIZED_ACCESS: {
    name: 'unauthorized_access',
    description: 'Tentatives d\'accès à des ressources non autorisées',
    testCases: [
      {
        userRole: 'locataire',
        attemptedUrl: '/admin/dashboard',
        expectedRedirect: '/auth/unauthorized'
      },
      {
        userRole: 'prestataire',
        attemptedUrl: '/gestionnaire/dashboard',
        expectedRedirect: '/auth/unauthorized'
      },
      {
        userRole: 'gestionnaire',
        attemptedUrl: '/admin/dashboard',
        expectedRedirect: '/auth/unauthorized'
      }
    ]
  },

  // Scénario de workflow cross-rôle
  CROSS_ROLE_WORKFLOW: {
    name: 'cross_role_workflow',
    description: 'Workflow complet impliquant plusieurs rôles',
    steps: [
      { role: 'locataire', action: 'create_intervention', target: 'intervention-001' },
      { role: 'gestionnaire', action: 'approve_intervention', target: 'intervention-001' },
      { role: 'prestataire', action: 'submit_quote', target: 'intervention-001' },
      { role: 'gestionnaire', action: 'approve_quote', target: 'intervention-001' },
      { role: 'prestataire', action: 'execute_intervention', target: 'intervention-001' },
      { role: 'locataire', action: 'validate_completion', target: 'intervention-001' }
    ]
  }
}

/**
 * Configuration de sécurité pour les tests
 */
export const SECURITY_CONFIG = {
  // Timeout pour les opérations d'auth
  authTimeout: 10000, // 10 secondes

  // Retry pour les échecs d'auth intermittents
  authRetries: 2,

  // Sessions à nettoyer après chaque test
  cleanupSessions: true,

  // Vérifier les headers de sécurité
  securityHeaders: [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection'
  ],

  // URLs protégées par rôle
  protectedRoutes: {
    admin: ['/admin/*'],
    gestionnaire: ['/gestionnaire/*', '/admin/users'],
    locataire: ['/locataire/*'],
    prestataire: ['/prestataire/*']
  }
}

/**
 * Utilitaires pour les fixtures
 */
export class TestUserManager {
  /**
   * Obtenir un utilisateur de test par rôle
   */
  static getUserByRole(role: TestUser['role']): TestUser {
    return TEST_USERS[role]
  }

  /**
   * Obtenir tous les utilisateurs d'un certain niveau de priorité
   */
  static getUsersByPriority(priority: TestUser['testContext']['priority']): TestUser[] {
    return Object.values(TEST_USERS).filter(user => user.testContext.priority === priority)
  }

  /**
   * Obtenir les utilisateurs pour un workflow spécifique
   */
  static getUsersForWorkflow(workflow: string): TestUser[] {
    return Object.values(TEST_USERS).filter(user =>
      user.testContext.workflows.includes(workflow)
    )
  }

  /**
   * Valider qu'un utilisateur a une permission spécifique
   */
  static userHasPermission(user: TestUser, permission: string): boolean {
    return user.permissions.includes(permission) || user.permissions.includes('system:write')
  }

  /**
   * Générer des données de test randomisées (pour éviter les conflits)
   */
  static generateTestEmail(baseEmail: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return baseEmail.replace('@', `+test-${timestamp}-${random}@`)
  }

  /**
   * Créer un utilisateur de test temporaire
   */
  static createTemporaryUser(role: TestUser['role'], overrides: Partial<TestUser> = {}): TestUser {
    const baseUser = TEST_USERS[role]
    return {
      ...baseUser,
      ...overrides,
      email: this.generateTestEmail(baseUser.email)
    }
  }
}

/**
 * Validation des données de test
 */
export function validateTestUsers(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Vérifier que tous les rôles ont un utilisateur
  const requiredRoles: TestUser['role'][] = ['admin', 'gestionnaire', 'locataire', 'prestataire']
  for (const role of requiredRoles) {
    if (!TEST_USERS[role]) {
      errors.push(`Missing user for role: ${role}`)
    }
  }

  // Vérifier que les emails sont uniques
  const emails = Object.values(TEST_USERS).map(user => user.email)
  const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate emails found: ${duplicates.join(', ')}`)
  }

  // Vérifier que les dashboards correspondent aux rôles
  for (const [role, user] of Object.entries(TEST_USERS)) {
    if (!user.expectedDashboard.includes(role)) {
      errors.push(`Mismatched dashboard for role ${role}: ${user.expectedDashboard}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}