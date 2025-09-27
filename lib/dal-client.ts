import type { Database } from './database.types'

export interface AuthUser {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  display_name?: string
  role: Database['public']['Enums']['user_role']
  team_id?: string
  phone?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

/**
 * 🔐 DAL CLIENT - VERSION CÔTÉ CLIENT (Bonnes Pratiques 2025)
 *
 * Version allégée du DAL pour utilisation côté client :
 * - Pas d'accès aux cookies serveur
 * - Pas de redirection automatique
 * - Interface compatible avec le DAL serveur
 */

// Types pour compatibilité avec l'ancien système
export interface SessionResult {
  isValid: boolean
  user: AuthUser | null
}

// Fonction placeholder pour compatibilité (ne fait rien côté client)
export function verifySession(): Promise<SessionResult> {
  // Côté client, on ne peut pas vérifier la session serveur
  // Cette fonction est juste pour la compatibilité des types
  return Promise.resolve({ isValid: false, user: null })
}

// Types pour routing côté client
export const ROLE_ROUTES = {
  admin: {
    dashboard: '/admin',
    default: '/admin',
    allowed: ['/admin', '/gestionnaire', '/prestataire', '/locataire']
  },
  gestionnaire: {
    dashboard: '/gestionnaire',
    default: '/gestionnaire/dashboard',
    allowed: ['/gestionnaire']
  },
  prestataire: {
    dashboard: '/prestataire',
    default: '/prestataire/dashboard',
    allowed: ['/prestataire']
  },
  locataire: {
    dashboard: '/locataire',
    default: '/locataire/dashboard',
    allowed: ['/locataire']
  }
} as const

export type UserRole = Database['public']['Enums']['user_role']