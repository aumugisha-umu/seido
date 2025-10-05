/**
 * 🎭 TEST DATA - Données de test réutilisables
 *
 * Fixtures pour les tests :
 * - Utilisateurs de test
 * - Bâtiments de test
 * - Interventions de test
 */

import { TEST_CONFIG, generateTestEmail } from '../config/test-config'

/**
 * Utilisateurs de test par défaut
 */
export const testUsers = TEST_CONFIG.testUsers

/**
 * Générer un utilisateur de test unique
 */
export const generateTestUser = (role: keyof typeof testUsers) => {
  const baseUser = testUsers[role]

  return {
    ...baseUser,
    email: generateTestEmail(role, Date.now()),
  }
}

/**
 * Bâtiments de test
 */
export const testBuildings = {
  default: {
    name: 'Immeuble Test',
    address: '123 Rue de Test',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
  },
  secondary: {
    name: 'Résidence Les Pins',
    address: '456 Avenue de la Paix',
    city: 'Lyon',
    postalCode: '69001',
    country: 'France',
  },
}

/**
 * Lots de test
 */
export const testLots = {
  apartment: {
    name: 'Appartement 101',
    floor: 1,
    type: 'apartment' as const,
    surface: 50,
  },
  house: {
    name: 'Maison individuelle',
    floor: 0,
    type: 'house' as const,
    surface: 120,
  },
}

/**
 * Contacts de test
 */
export const testContacts = {
  tenant: {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@test.com',
    phone: '+33612345678',
    role: 'locataire' as const,
  },
  provider: {
    firstName: 'Marie',
    lastName: 'Martin',
    email: 'marie.martin@test.com',
    phone: '+33698765432',
    role: 'prestataire' as const,
  },
}

/**
 * Interventions de test
 */
export const testInterventions = {
  plumbing: {
    title: 'Fuite d\'eau salle de bain',
    description: 'Fuite importante sous le lavabo de la salle de bain',
    category: 'plomberie' as const,
    urgency: 'high' as const,
  },
  electrical: {
    title: 'Panne électrique',
    description: 'Coupure de courant dans le salon',
    category: 'électricité' as const,
    urgency: 'medium' as const,
  },
  maintenance: {
    title: 'Entretien chaudière',
    description: 'Entretien annuel de la chaudière',
    category: 'chauffage' as const,
    urgency: 'low' as const,
  },
}

export default {
  testUsers,
  generateTestUser,
  testBuildings,
  testLots,
  testContacts,
  testInterventions,
}
