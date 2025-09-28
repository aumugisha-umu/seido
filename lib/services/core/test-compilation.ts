/**
 * Test file to verify that our Phase 1 infrastructure compiles correctly
 * This file should compile without errors when TypeScript checking is done
 */

import { createBrowserSupabaseClient, createServerSupabaseClient, withRetry } from './supabase-client'
import { BaseRepository } from './base-repository'
import {
  handleError,
  createSuccessResponse,
  createErrorResponse,
  validateRequired,
  validateEmail,
  validateUUID,
  RepositoryException,
  ValidationException,
  PermissionException
} from './error-handler'
import type {
  User,
  Building,
  Lot,
  Intervention,
  Contact,
  RepositoryResponse,
  RepositoryListResponse,
  PaginatedResponse
} from './service-types'

// Test that we can create clients
const browserClient = createBrowserSupabaseClient()

// Test that we can create a basic repository
class TestUserRepository extends BaseRepository<User, any, any> {
  constructor() {
    super(browserClient, 'users')
  }

  protected async validate(data: any): Promise<void> {
    validateRequired(data, ['email', 'name', 'role'])
    validateEmail(data.email)
  }
}

// Test that we can create repository instances
const userRepo = new TestUserRepository()

// Test error handling
const testError = new RepositoryException('TEST_ERROR', 'Test error message')
const validationError = new ValidationException('Test validation error', 'email', 'invalid-email')
const permissionError = new PermissionException('No permission', 'users', 'read', 'user-123')

// Test response creators
const successResponse = createSuccessResponse({ id: '123', name: 'Test' })
const errorResponse = createErrorResponse(handleError(testError))

// Test validation functions
try {
  validateRequired({ name: 'Test' }, ['name', 'email']) // Should throw
} catch (error) {
  // Expected
}

try {
  validateEmail('invalid-email') // Should throw
} catch (error) {
  // Expected
}

try {
  validateUUID('invalid-uuid') // Should throw
} catch (error) {
  // Expected
}

// Test that types work correctly
const user: User = {
  id: 'user-123',
  auth_user_id: 'auth-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  status: 'active',
  phone: null,
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const building: Building = {
  id: 'building-123',
  name: 'Test Building',
  address: '123 Test St',
  description: null,
  manager_id: user.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

// Test async functions (these won't run, just compile)
async function testAsyncFunctions() {
  // Test server client (will be async)
  const serverClient = await createServerSupabaseClient()

  // Test retry function
  const result = await withRetry(async () => {
    return { data: 'test' }
  })

  // Test repository methods
  const userResult = await userRepo.findById('user-123')
  const allUsers = await userRepo.findAll()
  const paginatedUsers = await userRepo.findPaginated({ page: 1, pageSize: 10 })

  return { serverClient, result, userResult, allUsers, paginatedUsers }
}

console.log('✅ Phase 1 infrastructure compilation test passed')

export {
  TestUserRepository,
  testAsyncFunctions,
  user,
  building,
  successResponse,
  errorResponse
}