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

// Phase 3: Business Services Exports
// Contact Service
export {
  ContactRepository,
  createContactRepository,
  createServerContactRepository
} from './repositories/contact.repository'

export {
  ContactService,
  createContactService,
  createServerContactService
} from './domain/contact.service'

// Intervention Service
export {
  InterventionRepository,
  createInterventionRepository,
  createServerInterventionRepository
} from './repositories/intervention.repository'

export {
  InterventionService,
  createInterventionService,
  createInterventionService as createBrowserInterventionService, // Alias for client-side usage
  createServerInterventionService,
  type ApprovalData,
  type PlanningData,
  type ExecutionData,
  type FinalizationData,
  type TenantValidationData,
  type TenantContestData,
  type CancellationData,
  type SlotConfirmationData,
  type ProviderCompletionData
} from './domain/intervention.service'

// Team Service
export {
  TeamRepository,
  createTeamRepository,
  createServerTeamRepository,
  type TeamInsert,
  type TeamUpdate,
  type TeamMemberInsert,
  type TeamMemberUpdate,
  type TeamWithMembers
} from './repositories/team.repository'

// Team Member Repository (for multi-team support)
export {
  TeamMemberRepository,
  createTeamMemberRepository,
  createServerTeamMemberRepository,
  type TeamMember,
  type TeamMemberWithDetails,
  type UserTeamAssociation
} from './repositories/team-member.repository'

export {
  TeamService,
  createTeamService,
  createServerTeamService,
  type CreateTeamData,
  type UpdateTeamData
} from './domain/team.service'

// Phase 4: Auxiliary Services Exports
// Stats Service
export {
  StatsRepository,
  createStatsRepository,
  createServerStatsRepository,
  type ActivityStats,
  type SystemStats,
  type TeamStats,
  type UserStats,
  type DashboardStats
} from './repositories/stats.repository'

export {
  StatsService,
  createStatsService,
  createServerStatsService,
  type StatsQueryOptions,
  type StatsPermissions,
  type StatsExport
} from './domain/stats.service'

// Composite Service
export {
  CompositeService,
  createCompositeService,
  createServerCompositeService,
  type CreateCompleteUserData,
  type CreateCompleteBuildingData,
  type InviteTeamContactsData,
  type TransferLotTenantData,
  type BulkUserOperationsData,
  type CompositeStatsRequest,
  type CompositeOperationResult
} from './domain/composite.service'

// Contact Invitation Service
export {
  ContactInvitationService,
  createContactInvitationService,
  createServerContactInvitationService,
  type ContactInvitationData
} from './domain/contact-invitation.service'

// Tenant Service
export {
  TenantService,
  createTenantService,
  createServerTenantService,
  type TenantData
} from './domain/tenant.service'

// Assignment Utilities
export {
  determineAssignmentType,
  filterUsersByRole,
  validateAssignment,
  getAssignmentTypeDisplayName,
  canAssignToContext,
  getAvailableAssignmentTypes,
  mapFrontendToDbRole,
  getProviderCategories,
  type AssignmentUser
} from './utils/assignment-utils'

// Test utilities (for development and testing only)
// These exports are conditionally loaded only in test environments
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  // Note: Dynamic imports should be used for test utilities in production
  // For now, we comment these exports to prevent production build issues
  /*
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
  */
}

// Singleton service instances (for client-side usage)
// ⚠️ DISABLED: These cause circular dependency issues at module load time
// Use factory functions instead: createUserService(), createBuildingService(), etc.
// export const userService = createUserService()
// export const buildingService = createBuildingService()
// export const lotService = createLotService()
// export const contactService = createContactService()
// export const interventionService = createInterventionService()
// export const teamService = createTeamService()
// export const statsService = createStatsService()
// export const compositeService = createCompositeService()
// export const contactInvitationService = createContactInvitationService()
// export const tenantService = createTenantService()

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
    contact: true, // ✅ Phase 3.1 completed
    intervention: true, // ✅ Phase 3.3 completed
    team: true, // ✅ Phase 3.2 completed
    stats: true, // ✅ Phase 4.1 completed
    composite: true, // ✅ Phase 4.2 completed
    contactInvitation: true, // ✅ Phase 5.1 completed
    tenant: true // ✅ Phase 5.1 completed
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
      (window as unknown as { __SEIDO_DEBUG__?: boolean }).__SEIDO_DEBUG__ = true
    }
  },

  /**
   * Disable debug logging for services
   */
  disableDebugLogging(): void {
    if (typeof window !== 'undefined') {
      (window as unknown as { __SEIDO_DEBUG__?: boolean }).__SEIDO_DEBUG__ = false
    }
  },

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled(): boolean {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !!(window as any).__SEIDO_DEBUG__
    }
    return false
  }
}
