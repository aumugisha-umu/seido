/**
 * Test Fixtures - Buildings & Lots (Phase 2)
 *
 * Données de test pour les bâtiments et lots dans SEIDO
 * Suit les patterns validés en Phase 1
 */

// ============================================
// Types & Interfaces
// ============================================

export interface TestAddress {
  street: string
  city: string
  postalCode: string
  country: string
  complement?: string
}

export interface TestBuilding {
  id: string
  name: string
  address: TestAddress
  teamId: string
  managerId?: string
  totalLots: number
  constructionYear?: number
  type: 'residential' | 'commercial' | 'mixed'
  status: 'active' | 'maintenance' | 'inactive'
  testContext?: {
    description: string
    useCase: string[]
    priority: 'high' | 'medium' | 'low'
  }
}

export interface TestLot {
  id: string
  buildingId: string
  number: string
  floor: number
  tenantId?: string
  tenantEmail?: string
  surface: number // m²
  rooms: number
  rent?: number // € per month
  charges?: number // € per month
  occupancyStatus: 'occupied' | 'vacant' | 'maintenance' | 'reserved'
  type: 'apartment' | 'studio' | 'house' | 'parking' | 'storage'
  testContext?: {
    description: string
    useCase: string[]
  }
}

export interface BuildingWithLots extends TestBuilding {
  lots: TestLot[]
}

// ============================================
// Test Addresses
// ============================================

export const TEST_ADDRESSES: Record<string, TestAddress> = {
  paris15: {
    street: '12 Rue de la Convention',
    city: 'Paris',
    postalCode: '75015',
    country: 'France'
  },

  lyon3: {
    street: '45 Rue Paul Bert',
    city: 'Lyon',
    postalCode: '69003',
    country: 'France'
  },

  marseille8: {
    street: '78 Avenue du Prado',
    city: 'Marseille',
    postalCode: '13008',
    country: 'France'
  },

  toulouse1: {
    street: '23 Place du Capitole',
    city: 'Toulouse',
    postalCode: '31000',
    country: 'France'
  },

  bordeaux2: {
    street: '56 Cours de l\'Intendance',
    city: 'Bordeaux',
    postalCode: '33000',
    country: 'France'
  }
}

// ============================================
// Test Buildings (3-5 bâtiments variés)
// ============================================

export const TEST_BUILDINGS: Record<string, TestBuilding> = {
  // Bâtiment résidentiel standard
  residenceConvention: {
    id: 'building-test-001',
    name: 'Résidence Convention',
    address: TEST_ADDRESSES.paris15,
    teamId: 'team-test-001',
    managerId: 'user-gestionnaire-001',
    totalLots: 12,
    constructionYear: 1985,
    type: 'residential',
    status: 'active',
    testContext: {
      description: 'Bâtiment résidentiel standard avec 12 lots variés',
      useCase: ['crud-operations', 'lot-management', 'tenant-assignment'],
      priority: 'high'
    }
  },

  // Bâtiment commercial
  commercePaulBert: {
    id: 'building-test-002',
    name: 'Centre Commercial Paul Bert',
    address: TEST_ADDRESSES.lyon3,
    teamId: 'team-test-001',
    managerId: 'user-gestionnaire-001',
    totalLots: 8,
    constructionYear: 2010,
    type: 'commercial',
    status: 'active',
    testContext: {
      description: 'Bâtiment commercial avec boutiques et bureaux',
      useCase: ['commercial-management', 'mixed-occupancy'],
      priority: 'medium'
    }
  },

  // Bâtiment mixte
  residencePrado: {
    id: 'building-test-003',
    name: 'Résidence du Prado',
    address: TEST_ADDRESSES.marseille8,
    teamId: 'team-test-001',
    managerId: 'user-gestionnaire-002',
    totalLots: 15,
    constructionYear: 2005,
    type: 'mixed',
    status: 'active',
    testContext: {
      description: 'Bâtiment mixte résidentiel/commercial',
      useCase: ['multi-manager', 'complex-management'],
      priority: 'high'
    }
  },

  // Bâtiment en maintenance
  tourCapitole: {
    id: 'building-test-004',
    name: 'Tour du Capitole',
    address: TEST_ADDRESSES.toulouse1,
    teamId: 'team-test-002',
    managerId: 'user-gestionnaire-002',
    totalLots: 20,
    constructionYear: 1975,
    type: 'residential',
    status: 'maintenance',
    testContext: {
      description: 'Bâtiment ancien en cours de rénovation',
      useCase: ['maintenance-workflow', 'status-change'],
      priority: 'medium'
    }
  },

  // Petit bâtiment pour tests vide
  maisonBordeaux: {
    id: 'building-test-005',
    name: 'Maison Intendance',
    address: TEST_ADDRESSES.bordeaux2,
    teamId: 'team-test-002',
    totalLots: 3,
    constructionYear: 1920,
    type: 'residential',
    status: 'active',
    testContext: {
      description: 'Petit bâtiment pour tests état vide',
      useCase: ['small-building', 'empty-state'],
      priority: 'low'
    }
  }
}

// Alias for cleaner imports (matches users.fixture pattern)
export const BUILDINGS = TEST_BUILDINGS

// ============================================
// Test Lots (10-15 lots variés)
// ============================================

export const TEST_LOTS: Record<string, TestLot> = {
  // Lots Résidence Convention (building-test-001)
  lot1A: {
    id: 'lot-test-001',
    buildingId: 'building-test-001',
    number: '1A',
    floor: 1,
    tenantId: 'user-locataire-001',
    tenantEmail: 'jean.dupont@example.com',
    surface: 45,
    rooms: 2,
    rent: 850,
    charges: 120,
    occupancyStatus: 'occupied',
    type: 'apartment',
    testContext: {
      description: 'Appartement 2 pièces occupé - locataire actif',
      useCase: ['occupied-lot', 'rent-management']
    }
  },

  lot2B: {
    id: 'lot-test-002',
    buildingId: 'building-test-001',
    number: '2B',
    floor: 2,
    surface: 62,
    rooms: 3,
    rent: 1100,
    charges: 150,
    occupancyStatus: 'vacant',
    type: 'apartment',
    testContext: {
      description: 'Appartement 3 pièces vacant - disponible location',
      useCase: ['vacant-lot', 'tenant-assignment']
    }
  },

  lot3C: {
    id: 'lot-test-003',
    buildingId: 'building-test-001',
    number: '3C',
    floor: 3,
    tenantId: 'user-locataire-002',
    tenantEmail: 'marie.martin@example.com',
    surface: 38,
    rooms: 1,
    rent: 720,
    charges: 100,
    occupancyStatus: 'occupied',
    type: 'studio',
    testContext: {
      description: 'Studio occupé - locataire récent',
      useCase: ['studio-management', 'small-unit']
    }
  },

  parking1: {
    id: 'lot-test-004',
    buildingId: 'building-test-001',
    number: 'P1',
    floor: -1,
    tenantId: 'user-locataire-001',
    tenantEmail: 'jean.dupont@example.com',
    surface: 12,
    rooms: 0,
    rent: 80,
    charges: 0,
    occupancyStatus: 'occupied',
    type: 'parking',
    testContext: {
      description: 'Place de parking associée au lot 1A',
      useCase: ['parking-management', 'linked-lot']
    }
  },

  // Lots Centre Commercial Paul Bert (building-test-002)
  boutique1: {
    id: 'lot-test-005',
    buildingId: 'building-test-002',
    number: 'B1',
    floor: 0,
    tenantId: 'user-prestataire-001',
    tenantEmail: 'commerce.pro@example.com',
    surface: 85,
    rooms: 0,
    rent: 2500,
    charges: 400,
    occupancyStatus: 'occupied',
    type: 'apartment', // Commercial use
    testContext: {
      description: 'Boutique commerciale - bail commercial',
      useCase: ['commercial-lease', 'high-rent']
    }
  },

  boutique2: {
    id: 'lot-test-006',
    buildingId: 'building-test-002',
    number: 'B2',
    floor: 0,
    surface: 65,
    rooms: 0,
    rent: 1900,
    charges: 350,
    occupancyStatus: 'vacant',
    type: 'apartment',
    testContext: {
      description: 'Boutique vacante - recherche locataire',
      useCase: ['vacant-commercial', 'lease-negotiation']
    }
  },

  // Lots Résidence du Prado (building-test-003)
  appartT4: {
    id: 'lot-test-007',
    buildingId: 'building-test-003',
    number: '4A',
    floor: 4,
    tenantId: 'user-locataire-003',
    tenantEmail: 'pierre.durand@example.com',
    surface: 95,
    rooms: 4,
    rent: 1650,
    charges: 220,
    occupancyStatus: 'occupied',
    type: 'apartment',
    testContext: {
      description: 'Grand appartement familial T4',
      useCase: ['large-unit', 'family-housing']
    }
  },

  appartT2Prado: {
    id: 'lot-test-008',
    buildingId: 'building-test-003',
    number: '2C',
    floor: 2,
    surface: 52,
    rooms: 2,
    rent: 980,
    charges: 140,
    occupancyStatus: 'maintenance',
    type: 'apartment',
    testContext: {
      description: 'Appartement en travaux - temporairement indisponible',
      useCase: ['maintenance-status', 'renovation']
    }
  },

  // Lots Tour du Capitole (building-test-004) - Maintenance
  lotMaintenanceA: {
    id: 'lot-test-009',
    buildingId: 'building-test-004',
    number: '10A',
    floor: 10,
    surface: 70,
    rooms: 3,
    rent: 1200,
    charges: 180,
    occupancyStatus: 'maintenance',
    type: 'apartment',
    testContext: {
      description: 'Lot en rénovation complète',
      useCase: ['heavy-maintenance', 'building-renovation']
    }
  },

  lotReserved: {
    id: 'lot-test-010',
    buildingId: 'building-test-004',
    number: '12B',
    floor: 12,
    surface: 55,
    rooms: 2,
    rent: 950,
    charges: 150,
    occupancyStatus: 'reserved',
    type: 'apartment',
    testContext: {
      description: 'Lot réservé pour futur locataire',
      useCase: ['reservation', 'pre-lease']
    }
  },

  // Lots Maison Bordeaux (building-test-005) - Petit bâtiment
  maisonRDC: {
    id: 'lot-test-011',
    buildingId: 'building-test-005',
    number: 'RDC',
    floor: 0,
    surface: 120,
    rooms: 5,
    rent: 2200,
    charges: 250,
    occupancyStatus: 'vacant',
    type: 'house',
    testContext: {
      description: 'Maison individuelle - rez-de-chaussée',
      useCase: ['house-unit', 'luxury-rental']
    }
  },

  cave1: {
    id: 'lot-test-012',
    buildingId: 'building-test-005',
    number: 'C1',
    floor: -1,
    surface: 8,
    rooms: 0,
    rent: 40,
    charges: 0,
    occupancyStatus: 'vacant',
    type: 'storage',
    testContext: {
      description: 'Cave de stockage',
      useCase: ['storage-unit', 'ancillary-lot']
    }
  }
}

// Alias for cleaner imports (matches users.fixture pattern)
export const LOTS = TEST_LOTS

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a random building for testing
 */
export function generateBuilding(override?: Partial<TestBuilding>): TestBuilding {
  const randomId = `building-gen-${Date.now()}`
  const addresses = Object.values(TEST_ADDRESSES)
  const randomAddress = addresses[Math.floor(Math.random() * addresses.length)]

  return {
    id: randomId,
    name: `Bâtiment Test ${randomId.slice(-6)}`,
    address: randomAddress,
    teamId: 'team-test-001',
    totalLots: Math.floor(Math.random() * 20) + 5, // 5-25 lots
    constructionYear: Math.floor(Math.random() * 50) + 1970, // 1970-2020
    type: ['residential', 'commercial', 'mixed'][Math.floor(Math.random() * 3)] as any,
    status: 'active',
    ...override
  }
}

/**
 * Generate a random lot for testing
 */
export function generateLot(buildingId: string, override?: Partial<TestLot>): TestLot {
  const randomId = `lot-gen-${Date.now()}`
  const floor = Math.floor(Math.random() * 10) // 0-9
  const lotNumber = `${floor}${String.fromCharCode(65 + Math.floor(Math.random() * 5))}` // 0A-9E

  return {
    id: randomId,
    buildingId,
    number: lotNumber,
    floor,
    surface: Math.floor(Math.random() * 80) + 30, // 30-110 m²
    rooms: Math.floor(Math.random() * 4) + 1, // 1-5 rooms
    rent: Math.floor(Math.random() * 1500) + 500, // 500-2000€
    charges: Math.floor(Math.random() * 200) + 80, // 80-280€
    occupancyStatus: ['occupied', 'vacant', 'maintenance'][Math.floor(Math.random() * 3)] as any,
    type: 'apartment',
    ...override
  }
}

/**
 * Get all lots for a specific building
 */
export function getLotsByBuilding(buildingId: string): TestLot[] {
  return Object.values(TEST_LOTS).filter(lot => lot.buildingId === buildingId)
}

/**
 * Get building with all its lots
 */
export function getBuildingWithLots(buildingId: string): BuildingWithLots | null {
  const building = Object.values(TEST_BUILDINGS).find(b => b.id === buildingId)
  if (!building) return null

  return {
    ...building,
    lots: getLotsByBuilding(buildingId)
  }
}

/**
 * Get occupied lots count for a building
 */
export function getOccupiedLotsCount(buildingId: string): number {
  return getLotsByBuilding(buildingId).filter(lot => lot.occupancyStatus === 'occupied').length
}

/**
 * Get vacant lots for a building
 */
export function getVacantLots(buildingId: string): TestLot[] {
  return getLotsByBuilding(buildingId).filter(lot => lot.occupancyStatus === 'vacant')
}

/**
 * Calculate occupancy rate for a building
 */
export function calculateOccupancyRate(buildingId: string): number {
  const lots = getLotsByBuilding(buildingId)
  if (lots.length === 0) return 0

  const occupied = lots.filter(lot => lot.occupancyStatus === 'occupied').length
  return Math.round((occupied / lots.length) * 100)
}

/**
 * Validate building data
 */
export function validateBuildingData(building: Partial<TestBuilding>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!building.name || building.name.trim().length < 3) {
    errors.push('Building name must be at least 3 characters')
  }

  if (!building.address?.street) {
    errors.push('Building must have a street address')
  }

  if (!building.address?.city) {
    errors.push('Building must have a city')
  }

  if (!building.address?.postalCode || !/^\d{5}$/.test(building.address.postalCode)) {
    errors.push('Building must have a valid 5-digit postal code')
  }

  if (!building.teamId) {
    errors.push('Building must be assigned to a team')
  }

  if (building.totalLots !== undefined && building.totalLots < 0) {
    errors.push('Total lots cannot be negative')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate lot data
 */
export function validateLotData(lot: Partial<TestLot>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!lot.buildingId) {
    errors.push('Lot must be assigned to a building')
  }

  if (!lot.number || lot.number.trim().length === 0) {
    errors.push('Lot must have a number')
  }

  if (lot.surface !== undefined && lot.surface <= 0) {
    errors.push('Lot surface must be positive')
  }

  if (lot.rooms !== undefined && lot.rooms < 0) {
    errors.push('Rooms count cannot be negative')
  }

  if (lot.rent !== undefined && lot.rent < 0) {
    errors.push('Rent cannot be negative')
  }

  if (lot.occupancyStatus === 'occupied' && !lot.tenantId) {
    errors.push('Occupied lot must have a tenant')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================
// Summary Statistics
// ============================================

export const BUILDINGS_STATS = {
  total: Object.keys(TEST_BUILDINGS).length,
  byType: {
    residential: Object.values(TEST_BUILDINGS).filter(b => b.type === 'residential').length,
    commercial: Object.values(TEST_BUILDINGS).filter(b => b.type === 'commercial').length,
    mixed: Object.values(TEST_BUILDINGS).filter(b => b.type === 'mixed').length
  },
  byStatus: {
    active: Object.values(TEST_BUILDINGS).filter(b => b.status === 'active').length,
    maintenance: Object.values(TEST_BUILDINGS).filter(b => b.status === 'maintenance').length,
    inactive: Object.values(TEST_BUILDINGS).filter(b => b.status === 'inactive').length
  }
}

export const LOTS_STATS = {
  total: Object.keys(TEST_LOTS).length,
  byOccupancy: {
    occupied: Object.values(TEST_LOTS).filter(l => l.occupancyStatus === 'occupied').length,
    vacant: Object.values(TEST_LOTS).filter(l => l.occupancyStatus === 'vacant').length,
    maintenance: Object.values(TEST_LOTS).filter(l => l.occupancyStatus === 'maintenance').length,
    reserved: Object.values(TEST_LOTS).filter(l => l.occupancyStatus === 'reserved').length
  },
  byType: {
    apartment: Object.values(TEST_LOTS).filter(l => l.type === 'apartment').length,
    studio: Object.values(TEST_LOTS).filter(l => l.type === 'studio').length,
    house: Object.values(TEST_LOTS).filter(l => l.type === 'house').length,
    parking: Object.values(TEST_LOTS).filter(l => l.type === 'parking').length,
    storage: Object.values(TEST_LOTS).filter(l => l.type === 'storage').length
  }
}
