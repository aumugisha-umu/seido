/**
 * Services Index - Unified exports for the refactored database service
 *
 * This file provides a single entry point for all services, repositories,
 * and utilities in the new architecture.
 */

// Core infrastructure exports
export {
  createBrowserSupabaseClient,
  createServerSupabaseClient, // Read-only for Server Components
  createServerActionSupabaseClient, // Read-write for Server Actions
  supabase, // Legacy compatibility
  withRetry,
  getCurrentUserId,
  isAuthenticated,
  getServerSession
} from './core/supabase-client'

export type {
  SupabaseClient,
  ServerSupabaseClient,
  Database
} from './core/supabase-client'

// ✅ NEW: Centralized Server Context Management (Next.js 15 + React 19)
// Recommended approach for Server Components and Server Actions
export {
  getServerAuthContext,         // For Server Components (READ-ONLY)
  getServerActionAuthContext,   // For Server Actions (READ-WRITE)
  getServerUser                 // Lightweight auth check without teams
} from '../server-context'

export type {
  ServerAuthContext,            // Context type for Server Components
  ServerActionAuthContext       // Context type for Server Actions
} from '../server-context'

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

// Type guards for repository responses
export {
  isSuccessResponse,
  isErrorResponse,
  isSuccessListResponse,
  isErrorListResponse,
  assertSuccessResponse,
  extractData,
  extractListData
} from './core/type-guards'

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
  createServerUserService,
  createServerActionUserService
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
  createServerBuildingService,
  createServerActionBuildingService
} from './domain/building.service'

// Lot Service
export {
  LotRepository,
  createLotRepository,
  createServerLotRepository
} from './repositories/lot.repository'

export {
  LotContactRepository,
  createLotContactRepository,
  createServerLotContactRepository,
  type LotContact,
  type LotContactInsert,
  type LotContactUpdate,
  type LotContactWithUser
} from './repositories/lot-contact.repository'

export {
  LotService,
  createLotService,
  createServerLotService,
  createServerActionLotService // For Server Actions (READ-WRITE)
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
  createContactService as createBrowserContactService, // Alias for client-side usage
  createServerContactService,
  createServerActionContactService // For Server Actions (READ-WRITE)
} from './domain/contact.service'

// Intervention Service (Phase 3 - Enhanced)
export {
  InterventionRepository,
  createInterventionRepository,
  createServerInterventionRepository,
  createServerActionInterventionRepository
} from './repositories/intervention.repository'

// Enhanced Intervention Service with full Phase 3 workflow
export {
  InterventionService,
  createInterventionService,
  createInterventionService as createBrowserInterventionService, // Alias for client-side usage
  createServerInterventionService,
  createServerActionInterventionService
} from './domain/intervention-service'

// Conversation Service (Phase 3 - New)
export {
  ConversationService,
  createConversationService,
  createConversationService as createBrowserConversationService, // Alias for client-side usage
  createServerConversationService,
  createServerActionConversationService
} from './domain/conversation-service'

// Phase 3 New Repositories
// Conversation Repository
export {
  ConversationRepository,
  createConversationRepository,
  createServerConversationRepository,
  createServerActionConversationRepository
} from './repositories/conversation-repository'

// Quote Repository
export {
  QuoteRepository,
  createQuoteRepository,
  createServerQuoteRepository,
  createServerActionQuoteRepository
} from './repositories/quote-repository'

// Notification Repository
export {
  NotificationRepository,
  createNotificationRepository,
  createServerNotificationRepository,
  createServerActionNotificationRepository
} from './repositories/notification-repository'

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
  createServerActionTeamService,
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
  createServerActionStatsService,
  type StatsQueryOptions,
  type StatsPermissions,
  type StatsExport
} from './domain/stats.service'

// Composite Service
export {
  CompositeService,
  createCompositeService,
  createServerCompositeService,
  createServerActionCompositeService, // For Server Actions (READ-WRITE)
  type CreateCompleteUserData,
  type CreateCompleteBuildingData,
  type CreateCompletePropertyData, // Building creation wizard type
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

// Property Document Service (Phase 2)
export {
  createPropertyDocumentService
} from './domain/property-document.service'

// Storage Service (Phase 2)
export {
  createStorageService
} from './domain/storage.service'

// Contract Service (Phase 4 - Contracts/Baux)
export {
  ContractRepository,
  ContractContactRepository,
  ContractDocumentRepository,
  createContractRepository,
  createContractContactRepository,
  createContractDocumentRepository,
  createServerContractRepository,
  createServerContractContactRepository,
  createServerContractDocumentRepository,
  createServerActionContractRepository,
  createServerActionContractContactRepository,
  createServerActionContractDocumentRepository
} from './repositories/contract.repository'

export {
  ContractService,
  createContractService,
  createServerContractService,
  createServerActionContractService
} from './domain/contract.service'

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
    intervention: true, // ✅ Phase 3.3 completed (enhanced with full workflow)
    conversation: true, // ✅ Phase 3 completed (with team transparency)
    quote: true, // ✅ Phase 3 completed
    notification: true, // ✅ Phase 3 completed
    team: true, // ✅ Phase 3.2 completed
    stats: true, // ✅ Phase 4.1 completed
    composite: true, // ✅ Phase 4.2 completed
    contactInvitation: true, // ✅ Phase 5.1 completed
    tenant: true, // ✅ Phase 5.1 completed
    contract: true // ✅ Phase 4 Contracts completed
  },
  services: {
    user: true,
    building: true,
    lot: true,
    contact: true,
    intervention: true, // ✅ Enhanced with 11 status workflow
    conversation: true, // ✅ New service with real-time messaging
    team: true,
    stats: true,
    composite: true,
    contactInvitation: true,
    tenant: true,
    contract: true // ✅ Phase 4 Contracts service
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
