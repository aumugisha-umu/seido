/**
 * Tests pour les utilitaires d'authentification
 * Valide que la correction du préfixe JWT fonctionne correctement
 */

import { describe, it, expect, vi } from 'vitest'
import {
  getValidAuthUserId,
  isJwtOnlyUser,
  migrateLegacyUserId
} from './auth-utils'
import type { AuthUser } from './auth-service'

describe('Auth Utils - JWT Prefix Fix', () => {
  describe('getValidAuthUserId', () => {
    it('should return null for null user', () => {
      expect(getValidAuthUserId(null)).toBeNull()
    })

    it('should extract auth_user_id from JWT-prefixed ID (legacy support)', () => {
      const user: AuthUser = {
        id: 'jwt_abc123-def456-ghi789',
        email: 'test@example.com',
        name: 'Test User',
        role: 'gestionnaire'
      }

      const result = getValidAuthUserId(user)
      expect(result).toBe('abc123-def456-ghi789')
    })

    it('should return original ID if no JWT prefix', () => {
      const user: AuthUser = {
        id: 'user123-456-789',
        email: 'test@example.com',
        name: 'Test User',
        role: 'gestionnaire'
      }

      const result = getValidAuthUserId(user)
      expect(result).toBe('user123-456-789')
    })
  })

  describe('isJwtOnlyUser', () => {
    it('should return false for null user', () => {
      expect(isJwtOnlyUser(null)).toBe(false)
    })

    it('should return true for JWT-prefixed user (legacy)', () => {
      const user: AuthUser = {
        id: 'jwt_abc123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'gestionnaire'
      }

      expect(isJwtOnlyUser(user)).toBe(true)
    })

    it('should return false for normal user', () => {
      const user: AuthUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'gestionnaire'
      }

      expect(isJwtOnlyUser(user)).toBe(false)
    })
  })

  describe('migrateLegacyUserId', () => {
    it('should remove jwt_ prefix from legacy IDs', () => {
      const legacyId = 'jwt_legacy123'
      const result = migrateLegacyUserId(legacyId)
      expect(result).toBe('legacy123')
    })

    it('should return ID unchanged if no jwt_ prefix', () => {
      const normalId = 'user456'
      const result = migrateLegacyUserId(normalId)
      expect(result).toBe('user456')
    })

    it('should log warning for legacy JWT IDs', () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      migrateLegacyUserId('jwt_test')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Legacy JWT ID detected')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Role-specific validation', () => {
    const roles = ['admin', 'gestionnaire', 'prestataire', 'locataire'] as const

    roles.forEach(role => {
      it(`should handle ${role} user correctly`, () => {
        const user: AuthUser = {
          id: `${role}-user-456`,
          email: `${role}@example.com`,
          name: `Test ${role}`,
          role: role as any
        }

        const authUserId = getValidAuthUserId(user)
        expect(authUserId).toBe(`${role}-user-456`)
        expect(isJwtOnlyUser(user)).toBe(false)
      })
    })
  })
})
