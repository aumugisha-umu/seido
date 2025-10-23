/**
 * Fixtures Contacts pour Tests E2E SEIDO
 * Données de test cohérentes pour la gestion des contacts (locataires, propriétaires, prestataires)
 */

export type ContactType = 'locataire' | 'proprietaire' | 'prestataire' | 'gestionnaire'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface TestContact {
  id?: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  type: ContactType
  teamId?: string

  // Pour les prestataires
  speciality?: 'plomberie' | 'electricite' | 'chauffage' | 'menuiserie' | 'peinture' | 'other'
  companyName?: string
  siret?: string

  // Pour les locataires/propriétaires
  lotId?: string
  buildingId?: string

  // Métadonnées
  notes?: string
  createdAt?: Date
  invitationSent?: boolean
  testContext?: {
    description: string
    useCase: string[]
    priority: 'high' | 'medium' | 'low'
  }
}

export interface TestContactInvitation {
  id: string
  contactId: string
  contactEmail: string
  status: InvitationStatus
  token?: string
  expiresAt: Date
  sentAt: Date
  acceptedAt?: Date
  cancelledAt?: Date
  teamId: string
  invitedBy: string // Email du gestionnaire
  metadata?: {
    reminderCount?: number
    lastReminderAt?: Date
  }
}

/**
 * Contacts de test pour différents scénarios
 */
export const TEST_CONTACTS: Record<string, TestContact> = {
  // Locataires
  locataire1: {
    id: 'contact-loc-001',
    email: 'jean.dupont@example.com',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '+33612345678',
    type: 'locataire',
    lotId: 'lot-test-001',
    buildingId: 'building-test-001',
    notes: 'Locataire appartement 2A',
    invitationSent: true,
    testContext: {
      description: 'Locataire standard avec toutes informations',
      useCase: ['contact-display', 'invitation-workflow', 'contact-update'],
      priority: 'high'
    }
  },

  locataire2: {
    id: 'contact-loc-002',
    email: 'marie.martin@example.com',
    firstName: 'Marie',
    lastName: 'Martin',
    phone: '+33687654321',
    type: 'locataire',
    lotId: 'lot-test-002',
    buildingId: 'building-test-001',
    notes: 'Locataire appartement 3B',
    invitationSent: false,
    testContext: {
      description: 'Locataire sans invitation envoyée',
      useCase: ['contact-creation', 'invitation-first-send'],
      priority: 'high'
    }
  },

  locataire3: {
    email: 'pierre.bernard@example.com',
    firstName: 'Pierre',
    lastName: 'Bernard',
    type: 'locataire',
    invitationSent: false,
    testContext: {
      description: 'Locataire minimal (juste email + nom)',
      useCase: ['contact-minimal-creation', 'validation-minimum-fields'],
      priority: 'medium'
    }
  },

  // Propriétaires
  proprietaire1: {
    id: 'contact-prop-001',
    email: 'sophie.durand@example.com',
    firstName: 'Sophie',
    lastName: 'Durand',
    phone: '+33698765432',
    type: 'proprietaire',
    buildingId: 'building-test-002',
    notes: 'Propriétaire immeuble Résidence du Parc',
    invitationSent: true,
    testContext: {
      description: 'Propriétaire avec immeuble complet',
      useCase: ['owner-management', 'building-association'],
      priority: 'high'
    }
  },

  proprietaire2: {
    email: 'michel.dubois@example.com',
    firstName: 'Michel',
    lastName: 'Dubois',
    phone: '+33601020304',
    type: 'proprietaire',
    notes: 'Copropriétaire',
    invitationSent: false,
    testContext: {
      description: 'Propriétaire sans bâtiment assigné',
      useCase: ['contact-creation', 'pending-assignment'],
      priority: 'medium'
    }
  },

  // Prestataires
  prestataire1: {
    id: 'contact-prest-001',
    email: 'plombier.pro@example.com',
    firstName: 'Laurent',
    lastName: 'Plombier',
    phone: '+33612131415',
    type: 'prestataire',
    speciality: 'plomberie',
    companyName: 'Plomberie Laurent',
    siret: '12345678900012',
    notes: 'Prestataire plomberie - disponible 7j/7',
    invitationSent: true,
    testContext: {
      description: 'Prestataire plombier avec toutes infos',
      useCase: ['provider-management', 'intervention-assignment', 'quote-workflow'],
      priority: 'high'
    }
  },

  prestataire2: {
    id: 'contact-prest-002',
    email: 'electricien.services@example.com',
    firstName: 'Thomas',
    lastName: 'Électricien',
    phone: '+33623456789',
    type: 'prestataire',
    speciality: 'electricite',
    companyName: 'Électricité Thomas Services',
    siret: '98765432100019',
    notes: 'Spécialiste installations électriques',
    invitationSent: true,
    testContext: {
      description: 'Prestataire électricien actif',
      useCase: ['provider-search', 'speciality-filter', 'availability-check'],
      priority: 'high'
    }
  },

  prestataire3: {
    email: 'chauffage.expert@example.com',
    firstName: 'Pascal',
    lastName: 'Chauffagiste',
    phone: '+33634567890',
    type: 'prestataire',
    speciality: 'chauffage',
    companyName: 'Chauffage Expert',
    invitationSent: false,
    testContext: {
      description: 'Prestataire chauffage nouveau',
      useCase: ['new-provider-onboarding', 'speciality-registration'],
      priority: 'medium'
    }
  },

  // Gestionnaires (pour tests de collaboration)
  gestionnaire1: {
    email: 'gestionnaire2@seido.pm',
    firstName: 'Claire',
    lastName: 'Gestion',
    phone: '+33645678901',
    type: 'gestionnaire',
    notes: 'Gestionnaire secondaire pour tests collaboration',
    invitationSent: true,
    testContext: {
      description: 'Gestionnaire pour tests multi-gestionnaires',
      useCase: ['team-collaboration', 'shared-management'],
      priority: 'low'
    }
  },

  // Contacts pour tests Phase 2 (nouveaux contacts à créer)
  NEW_LOCATAIRE_1: {
    email: 'nouveau.locataire.phase2@example.com',
    firstName: 'Julien',
    lastName: 'Nouveau',
    phone: '+33678901234',
    type: 'locataire',
    invitationSent: false,
    testContext: {
      description: 'Nouveau locataire pour test workflow invitation complet',
      useCase: ['contact-creation-workflow', 'invitation-send', 'contact-list-verification'],
      priority: 'high'
    }
  },

  NEW_PRESTATAIRE_1: {
    email: 'nouveau.prestataire.phase2@example.com',
    firstName: 'Marc',
    lastName: 'Artisan',
    phone: '+33689012345',
    type: 'prestataire',
    speciality: 'menuiserie',
    companyName: 'Menuiserie Artisan',
    siret: '11122233344455',
    invitationSent: false,
    testContext: {
      description: 'Nouveau prestataire avec spécialité menuiserie',
      useCase: ['provider-creation', 'speciality-assignment', 'invitation-workflow'],
      priority: 'high'
    }
  },

  // Contacts existants pour tests de validation
  EXISTING_LOCATAIRE_1: {
    id: 'contact-loc-001',
    email: 'jean.dupont@example.com',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '+33612345678',
    type: 'locataire',
    lotId: 'lot-test-001',
    buildingId: 'building-test-001',
    notes: 'Locataire appartement 2A (utilisé pour test duplicate)',
    invitationSent: true,
    testContext: {
      description: 'Locataire existant pour tests de validation email duplicate',
      useCase: ['duplicate-validation', 'existing-contact-tests'],
      priority: 'high'
    }
  }
}

/**
 * Invitations de test pour différents statuts
 */
export const TEST_INVITATIONS: Record<string, TestContactInvitation> = {
  invitation_pending: {
    id: 'inv-001',
    contactId: 'contact-loc-002',
    contactEmail: 'marie.martin@example.com',
    status: 'pending',
    token: 'test-token-pending-abc123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // -2 jours
    teamId: 'team-gestionnaire',
    invitedBy: 'arthur@seido.pm',
    metadata: {
      reminderCount: 0
    }
  },

  invitation_accepted: {
    id: 'inv-002',
    contactId: 'contact-loc-001',
    contactEmail: 'jean.dupont@example.com',
    status: 'accepted',
    token: 'test-token-accepted-def456',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // -10 jours
    acceptedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // -8 jours
    teamId: 'team-gestionnaire',
    invitedBy: 'arthur@seido.pm'
  },

  invitation_expired: {
    id: 'inv-003',
    contactId: 'contact-prop-002',
    contactEmail: 'michel.dubois@example.com',
    status: 'expired',
    token: 'test-token-expired-ghi789',
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // -1 jour (expiré)
    sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // -8 jours
    teamId: 'team-gestionnaire',
    invitedBy: 'arthur@seido.pm',
    metadata: {
      reminderCount: 2,
      lastReminderAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  },

  invitation_cancelled: {
    id: 'inv-004',
    contactId: 'contact-prest-003',
    contactEmail: 'chauffage.expert@example.com',
    status: 'cancelled',
    token: 'test-token-cancelled-jkl012',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // -4 jours
    cancelledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // -1 jour
    teamId: 'team-gestionnaire',
    invitedBy: 'arthur@seido.pm'
  }
}

/**
 * Scénarios de test pour contacts
 */
export const CONTACT_TEST_SCENARIOS = {
  // Création de contact avec invitation
  CREATE_WITH_INVITE: {
    name: 'create_contact_with_invitation',
    description: 'Créer un nouveau contact et envoyer invitation',
    contact: {
      email: 'nouveau.locataire@example.com',
      firstName: 'Nouveau',
      lastName: 'Locataire',
      type: 'locataire' as ContactType,
      phone: '+33656789012'
    },
    shouldSendInvitation: true,
    expectedOutcome: {
      contactCreated: true,
      invitationSent: true,
      statusBadgeVisible: true
    }
  },

  // Import contacts en masse
  BULK_IMPORT: {
    name: 'bulk_contact_import',
    description: 'Importer plusieurs contacts simultanément',
    contacts: [
      {
        email: 'bulk1@example.com',
        firstName: 'Bulk',
        lastName: 'Contact1',
        type: 'locataire' as ContactType
      },
      {
        email: 'bulk2@example.com',
        firstName: 'Bulk',
        lastName: 'Contact2',
        type: 'locataire' as ContactType
      }
    ],
    expectedCount: 2
  },

  // Recherche et filtrage
  SEARCH_AND_FILTER: {
    name: 'search_filter_contacts',
    description: 'Rechercher et filtrer la liste de contacts',
    testCases: [
      {
        filterType: 'type',
        filterValue: 'prestataire',
        expectedMinResults: 2
      },
      {
        filterType: 'search',
        filterValue: 'plombier',
        expectedMinResults: 1
      },
      {
        filterType: 'invitation_status',
        filterValue: 'pending',
        expectedMinResults: 1
      }
    ]
  },

  // Gestion invitations
  INVITATION_MANAGEMENT: {
    name: 'invitation_lifecycle_management',
    description: 'Gestion complète du cycle de vie des invitations',
    steps: [
      { action: 'send_invitation', contactEmail: 'marie.martin@example.com' },
      { action: 'check_status', expectedStatus: 'pending' },
      { action: 'resend_reminder', expectedReminderCount: 1 },
      { action: 'cancel_invitation', expectedStatus: 'cancelled' }
    ]
  }
}

/**
 * Manager pour la gestion des contacts de test
 */
export class TestContactManager {
  /**
   * Générer un nouveau contact de test avec données randomisées
   */
  static generateContact(override: Partial<TestContact> = {}): TestContact {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 6)

    return {
      email: `test-contact-${timestamp}-${random}@example.com`,
      firstName: `TestFirstName${random}`,
      lastName: `TestLastName${random}`,
      type: 'locataire',
      phone: `+336${random}${timestamp.toString().slice(-6)}`,
      invitationSent: false,
      testContext: {
        description: 'Auto-generated test contact',
        useCase: ['automated-test'],
        priority: 'low'
      },
      ...override
    }
  }

  /**
   * Obtenir tous les contacts d'un type spécifique
   */
  static getContactsByType(type: ContactType): TestContact[] {
    return Object.values(TEST_CONTACTS).filter(contact => contact.type === type)
  }

  /**
   * Obtenir contacts avec invitation envoyée
   */
  static getContactsWithInvitation(): TestContact[] {
    return Object.values(TEST_CONTACTS).filter(contact => contact.invitationSent === true)
  }

  /**
   * Obtenir contacts sans invitation
   */
  static getContactsWithoutInvitation(): TestContact[] {
    return Object.values(TEST_CONTACTS).filter(contact => contact.invitationSent === false)
  }

  /**
   * Obtenir prestataires par spécialité
   */
  static getProvidersBySpeciality(speciality: TestContact['speciality']): TestContact[] {
    return Object.values(TEST_CONTACTS).filter(
      contact => contact.type === 'prestataire' && contact.speciality === speciality
    )
  }

  /**
   * Obtenir invitations par statut
   */
  static getInvitationsByStatus(status: InvitationStatus): TestContactInvitation[] {
    return Object.values(TEST_INVITATIONS).filter(inv => inv.status === status)
  }

  /**
   * Valider données contact
   */
  static validateContact(contact: Partial<TestContact>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Email obligatoire et format valide
    if (!contact.email) {
      errors.push('Email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      errors.push('Email format is invalid')
    }

    // Prénom et nom obligatoires
    if (!contact.firstName || contact.firstName.length < 2) {
      errors.push('FirstName must be at least 2 characters')
    }

    if (!contact.lastName || contact.lastName.length < 2) {
      errors.push('LastName must be at least 2 characters')
    }

    // Type obligatoire
    if (!contact.type) {
      errors.push('Contact type is required')
    }

    // Validation spécifique prestataire
    if (contact.type === 'prestataire') {
      if (!contact.speciality) {
        errors.push('Speciality is required for prestataire')
      }
      if (contact.companyName && contact.companyName.length < 3) {
        errors.push('CompanyName must be at least 3 characters')
      }
    }

    // Validation téléphone si fourni
    if (contact.phone && !/^\+?\d{10,15}$/.test(contact.phone.replace(/\s/g, ''))) {
      errors.push('Phone format is invalid')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Créer une invitation de test
   */
  static generateInvitation(
    contactId: string,
    contactEmail: string,
    override: Partial<TestContactInvitation> = {}
  ): TestContactInvitation {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)

    return {
      id: `inv-${timestamp}-${random}`,
      contactId,
      contactEmail,
      status: 'pending',
      token: `test-token-${timestamp}-${random}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
      sentAt: new Date(),
      teamId: 'team-gestionnaire',
      invitedBy: 'arthur@seido.pm',
      metadata: {
        reminderCount: 0
      },
      ...override
    }
  }
}

/**
 * Validation globale des fixtures contacts
 */
export function validateContactFixtures(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Vérifier emails uniques
  const emails = Object.values(TEST_CONTACTS).map(c => c.email)
  const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate contact emails: ${duplicates.join(', ')}`)
  }

  // Vérifier que chaque type a au moins un contact
  const types: ContactType[] = ['locataire', 'proprietaire', 'prestataire']
  for (const type of types) {
    const contactsOfType = TestContactManager.getContactsByType(type)
    if (contactsOfType.length === 0) {
      warnings.push(`No contacts of type '${type}' defined`)
    }
  }

  // Vérifier cohérence invitations
  for (const invitation of Object.values(TEST_INVITATIONS)) {
    // Vérifier que le contact existe
    const contactExists = Object.values(TEST_CONTACTS).some(
      c => c.id === invitation.contactId || c.email === invitation.contactEmail
    )
    if (!contactExists) {
      errors.push(
        `Invitation ${invitation.id} references non-existent contact ${invitation.contactId}`
      )
    }

    // Vérifier dates cohérentes
    if (invitation.acceptedAt && invitation.acceptedAt < invitation.sentAt) {
      errors.push(`Invitation ${invitation.id} has acceptedAt before sentAt`)
    }

    if (invitation.cancelledAt && invitation.cancelledAt < invitation.sentAt) {
      errors.push(`Invitation ${invitation.id} has cancelledAt before sentAt`)
    }
  }

  // Valider chaque contact
  for (const [key, contact] of Object.entries(TEST_CONTACTS)) {
    const validation = TestContactManager.validateContact(contact)
    if (!validation.valid) {
      errors.push(`Contact ${key} validation failed: ${validation.errors.join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}