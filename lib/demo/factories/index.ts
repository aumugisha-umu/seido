/**
 * Factories pour générer des données réalistes de démonstration
 * Utilise Faker.js pour générer des données aléatoires mais cohérentes
 */

import { faker } from '@faker-js/faker'
import {
  getRandomAddress,
  getRandomBelgianName,
  getRandomBelgianPhone,
  getRandomCompanyName,
  BELGIAN_ADDRESSES,
  BORDER_ADDRESSES
} from '../config/locations.config'

/**
 * Helper pour générer un UUID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Helper pour obtenir une date récente aléatoire
 */
export function getRandomPastDate(days: number = 365): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * days))
  return date.toISOString()
}

/**
 * Factory: Team
 */
export function createTeam(overrides?: Partial<any>) {
  return {
    id: generateId(),
    name: 'Immobilière Benelux',
    description: 'Équipe de gestion immobilière démo',
    created_at: getRandomPastDate(365),
    updated_at: new Date().toISOString(),
    settings: {},
    ...overrides
  }
}

/**
 * Factory: User
 */
export function createUser(role: 'gestionnaire' | 'locataire' | 'prestataire' | 'admin', overrides?: Partial<any>) {
  const { firstName, lastName, fullName } = getRandomBelgianName()
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`

  return {
    id: generateId(),
    auth_user_id: generateId(),
    email,
    name: fullName,
    first_name: firstName,
    last_name: lastName,
    phone: getRandomBelgianPhone(),
    role,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`,
    is_active: true,
    password_set: true,
    team_id: null, // Sera défini lors du seed
    created_at: getRandomPastDate(365),
    updated_at: new Date().toISOString(),
    provider_rating: role === 'prestataire' ? faker.number.float({ min: 3.5, max: 5, multipleOf: 0.1 }) : null,
    total_interventions: role === 'prestataire' ? faker.number.int({ min: 10, max: 100 }) : 0,
    ...overrides
  }
}

/**
 * Factory: Building
 */
export function createBuilding(teamId: string, overrides?: Partial<any>) {
  const address = getRandomAddress()

  return {
    id: generateId(),
    team_id: teamId,
    name: `Résidence ${address.street.split(' ')[0]}`,
    address: address.street,
    city: address.city,
    postal_code: address.postalCode,
    country: address.country.toLowerCase(),
    description: faker.lorem.sentence(),
    total_lots: 0, // Sera calculé après création des lots
    occupied_lots: 0,
    vacant_lots: 0,
    total_interventions: 0,
    active_interventions: 0,
    metadata: {
      region: address.region
    },
    created_at: getRandomPastDate(1825), // Jusqu'à 5 ans
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Factory: Lot
 */
export function createLot(buildingId: string, teamId: string, reference: string, overrides?: Partial<any>) {
  const categories = ['appartement', 'studio', 'maison', 'parking', 'local_commercial'] as const
  const category = faker.helpers.arrayElement(categories)

  // Pour les lots sans building (maisons individuelles)
  const hasBuilding = !!buildingId
  const address = hasBuilding ? null : getRandomAddress()

  return {
    id: generateId(),
    building_id: buildingId || null,
    team_id: teamId,
    reference,
    category,
    floor: hasBuilding ? faker.number.int({ min: 0, max: 15 }) : null,
    description: faker.lorem.sentence(),
    street: !hasBuilding ? address?.street : null,
    city: !hasBuilding ? address?.city : null,
    postal_code: !hasBuilding ? address?.postalCode : null,
    country: !hasBuilding ? address?.country.toLowerCase() : null,
    total_interventions: 0,
    active_interventions: 0,
    metadata: {},
    created_at: getRandomPastDate(1825),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Factory: Intervention
 */
export function createIntervention(
  lotId: string,
  buildingId: string | null,
  teamId: string,
  createdBy: string,
  overrides?: Partial<any>
) {
  const types = ['plomberie', 'electricite', 'chauffage', 'menuiserie', 'serrurerie', 'peinture', 'autre'] as const
  const urgencies = ['faible', 'normale', 'haute', 'urgente'] as const
  const type = faker.helpers.arrayElement(types)
  const urgency = faker.helpers.arrayElement(urgencies)

  const titles = {
    plomberie: ['Fuite d\'eau salle de bain', 'Robinet qui goutte', 'WC bouché', 'Chauffe-eau en panne'],
    electricite: ['Panne électrique', 'Disjoncteur qui saute', 'Prise ne fonctionne plus', 'Lumière qui clignote'],
    chauffage: ['Radiateur froid', 'Chaudière en panne', 'Thermostat défectueux', 'Pas de chauffage'],
    menuiserie: ['Porte bloquée', 'Fenêtre qui ferme mal', 'Volet cassé', 'Parquet abîmé'],
    serrurerie: ['Serrure bloquée', 'Clé cassée dans la serrure', 'Porte claquée', 'Changement de serrure'],
    peinture: ['Mur abîmé', 'Plafond taché', 'Rafraîchissement peinture', 'Moisissure au plafond'],
    autre: ['Problème divers', 'Vitre cassée', 'Fuite au plafond', 'Nuisances']
  }

  const title = faker.helpers.arrayElement(titles[type] || titles.autre)

  return {
    id: generateId(),
    reference: `INT-${faker.string.numeric(4)}`,
    building_id: buildingId,
    lot_id: lotId,
    team_id: teamId,
    title,
    description: faker.lorem.paragraph(),
    type,
    urgency,
    status: 'demande', // Sera défini lors du seed selon distribution
    created_by: createdBy,
    created_at: getRandomPastDate(180),
    updated_at: new Date().toISOString(),
    requested_date: null,
    scheduled_date: null,
    completed_date: null,
    estimated_cost: null,
    final_cost: null,
    requires_quote: faker.datatype.boolean(0.3), // 30% nécessitent un devis
    scheduling_type: faker.helpers.arrayElement(['immediate', 'flexible', 'scheduled']),
    metadata: {},
    ...overrides
  }
}

/**
 * Factory: Intervention Assignment
 */
export function createInterventionAssignment(
  interventionId: string,
  userId: string,
  role: 'gestionnaire' | 'locataire' | 'prestataire',
  isPrimary: boolean = false,
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    intervention_id: interventionId,
    user_id: userId,
    role,
    is_primary: isPrimary,
    notes: null,
    notified: true,
    assigned_at: getRandomPastDate(180),
    created_at: getRandomPastDate(180),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Factory: Quote
 */
export function createQuote(
  interventionId: string,
  providerId: string,
  teamId: string,
  overrides?: Partial<any>
) {
  const amount = faker.number.int({ min: 100, max: 5000 })

  return {
    id: generateId(),
    intervention_id: interventionId,
    provider_id: providerId,
    team_id: teamId,
    quote_type: faker.helpers.arrayElement(['estimation', 'final']),
    amount,
    currency: 'EUR',
    description: faker.lorem.sentence(),
    line_items: [
      {
        description: 'Main d\'œuvre',
        quantity: faker.number.int({ min: 1, max: 8 }),
        unit_price: faker.number.int({ min: 40, max: 80 }),
        total: faker.number.int({ min: 200, max: 600 })
      },
      {
        description: 'Matériel et fournitures',
        quantity: 1,
        unit_price: faker.number.int({ min: 50, max: 500 }),
        total: faker.number.int({ min: 50, max: 500 })
      }
    ],
    status: faker.helpers.arrayElement(['draft', 'sent', 'accepted', 'rejected']),
    valid_until: faker.date.future().toISOString().split('T')[0],
    created_by: providerId,
    created_at: getRandomPastDate(90),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Factory: Lot Contact
 */
export function createLotContact(
  lotId: string,
  userId: string,
  isPrimary: boolean = true,
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    lot_id: lotId,
    user_id: userId,
    is_primary: isPrimary,
    role: 'locataire',
    notes: null,
    created_at: getRandomPastDate(365),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Factory: Team Member
 */
export function createTeamMember(
  teamId: string,
  userId: string,
  role: 'gestionnaire' | 'locataire' | 'prestataire' | 'admin',
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    team_id: teamId,
    user_id: userId,
    role,
    joined_at: getRandomPastDate(730),
    left_at: null,
    ...overrides
  }
}

/**
 * Factory: Notification
 */
export function createNotification(
  userId: string | null,
  teamId: string,
  type: string,
  title: string,
  content: string,
  isRead: boolean = false,
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    user_id: userId,
    team_id: teamId,
    type,
    title,
    content,
    is_read: isRead,
    link_url: null,
    created_at: getRandomPastDate(30),
    ...overrides
  }
}

/**
 * Factory: Building Contact
 */
export function createBuildingContact(
  buildingId: string,
  userId: string,
  role: 'proprietaire' | 'gestionnaire' | 'syndic',
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    building_id: buildingId,
    user_id: userId,
    role,
    created_at: getRandomPastDate(365),
    ...overrides
  }
}

/**
 * Factory: Company
 */
export function createCompany(overrides?: Partial<any>) {
  // Pick a random category for company name
  const categories = ['plomberie', 'electricite', 'chauffage', 'menuiserie', 'peinture'] as const
  const randomCategory = categories[Math.floor(Math.random() * categories.length)]
  const companyName = getRandomCompanyName(randomCategory)

  return {
    id: generateId(),
    team_id: null, // Sera défini lors du seed
    name: companyName,
    email: `contact@${companyName.toLowerCase().replace(/\s+/g, '-')}.be`,
    phone: getRandomBelgianPhone(),
    vat_number: `BE${faker.string.numeric(10)}`,
    specialties: [],
    created_at: getRandomPastDate(1825),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Factory: Company Member
 */
export function createCompanyMember(
  companyId: string,
  userId: string,
  role: 'owner' | 'member',
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    company_id: companyId,
    user_id: userId,
    role,
    created_at: getRandomPastDate(730),
    ...overrides
  }
}

/**
 * Factory: Time Slot
 */
export function createTimeSlot(
  interventionId: string,
  startTime: string,
  endTime: string,
  status: 'proposed' | 'accepted' | 'rejected',
  proposedBy: string,
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    intervention_id: interventionId,
    start_time: startTime,
    end_time: endTime,
    status,
    proposed_by: proposedBy,
    created_at: getRandomPastDate(90),
    ...overrides
  }
}

/**
 * Factory: Conversation Thread
 */
export function createConversationThread(
  interventionId: string,
  teamId: string,
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    intervention_id: interventionId,
    team_id: teamId,
    title: 'Discussion sur l\'intervention',
    created_at: getRandomPastDate(180),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Factory: Conversation Message
 */
export function createConversationMessage(
  threadId: string,
  userId: string,
  content: string,
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    thread_id: threadId,
    user_id: userId,
    content,
    is_internal: false,
    created_at: getRandomPastDate(180),
    ...overrides
  }
}

/**
 * Factory: Intervention Comment
 */
export function createInterventionComment(
  interventionId: string,
  userId: string,
  content: string,
  isInternal: boolean = false,
  overrides?: Partial<any>
) {
  return {
    id: generateId(),
    intervention_id: interventionId,
    user_id: userId,
    content,
    is_internal: isInternal,
    created_at: getRandomPastDate(180),
    ...overrides
  }
}

/**
 * Factory: Activity Log
 */
export function createActivityLog(data: {
  team_id: string
  user_id?: string
  entity_type: 'intervention' | 'building' | 'lot' | 'user' | 'team'
  entity_id: string
  action: string
  details?: Record<string, any>
}) {
  return {
    id: generateId(),
    ...data,
    created_at: getRandomPastDate(365),
  }
}

/**
 * Factory: User Invitation
 */
export function createUserInvitation(data: {
  team_id: string
  email: string
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  invited_by: string
  status?: 'pending' | 'accepted' | 'rejected'
}) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 jours

  return {
    id: generateId(),
    ...data,
    status: data.status || 'pending',
    expires_at: expiresAt.toISOString(),
    created_at: getRandomPastDate(30),
  }
}
