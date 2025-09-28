/**
 * Services Index - Unified exports for the refactored database service
 *
 * This file provides a single entry point for all services, repositories,
 * and utilities in the new architecture.
 */

// Core infrastructure exports
export {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  supabase, // Legacy compatibility
  withRetry,
  getCurrentUserId,
  isAuthenticated
} from './core/supabase-client'

export type {
  SupabaseClient,
  ServerSupabaseClient,
  Database
} from './core/supabase-client'

// Service types exports
export type {
  // Base database types
  User,
  UserInsert,
  UserUpdate,
  Building,
  BuildingInsert,
  BuildingUpdate,
  Lot,
  LotInsert,
  LotUpdate,
  Intervention,
  InterventionInsert,
  InterventionUpdate,
  Contact,
  ContactInsert,
  ContactUpdate,
  Team,
  TeamMember,

  // Repository response types
  RepositoryResponse,
  RepositoryListResponse,
  RepositoryError,
  PaginatedResponse,

  // Query and filter types
  QueryOptions,
  FilterOptions,
  PaginationOptions,
  CacheOptions,
  ServiceOptions,

  // DTOs
  CreateUserDTO,
  UpdateUserDTO,
  CreateBuildingDTO,
  UpdateBuildingDTO,
  CreateLotDTO,
  UpdateLotDTO,
  CreateInterventionDTO,
  UpdateInterventionDTO,
  CreateContactDTO,
  UpdateContactDTO,

  // Relations
  UserWithRelations,
  BuildingWithRelations,
  LotWithRelations,
  InterventionWithRelations,
  ContactWithRelations,

  // Stats
  DashboardStats,
  UserStats,

  // Utility types
  TableName,
  TableRow,
  TableInsert,
  TableUpdate,
  CrudOperation,
  Permission,
  ValidationResult,
  AuditLog,
  RealtimeSubscription
} from './core/service-types'

// Error handling exports
export {
  // Custom error classes
  RepositoryException,
  ValidationException,
  PermissionException,
  NotFoundException,
  ConflictException,

  // Error handling utilities
  transformSupabaseError,
  transformError,
  handleError,
  createSuccessResponse,
  createErrorResponse,
  withRetry as withErrorRetry,

  // Validation utilities
  validateRequired,
  validateEmail,
  validateUUID,

  // Error codes
  ERROR_CODES
} from './core/error-handler'

// Base repository export
export { BaseRepository } from './core/base-repository'

// Phase 2: Core Services Exports
// User Service
export {
  UserRepository,
  createUserRepository,
  createServerUserRepository
} from './repositories/user.repository'

export {
  UserService,
  createUserService,
  createServerUserService
} from './domain/user.service'

// Building Service
export {
  BuildingRepository,
  createBuildingRepository,
  createServerBuildingRepository
} from './repositories/building.repository'

export {
  BuildingService,
  createBuildingService,
  createServerBuildingService
} from './domain/building.service'

// Lot Service
export {
  LotRepository,
  createLotRepository,
  createServerLotRepository
} from './repositories/lot.repository'

export {
  LotService,
  createLotService,
  createServerLotService
} from './domain/lot.service'

// Test utilities (for development and testing)
export {
  // Mock utilities
  mockSupabaseClient,
  createMockUser,
  createMockBuilding,
  createMockLot,
  createMockIntervention,
  createMockContact,
  mockSupabaseError,
  mockRepositoryError
} from './__tests__/setup'

export {
  // Test data factories
  UserTestDataFactory,
  BuildingTestDataFactory,
  LotTestDataFactory,
  InterventionTestDataFactory,
  ContactTestDataFactory,
  TeamTestDataFactory,
  TeamMemberTestDataFactory,
  ScenarioFactory,
  TestValidationHelpers
} from './__tests__/helpers/test-data'

export type {
  MockUser,
  MockBuilding,
  MockLot,
  MockIntervention,
  MockContact
} from './__tests__/setup'

// Legacy compatibility exports
// These will be removed after migration is complete
export type {
  User as LegacyUser,
  Building as LegacyBuilding,
  Lot as LegacyLot,
  Intervention as LegacyIntervention,
  Contact as LegacyContact
} from './core/service-types'

/**
 * Service status and configuration
 */
export const SERVICE_CONFIG = {
  version: '2.0.0',
  phase: 'infrastructure', // Current phase: infrastructure, migration, production
  features: {
    newArchitecture: true,
    legacyCompatibility: true,
    caching: true,
    errorHandling: true,
    validation: true,
    testing: true
  },
  repositories: {
    // Will be populated as repositories are implemented
    user: true, // ✅ Phase 2.1 completed
    building: true, // ✅ Phase 2.2 completed
    lot: true, // ✅ Phase 2.3 completed
    intervention: false,
    contact: false,
    team: false,
    stats: false,
    composite: false
  }
} as const

/**
 * Migration utilities
 */
export const MIGRATION_UTILS = {
  /**
   * Check if new architecture is available
   */
  isNewArchitectureReady(): boolean {
    return SERVICE_CONFIG.features.newArchitecture
  },

  /**
   * Check if legacy compatibility is enabled
   */
  isLegacyCompatibilityEnabled(): boolean {
    return SERVICE_CONFIG.features.legacyCompatibility
  },

  /**
   * Get current phase
   */
  getCurrentPhase(): string {
    return SERVICE_CONFIG.phase
  },

  /**
   * Check if repository is implemented
   */
  isRepositoryReady(repository: keyof typeof SERVICE_CONFIG.repositories): boolean {
    return SERVICE_CONFIG.repositories[repository]
  }
}

/**
 * Development utilities
 */
export const DEV_UTILS = {
  /**
   * Enable debug logging for services
   */
  enableDebugLogging(): void {
    if (typeof window !== 'undefined') {
      (window as any).__SEIDO_DEBUG__ = true
    }
  },

  /**
   * Disable debug logging for services
   */
  disableDebugLogging(): void {
    if (typeof window !== 'undefined') {
      (window as any).__SEIDO_DEBUG__ = false
    }
  },

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled(): boolean {
    if (typeof window !== 'undefined') {
      return !!(window as any).__SEIDO_DEBUG__
    }
    return false
  }
}