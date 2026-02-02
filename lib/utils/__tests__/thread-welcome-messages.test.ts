/**
 * Tests for Thread Welcome Messages Utility
 *
 * Validates that welcome messages are properly defined and sent
 * for each conversation thread type.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

import {
  THREAD_WELCOME_MESSAGES,
  sendThreadWelcomeMessage
} from '../thread-welcome-messages'

// Mock logger to prevent console output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('THREAD_WELCOME_MESSAGES', () => {
  it('should have a welcome message defined for "group" thread type', () => {
    expect(THREAD_WELCOME_MESSAGES.group).toBeDefined()
    expect(typeof THREAD_WELCOME_MESSAGES.group).toBe('string')
    expect(THREAD_WELCOME_MESSAGES.group.length).toBeGreaterThan(0)
  })

  it('should have a welcome message defined for "tenant_to_managers" thread type', () => {
    expect(THREAD_WELCOME_MESSAGES.tenant_to_managers).toBeDefined()
    expect(typeof THREAD_WELCOME_MESSAGES.tenant_to_managers).toBe('string')
    expect(THREAD_WELCOME_MESSAGES.tenant_to_managers.length).toBeGreaterThan(0)
  })

  it('should have a welcome message defined for "provider_to_managers" thread type', () => {
    expect(THREAD_WELCOME_MESSAGES.provider_to_managers).toBeDefined()
    expect(typeof THREAD_WELCOME_MESSAGES.provider_to_managers).toBe('string')
    expect(THREAD_WELCOME_MESSAGES.provider_to_managers.length).toBeGreaterThan(0)
  })

  it('should have privacy indicator in private thread messages', () => {
    // Private threads should mention privacy/restricted access
    expect(THREAD_WELCOME_MESSAGES.tenant_to_managers).toContain('privée')
    expect(THREAD_WELCOME_MESSAGES.provider_to_managers).toContain('privée')
  })

  it('should have group indicator in group thread message', () => {
    // Group thread should mention visibility to all
    expect(THREAD_WELCOME_MESSAGES.group).toContain('tous')
  })
})

describe('sendThreadWelcomeMessage', () => {
  let mockSupabase: SupabaseClient<Database>
  let mockInsert: ReturnType<typeof vi.fn>
  let mockFrom: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset mocks before each test
    mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

    mockSupabase = {
      from: mockFrom
    } as unknown as SupabaseClient<Database>
  })

  it('should call supabase.from with "conversation_messages"', async () => {
    const threadId = 'test-thread-id'
    const threadType = 'group'
    const userId = 'test-user-id'

    await sendThreadWelcomeMessage(mockSupabase, threadId, threadType, userId)

    expect(mockFrom).toHaveBeenCalledWith('conversation_messages')
  })

  it('should insert message with correct thread_id and user_id', async () => {
    const threadId = 'test-thread-id-123'
    const threadType = 'group'
    const userId = 'test-user-id-456'

    await sendThreadWelcomeMessage(mockSupabase, threadId, threadType, userId)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        thread_id: threadId,
        user_id: userId
      })
    )
  })

  it('should insert the correct welcome message content for group thread', async () => {
    const threadId = 'thread-1'
    const threadType = 'group'
    const userId = 'user-1'

    await sendThreadWelcomeMessage(mockSupabase, threadId, threadType, userId)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: THREAD_WELCOME_MESSAGES.group
      })
    )
  })

  it('should insert the correct welcome message content for tenant_to_managers thread', async () => {
    const threadId = 'thread-2'
    const threadType = 'tenant_to_managers'
    const userId = 'user-2'

    await sendThreadWelcomeMessage(mockSupabase, threadId, threadType, userId)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: THREAD_WELCOME_MESSAGES.tenant_to_managers
      })
    )
  })

  it('should insert the correct welcome message content for provider_to_managers thread', async () => {
    const threadId = 'thread-3'
    const threadType = 'provider_to_managers'
    const userId = 'user-3'

    await sendThreadWelcomeMessage(mockSupabase, threadId, threadType, userId)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: THREAD_WELCOME_MESSAGES.provider_to_managers
      })
    )
  })

  it('should include correct metadata with source, action, and thread_type', async () => {
    const threadId = 'thread-meta'
    const threadType = 'group'
    const userId = 'user-meta'

    await sendThreadWelcomeMessage(mockSupabase, threadId, threadType, userId)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          source: 'system',
          action: 'thread_created',
          thread_type: threadType
        }
      })
    )
  })

  it('should not throw when insert returns an error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'Database error' } })

    const threadId = 'thread-error'
    const threadType = 'group'
    const userId = 'user-error'

    // Should not throw
    await expect(
      sendThreadWelcomeMessage(mockSupabase, threadId, threadType, userId)
    ).resolves.toBeUndefined()
  })

  it('should not throw when supabase throws an exception', async () => {
    mockInsert.mockRejectedValue(new Error('Network error'))

    const threadId = 'thread-exception'
    const threadType = 'group'
    const userId = 'user-exception'

    // Should not throw - function handles errors gracefully
    await expect(
      sendThreadWelcomeMessage(mockSupabase, threadId, threadType, userId)
    ).resolves.toBeUndefined()
  })
})
