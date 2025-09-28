import type {
  User,
  Building,
  Lot,
  Intervention,
  Contact,
  Team,
  TeamMember,
  CreateUserDTO,
  CreateBuildingDTO,
  CreateLotDTO,
  CreateInterventionDTO,
  CreateContactDTO
} from '../../core/service-types'

/**
 * Factory functions for creating test data
 * These functions generate realistic test data with proper relationships
 */

// Counter to ensure unique IDs
let idCounter = 1000

function generateId(): string {
  return `test-${idCounter++}`
}

function generateEmail(): string {
  return `user${idCounter}@test.com`
}

/**
 * User test data factory
 */
export class UserTestDataFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: generateId(),
      auth_user_id: generateId(),
      email: generateEmail(),
      name: 'Test User',
      role: 'admin',
      status: 'active',
      phone: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'admin',
      name: 'Admin User',
      ...overrides
    })
  }

  static createManager(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'gestionnaire',
      name: 'Manager User',
      ...overrides
    })
  }

  static createProvider(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'prestataire',
      name: 'Provider User',
      ...overrides
    })
  }

  static createTenant(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'locataire',
      name: 'Tenant User',
      ...overrides
    })
  }

  static createMultiple(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides))
  }

  static createDTO(overrides: Partial<CreateUserDTO> = {}): CreateUserDTO {
    return {
      email: generateEmail(),
      name: 'Test User',
      role: 'admin',
      ...overrides
    }
  }
}

/**
 * Building test data factory
 */
export class BuildingTestDataFactory {
  static create(overrides: Partial<Building> = {}): Building {
    return {
      id: generateId(),
      name: 'Test Building',
      address: '123 Test Street',
      city: 'Test City',
      postal_code: '12345',
      team_id: generateId(), // Always include team_id for testing
      total_lots: 0,
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  static createWithManager(manager: User, overrides: Partial<Building> = {}): Building {
    return this.create({
      manager_id: manager.id,
      name: `Building managed by ${manager.name}`,
      ...overrides
    })
  }

  static createMultiple(count: number, managerId?: string, overrides: Partial<Building> = {}): Building[] {
    return Array.from({ length: count }, (_, index) => this.create({
      name: `Test Building ${index + 1}`,
      manager_id: managerId || generateId(),
      ...overrides
    }))
  }

  static createDTO(overrides: Partial<CreateBuildingDTO> = {}): CreateBuildingDTO {
    return {
      name: 'Test Building',
      address: '123 Test Street, Test City',
      manager_id: generateId(),
      ...overrides
    }
  }
}

/**
 * Lot test data factory
 */
export class LotTestDataFactory {
  static create(overrides: Partial<Lot> = {}): Lot {
    return {
      id: generateId(),
      building_id: generateId(),
      reference: `A${Math.floor(Math.random() * 999) + 1}`,
      type: 'apartment',
      size: 75,
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  static createForBuilding(building: Building, overrides: Partial<Lot> = {}): Lot {
    return this.create({
      building_id: building.id,
      ...overrides
    })
  }

  static createMultiple(count: number, buildingId?: string, overrides: Partial<Lot> = {}): Lot[] {
    return Array.from({ length: count }, (_, index) => this.create({
      building_id: buildingId || generateId(),
      reference: `A${String(index + 1).padStart(3, '0')}`,
      ...overrides
    }))
  }

  static createApartment(overrides: Partial<Lot> = {}): Lot {
    return this.create({
      type: 'apartment',
      size: 75,
      ...overrides
    })
  }

  static createCommercial(overrides: Partial<Lot> = {}): Lot {
    return this.create({
      type: 'commercial',
      size: 150,
      ...overrides
    })
  }

  static createParking(overrides: Partial<Lot> = {}): Lot {
    return this.create({
      type: 'parking',
      size: 15,
      ...overrides
    })
  }

  static createDTO(overrides: Partial<CreateLotDTO> = {}): CreateLotDTO {
    return {
      building_id: generateId(),
      reference: `A${Math.floor(Math.random() * 999) + 1}`,
      type: 'apartment',
      ...overrides
    }
  }
}

/**
 * Intervention test data factory
 */
export class InterventionTestDataFactory {
  static create(overrides: Partial<Intervention> = {}): Intervention {
    return {
      id: generateId(),
      lot_id: generateId(),
      title: 'Test Intervention',
      description: 'Test intervention description',
      status: 'pending',
      priority: 'medium',
      category: 'maintenance',
      requested_by: generateId(),
      assigned_to: null,
      scheduled_date: null,
      completed_date: null,
      estimated_duration: null,
      actual_duration: null,
      notes: null,
      attachments: null,
      quote_amount: null,
      final_amount: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  static createForLot(lot: Lot, overrides: Partial<Intervention> = {}): Intervention {
    return this.create({
      lot_id: lot.id,
      title: `Intervention for lot ${lot.reference}`,
      ...overrides
    })
  }

  static createPending(overrides: Partial<Intervention> = {}): Intervention {
    return this.create({
      status: 'pending',
      ...overrides
    })
  }

  static createApproved(overrides: Partial<Intervention> = {}): Intervention {
    return this.create({
      status: 'approved',
      ...overrides
    })
  }

  static createInProgress(overrides: Partial<Intervention> = {}): Intervention {
    return this.create({
      status: 'in_progress',
      assigned_to: generateId(),
      scheduled_date: new Date().toISOString(),
      ...overrides
    })
  }

  static createCompleted(overrides: Partial<Intervention> = {}): Intervention {
    return this.create({
      status: 'completed',
      assigned_to: generateId(),
      scheduled_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      completed_date: new Date().toISOString(),
      actual_duration: 120, // 2 hours
      final_amount: 250.00,
      ...overrides
    })
  }

  static createHighPriority(overrides: Partial<Intervention> = {}): Intervention {
    return this.create({
      priority: 'high',
      title: 'Urgent Intervention',
      ...overrides
    })
  }

  static createMultiple(count: number, lotId?: string, overrides: Partial<Intervention> = {}): Intervention[] {
    return Array.from({ length: count }, (_, index) => this.create({
      lot_id: lotId || generateId(),
      title: `Test Intervention ${index + 1}`,
      ...overrides
    }))
  }

  static createDTO(overrides: Partial<CreateInterventionDTO> = {}): CreateInterventionDTO {
    return {
      lot_id: generateId(),
      title: 'Test Intervention',
      description: 'Test intervention description',
      priority: 'medium',
      category: 'maintenance',
      requested_by: generateId(),
      ...overrides
    }
  }
}

/**
 * Contact test data factory
 */
export class ContactTestDataFactory {
  static create(overrides: Partial<Contact> = {}): Contact {
    return {
      id: generateId(),
      user_id: generateId(),
      lot_id: generateId(),
      building_id: null,
      type: 'tenant',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  static createTenant(user: User, lot: Lot, overrides: Partial<Contact> = {}): Contact {
    return this.create({
      user_id: user.id,
      lot_id: lot.id,
      type: 'tenant',
      ...overrides
    })
  }

  static createOwner(user: User, lot: Lot, overrides: Partial<Contact> = {}): Contact {
    return this.create({
      user_id: user.id,
      lot_id: lot.id,
      type: 'owner',
      ...overrides
    })
  }

  static createMultiple(count: number, overrides: Partial<Contact> = {}): Contact[] {
    return Array.from({ length: count }, () => this.create(overrides))
  }

  static createDTO(overrides: Partial<CreateContactDTO> = {}): CreateContactDTO {
    return {
      user_id: generateId(),
      type: 'tenant',
      status: 'active',
      ...overrides
    }
  }
}

/**
 * Team test data factory
 */
export class TeamTestDataFactory {
  static create(overrides: Partial<Team> = {}): Team {
    return {
      id: generateId(),
      name: 'Test Team',
      description: 'Test team description',
      created_by: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  static createWithCreator(creator: User, overrides: Partial<Team> = {}): Team {
    return this.create({
      created_by: creator.id,
      name: `${creator.name}'s Team`,
      ...overrides
    })
  }
}

/**
 * Team Member test data factory
 */
export class TeamMemberTestDataFactory {
  static create(overrides: Partial<TeamMember> = {}): TeamMember {
    return {
      id: generateId(),
      team_id: generateId(),
      user_id: generateId(),
      role: 'member',
      joined_at: new Date().toISOString(),
      ...overrides
    }
  }

  static createAdmin(team: Team, user: User, overrides: Partial<TeamMember> = {}): TeamMember {
    return this.create({
      team_id: team.id,
      user_id: user.id,
      role: 'admin',
      ...overrides
    })
  }

  static createMember(team: Team, user: User, overrides: Partial<TeamMember> = {}): TeamMember {
    return this.create({
      team_id: team.id,
      user_id: user.id,
      role: 'member',
      ...overrides
    })
  }
}

/**
 * Complex scenario factories
 */
export class ScenarioFactory {
  /**
   * Creates a complete building scenario with manager, lots, tenants, and interventions
   */
  static createBuildingScenario() {
    const manager = UserTestDataFactory.createManager()
    const building = BuildingTestDataFactory.createWithManager(manager)
    const lots = LotTestDataFactory.createMultiple(3, building.id)
    const tenants = lots.map(() => UserTestDataFactory.createTenant())
    const contacts = lots.map((lot, index) =>
      ContactTestDataFactory.createTenant(tenants[index], lot)
    )
    const interventions = lots.map(lot =>
      InterventionTestDataFactory.createForLot(lot)
    )

    return {
      manager,
      building,
      lots,
      tenants,
      contacts,
      interventions
    }
  }

  /**
   * Creates a complete intervention workflow scenario
   */
  static createInterventionWorkflow() {
    const tenant = UserTestDataFactory.createTenant()
    const manager = UserTestDataFactory.createManager()
    const provider = UserTestDataFactory.createProvider()
    const building = BuildingTestDataFactory.createWithManager(manager)
    const lot = LotTestDataFactory.createForBuilding(building)
    const contact = ContactTestDataFactory.createTenant(tenant, lot)

    const pendingIntervention = InterventionTestDataFactory.createPending({
      lot_id: lot.id,
      requested_by: tenant.id
    })

    const approvedIntervention = InterventionTestDataFactory.createApproved({
      lot_id: lot.id,
      requested_by: tenant.id
    })

    const inProgressIntervention = InterventionTestDataFactory.createInProgress({
      lot_id: lot.id,
      requested_by: tenant.id,
      assigned_to: provider.id
    })

    const completedIntervention = InterventionTestDataFactory.createCompleted({
      lot_id: lot.id,
      requested_by: tenant.id,
      assigned_to: provider.id
    })

    return {
      tenant,
      manager,
      provider,
      building,
      lot,
      contact,
      interventions: {
        pending: pendingIntervention,
        approved: approvedIntervention,
        inProgress: inProgressIntervention,
        completed: completedIntervention
      }
    }
  }

  /**
   * Creates a multi-tenant building scenario
   */
  static createMultiTenantBuilding() {
    const manager = UserTestDataFactory.createManager()
    const building = BuildingTestDataFactory.createWithManager(manager)

    // Create different types of lots
    const apartmentLots = LotTestDataFactory.createMultiple(5, building.id, { type: 'apartment' })
    const commercialLots = LotTestDataFactory.createMultiple(2, building.id, { type: 'commercial' })
    const parkingLots = LotTestDataFactory.createMultiple(10, building.id, { type: 'parking' })

    const allLots = [...apartmentLots, ...commercialLots, ...parkingLots]

    // Create tenants and contacts
    const tenants = allLots.map(() => UserTestDataFactory.createTenant())
    const contacts = allLots.map((lot, index) =>
      ContactTestDataFactory.createTenant(tenants[index], lot)
    )

    // Create various interventions
    const interventions = allLots.flatMap(lot => [
      InterventionTestDataFactory.createPending({ lot_id: lot.id }),
      InterventionTestDataFactory.createCompleted({ lot_id: lot.id })
    ])

    return {
      manager,
      building,
      lots: {
        apartments: apartmentLots,
        commercial: commercialLots,
        parking: parkingLots,
        all: allLots
      },
      tenants,
      contacts,
      interventions
    }
  }
}

/**
 * Validation helpers
 */
export class TestValidationHelpers {
  static validateUser(user: User): boolean {
    return !!(user.id && user.email && user.name && user.role)
  }

  static validateBuilding(building: Building): boolean {
    return !!(building.id && building.name && building.address && building.manager_id)
  }

  static validateLot(lot: Lot): boolean {
    return !!(lot.id && lot.building_id && lot.reference && lot.type)
  }

  static validateIntervention(intervention: Intervention): boolean {
    return !!(intervention.id && intervention.lot_id && intervention.title &&
             intervention.status && intervention.priority && intervention.requested_by)
  }

  static validateContact(contact: Contact): boolean {
    return !!(contact.id && contact.user_id && contact.type && contact.status)
  }
}
