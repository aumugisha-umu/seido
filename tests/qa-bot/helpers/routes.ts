/**
 * Complete sitemap of SEIDO routes organized by role.
 * Used by guided tests for navigation and by autonomous explorer for coverage tracking.
 */

export type UserRole = 'gestionnaire' | 'locataire' | 'prestataire'

export interface Route {
  path: string
  label: string
  /** Which shard tests this route (1-8) */
  shard: number
  /** Whether this route requires dynamic data (e.g., [id]) */
  isDynamic: boolean
  /** Page complexity type for autonomous prioritization */
  testType: 'page' | 'wizard' | 'detail' | 'hub' | 'list' | 'tabs'
}

export const GESTIONNAIRE_ROUTES: Route[] = [
  // Shard 1: Smoke + Navigation
  { path: '/gestionnaire/dashboard', label: 'Dashboard', shard: 1, isDynamic: false, testType: 'tabs' },
  { path: '/gestionnaire/profile', label: 'Profile', shard: 1, isDynamic: false, testType: 'page' },

  // Shard 2: Patrimoine + Contacts
  { path: '/gestionnaire/biens', label: 'Biens', shard: 2, isDynamic: false, testType: 'tabs' },
  { path: '/gestionnaire/biens/immeubles/nouveau', label: 'Nouveau immeuble', shard: 2, isDynamic: false, testType: 'wizard' },
  { path: '/gestionnaire/biens/immeubles/[id]', label: 'Détail immeuble', shard: 2, isDynamic: true, testType: 'detail' },
  { path: '/gestionnaire/biens/immeubles/modifier/[id]', label: 'Modifier immeuble', shard: 2, isDynamic: true, testType: 'wizard' },
  { path: '/gestionnaire/biens/lots/nouveau', label: 'Nouveau lot', shard: 2, isDynamic: false, testType: 'wizard' },
  { path: '/gestionnaire/biens/lots/[id]', label: 'Détail lot', shard: 2, isDynamic: true, testType: 'detail' },
  { path: '/gestionnaire/biens/lots/modifier/[id]', label: 'Modifier lot', shard: 2, isDynamic: true, testType: 'wizard' },
  { path: '/gestionnaire/contacts', label: 'Contacts', shard: 2, isDynamic: false, testType: 'list' },
  { path: '/gestionnaire/contacts/nouveau', label: 'Nouveau contact', shard: 2, isDynamic: false, testType: 'wizard' },
  { path: '/gestionnaire/contacts/details/[id]', label: 'Détail contact', shard: 2, isDynamic: true, testType: 'detail' },
  { path: '/gestionnaire/contacts/modifier/[id]', label: 'Modifier contact', shard: 2, isDynamic: true, testType: 'wizard' },
  { path: '/gestionnaire/contacts/societes/[id]', label: 'Détail société', shard: 2, isDynamic: true, testType: 'detail' },

  // Shard 3: Contrats + Rappels
  { path: '/gestionnaire/contrats', label: 'Contrats', shard: 3, isDynamic: false, testType: 'list' },
  { path: '/gestionnaire/contrats/nouveau', label: 'Nouveau contrat', shard: 3, isDynamic: false, testType: 'wizard' },
  { path: '/gestionnaire/contrats/[id]', label: 'Détail contrat', shard: 3, isDynamic: true, testType: 'detail' },
  { path: '/gestionnaire/contrats/modifier/[id]', label: 'Modifier contrat', shard: 3, isDynamic: true, testType: 'wizard' },
  { path: '/gestionnaire/operations', label: 'Opérations', shard: 3, isDynamic: false, testType: 'tabs' },
  { path: '/gestionnaire/operations/nouveau-rappel', label: 'Nouveau rappel', shard: 3, isDynamic: false, testType: 'wizard' },
  { path: '/gestionnaire/operations/rappels/[id]', label: 'Détail rappel', shard: 3, isDynamic: true, testType: 'detail' },

  // Shard 4: Interventions
  { path: '/gestionnaire/operations/nouvelle-intervention', label: 'Nouvelle intervention', shard: 4, isDynamic: false, testType: 'wizard' },
  { path: '/gestionnaire/operations/interventions/[id]', label: 'Détail intervention', shard: 4, isDynamic: true, testType: 'detail' },
  { path: '/gestionnaire/operations/interventions/modifier/[id]', label: 'Modifier intervention', shard: 4, isDynamic: true, testType: 'wizard' },
  { path: '/gestionnaire/interventions', label: 'Interventions list', shard: 4, isDynamic: false, testType: 'list' },

  // Shard 6: Email
  { path: '/gestionnaire/mail', label: 'Mail hub', shard: 6, isDynamic: false, testType: 'hub' },
  { path: '/gestionnaire/parametres/emails', label: 'Email settings', shard: 6, isDynamic: false, testType: 'page' },

  // Shard 7: Notifications
  { path: '/gestionnaire/notifications', label: 'Notifications', shard: 7, isDynamic: false, testType: 'list' },

  // Shard 8: Settings + Billing
  { path: '/gestionnaire/parametres', label: 'Paramètres', shard: 8, isDynamic: false, testType: 'page' },
  { path: '/gestionnaire/parametres/assistant-ia', label: 'Assistant IA', shard: 8, isDynamic: false, testType: 'page' },
  { path: '/gestionnaire/parametres/assistant-ia/historique', label: 'AI Phone History', shard: 8, isDynamic: false, testType: 'list' },
  { path: '/gestionnaire/settings/billing', label: 'Billing', shard: 8, isDynamic: false, testType: 'page' },
  { path: '/gestionnaire/aide', label: 'Aide', shard: 8, isDynamic: false, testType: 'page' },
  { path: '/gestionnaire/import', label: 'Import', shard: 8, isDynamic: false, testType: 'page' },
]

export const LOCATAIRE_ROUTES: Route[] = [
  { path: '/locataire/dashboard', label: 'Dashboard', shard: 1, isDynamic: false, testType: 'tabs' },
  { path: '/locataire/profile', label: 'Profile', shard: 1, isDynamic: false, testType: 'page' },
  { path: '/locataire/interventions/nouvelle-demande', label: 'Nouvelle demande', shard: 5, isDynamic: false, testType: 'wizard' },
  { path: '/locataire/interventions/[id]', label: 'Détail intervention', shard: 4, isDynamic: true, testType: 'detail' },
  { path: '/locataire/lots/[id]', label: 'Détail lot', shard: 8, isDynamic: true, testType: 'detail' },
  { path: '/locataire/notifications', label: 'Notifications', shard: 7, isDynamic: false, testType: 'list' },
]

export const PRESTATAIRE_ROUTES: Route[] = [
  { path: '/prestataire/dashboard', label: 'Dashboard', shard: 1, isDynamic: false, testType: 'tabs' },
  { path: '/prestataire/profile', label: 'Profile', shard: 1, isDynamic: false, testType: 'page' },
  { path: '/prestataire/interventions/[id]', label: 'Détail intervention', shard: 4, isDynamic: true, testType: 'detail' },
  { path: '/prestataire/parametres', label: 'Paramètres', shard: 8, isDynamic: false, testType: 'page' },
  { path: '/prestataire/notifications', label: 'Notifications', shard: 7, isDynamic: false, testType: 'list' },
]

export const ALL_ROUTES = [
  ...GESTIONNAIRE_ROUTES,
  ...LOCATAIRE_ROUTES,
  ...PRESTATAIRE_ROUTES,
]

/** Get all static (non-dynamic) routes for a role */
export function getStaticRoutes(role: UserRole): Route[] {
  const routeMap = {
    gestionnaire: GESTIONNAIRE_ROUTES,
    locataire: LOCATAIRE_ROUTES,
    prestataire: PRESTATAIRE_ROUTES,
  }
  return routeMap[role].filter(r => !r.isDynamic)
}

/** Get routes for a specific shard */
export function getRoutesForShard(shard: number): Route[] {
  return ALL_ROUTES.filter(r => r.shard === shard)
}

/** Dashboard URL for a role */
export function getDashboardUrl(role: UserRole): string {
  return `/${role}/dashboard`
}

/**
 * Map a source file path to routes that it likely affects.
 * Used by autonomous explorer to prioritize routes touched by a deploy commit.
 */
export function mapFileToRoutes(filePath: string): Route[] {
  const normalized = filePath.replace(/\\/g, '/')

  // Direct route file match: app/{role}/.../page.tsx → route path
  const routeMatch = normalized.match(/app\/(gestionnaire|locataire|prestataire)\/(.+?)\/page\.tsx/)
  if (routeMatch) {
    const role = routeMatch[1]
    const routeSegment = routeMatch[2].replace(/\(.*?\)\//g, '') // strip route groups
    const routePath = `/${role}/${routeSegment}`
    return ALL_ROUTES.filter(r => r.path.startsWith(routePath))
  }

  // Component file → match by keyword in path
  const componentMatch = normalized.match(/components\/(.*?)\//)
  if (componentMatch) {
    const component = componentMatch[1].toLowerCase()
    const keywordMap: Record<string, string[]> = {
      'intervention': ['/operations/interventions', '/operations/nouvelle-intervention', '/interventions'],
      'building': ['/biens/immeubles'],
      'lot': ['/biens/lots'],
      'contract': ['/contrats'],
      'reminder': ['/operations/nouveau-rappel', '/operations/rappels'],
      'email': ['/mail', '/parametres/emails'],
      'notification': ['/notifications'],
      'billing': ['/settings/billing'],
      'dashboard': ['/dashboard'],
    }

    const keywords = keywordMap[component] || []
    if (keywords.length > 0) {
      return ALL_ROUTES.filter(r => keywords.some(kw => r.path.includes(kw)))
    }
  }

  return []
}
