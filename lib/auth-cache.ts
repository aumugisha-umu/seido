/**
 * 🧠 AUTH CACHE - Cache mémoire intelligent pour l'authentification
 *
 * Objectifs :
 * - Réduire les requêtes DB répétées pour les profils utilisateur
 * - Améliorer les performances d'authentification (6s → 1-2s)
 * - Éviter les race conditions lors des changements d'état
 * - Cache auto-expiring avec TTL configurable
 */

import type { AuthUser } from './auth-service'

interface CacheEntry<T> {
  data: T
  expiry: number
  timestamp: number
}

interface UserProfileCache extends CacheEntry<AuthUser> {
  authUserId: string
  email: string
}

interface PermissionCache extends CacheEntry<string[]> {
  userId: string
  role: string
}

class AuthCache {
  private userProfileCache = new Map<string, UserProfileCache>()
  private userEmailCache = new Map<string, UserProfileCache>() // Cache par email pour fallback
  private permissionCache = new Map<string, PermissionCache>()

  // Configuration TTL (Time To Live)
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes en millisecondes
  private readonly PERMISSION_TTL = 10 * 60 * 1000 // 10 minutes pour permissions (moins volatiles)

  /**
   * Stocker un profil utilisateur dans le cache
   */
  setUserProfile(authUserId: string, user: AuthUser, customTTL?: number): void {
    const ttl = customTTL || this.DEFAULT_TTL
    const entry: UserProfileCache = {
      data: user,
      expiry: Date.now() + ttl,
      timestamp: Date.now(),
      authUserId,
      email: user.email
    }

    // Stocker par auth_user_id (clé principale)
    this.userProfileCache.set(authUserId, entry)

    // Stocker aussi par email (pour fallback)
    if (user.email) {
      this.userEmailCache.set(user.email, entry)
    }

    console.log('💾 [AUTH-CACHE] User profile cached:', {
      authUserId,
      email: user.email,
      role: user.role,
      expiresIn: Math.round(ttl / 1000) + 's'
    })
  }

  /**
   * Récupérer un profil utilisateur par auth_user_id
   */
  getUserProfile(authUserId: string): AuthUser | null {
    const entry = this.userProfileCache.get(authUserId)

    if (!entry) {
      console.log('🔍 [AUTH-CACHE] No cache entry for auth_user_id:', authUserId)
      return null
    }

    if (Date.now() > entry.expiry) {
      console.log('⏰ [AUTH-CACHE] Cache expired for auth_user_id:', authUserId)
      this.userProfileCache.delete(authUserId)
      if (entry.email) {
        this.userEmailCache.delete(entry.email)
      }
      return null
    }

    console.log('✅ [AUTH-CACHE] Cache hit for auth_user_id:', {
      authUserId,
      email: entry.email,
      role: entry.data.role,
      ageMs: Date.now() - entry.timestamp
    })

    return entry.data
  }

  /**
   * Récupérer un profil utilisateur par email (fallback)
   */
  getUserProfileByEmail(email: string): AuthUser | null {
    const entry = this.userEmailCache.get(email)

    if (!entry) {
      console.log('🔍 [AUTH-CACHE] No cache entry for email:', email)
      return null
    }

    if (Date.now() > entry.expiry) {
      console.log('⏰ [AUTH-CACHE] Cache expired for email:', email)
      this.userEmailCache.delete(email)
      this.userProfileCache.delete(entry.authUserId)
      return null
    }

    console.log('✅ [AUTH-CACHE] Cache hit for email:', {
      email,
      authUserId: entry.authUserId,
      role: entry.data.role,
      ageMs: Date.now() - entry.timestamp
    })

    return entry.data
  }

  /**
   * Invalider le cache d'un utilisateur
   */
  invalidateUser(authUserId: string): void {
    const entry = this.userProfileCache.get(authUserId)

    if (entry) {
      this.userProfileCache.delete(authUserId)
      if (entry.email) {
        this.userEmailCache.delete(entry.email)
      }
      console.log('🗑️ [AUTH-CACHE] User cache invalidated:', authUserId)
    }
  }

  /**
   * Invalider tout le cache (logout, erreur critique)
   */
  invalidateAll(): void {
    const userCount = this.userProfileCache.size
    const permissionCount = this.permissionCache.size

    this.userProfileCache.clear()
    this.userEmailCache.clear()
    this.permissionCache.clear()

    console.log('🗑️ [AUTH-CACHE] All caches cleared:', {
      userProfiles: userCount,
      permissions: permissionCount
    })
  }

  /**
   * Nettoyer automatiquement les entrées expirées
   */
  cleanup(): void {
    const now = Date.now()
    let cleanedUsers = 0
    let cleanedPermissions = 0

    // Nettoyer profiles utilisateur
    for (const [key, entry] of this.userProfileCache.entries()) {
      if (now > entry.expiry) {
        this.userProfileCache.delete(key)
        if (entry.email) {
          this.userEmailCache.delete(entry.email)
        }
        cleanedUsers++
      }
    }

    // Nettoyer permissions
    for (const [key, entry] of this.permissionCache.entries()) {
      if (now > entry.expiry) {
        this.permissionCache.delete(key)
        cleanedPermissions++
      }
    }

    if (cleanedUsers > 0 || cleanedPermissions > 0) {
      console.log('🧹 [AUTH-CACHE] Cleanup completed:', {
        expiredUsers: cleanedUsers,
        expiredPermissions: cleanedPermissions,
        remainingUsers: this.userProfileCache.size,
        remainingPermissions: this.permissionCache.size
      })
    }
  }

  /**
   * Obtenir les statistiques du cache (pour debugging)
   */
  getStats(): {
    userProfiles: { total: number; fresh: number; expired: number }
    permissions: { total: number; fresh: number; expired: number }
    memoryUsage: string
  } {
    const now = Date.now()

    let freshUsers = 0
    let expiredUsers = 0
    for (const entry of this.userProfileCache.values()) {
      if (now > entry.expiry) {
        expiredUsers++
      } else {
        freshUsers++
      }
    }

    let freshPermissions = 0
    let expiredPermissions = 0
    for (const entry of this.permissionCache.values()) {
      if (now > entry.expiry) {
        expiredPermissions++
      } else {
        freshPermissions++
      }
    }

    // Estimation mémoire grossière
    const avgUserSize = 500 // bytes approximatifs par utilisateur
    const avgPermSize = 100 // bytes approximatifs par permission
    const totalBytes = (this.userProfileCache.size * avgUserSize) + (this.permissionCache.size * avgPermSize)
    const memoryUsage = totalBytes > 1024 ? `${Math.round(totalBytes / 1024)}KB` : `${totalBytes}B`

    return {
      userProfiles: {
        total: this.userProfileCache.size,
        fresh: freshUsers,
        expired: expiredUsers
      },
      permissions: {
        total: this.permissionCache.size,
        fresh: freshPermissions,
        expired: expiredPermissions
      },
      memoryUsage
    }
  }

  /**
   * Stocker des permissions dans le cache
   */
  setPermissions(userId: string, role: string, permissions: string[], customTTL?: number): void {
    const ttl = customTTL || this.PERMISSION_TTL
    const entry: PermissionCache = {
      data: permissions,
      expiry: Date.now() + ttl,
      timestamp: Date.now(),
      userId,
      role
    }

    this.permissionCache.set(userId, entry)

    console.log('💾 [AUTH-CACHE] Permissions cached:', {
      userId,
      role,
      permissionCount: permissions.length,
      expiresIn: Math.round(ttl / 1000) + 's'
    })
  }

  /**
   * Récupérer des permissions depuis le cache
   */
  getPermissions(userId: string): string[] | null {
    const entry = this.permissionCache.get(userId)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiry) {
      this.permissionCache.delete(userId)
      return null
    }

    return entry.data
  }
}

// Singleton instance
export const authCache = new AuthCache()

// Auto-cleanup toutes les 2 minutes
setInterval(() => {
  authCache.cleanup()
}, 2 * 60 * 1000)

// Export des utilitaires pour debugging
export const debugAuthCache = () => {
  const stats = authCache.getStats()
  console.log('📊 [AUTH-CACHE] Current stats:', stats)
  return stats
}