"use client"

import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

// Types pour la gestion du cache
export interface CacheEntry {
  key: string
  lastFetched: number
  ttl?: number // Time to live en millisecondes
}

export interface CacheInvalidationConfig {
  // Patterns de routes qui doivent invalider le cache
  routePatterns: string[]
  // Clés de cache à invalider
  cacheKeys: string[]
  // Force refresh sur toutes les données
  forceRefresh?: boolean
}

// Enhanced Cache Manager with Phase 3 architecture
class EnhancedCacheManager {
  private static instance: EnhancedCacheManager
  private localCache: Map<string, CacheEntry> = new Map()
  private invalidationConfigs: CacheInvalidationConfig[] = []
  private refreshCallbacks: Map<string, () => void> = new Map()
  // ✅ FIX BOUCLE INFINIE: Ajout des propriétés pour éviter les appels redondants
  private lastProcessedRoute: string | null = null
  private routeChangeTimeout: NodeJS.Timeout | null = null

  static getInstance(): EnhancedCacheManager {
    if (!EnhancedCacheManager.instance) {
      EnhancedCacheManager.instance = new EnhancedCacheManager()
    }
    return EnhancedCacheManager.instance
  }

  // Enregistrer un callback de refresh pour un composant/hook
  registerRefreshCallback(key: string, callback: () => void) {
    this.refreshCallbacks.set(key, callback)
    console.log(`✅ [CACHE] Registered refresh callback for: ${key}`)
  }

  // Désregistrer un callback
  unregisterRefreshCallback(key: string) {
    this.refreshCallbacks.delete(key)
    console.log(`🗑️ [CACHE] Unregistered refresh callback for: ${key}`)
  }

  // Marquer une entrée de cache comme valide
  setCacheEntry(key: string, ttl?: number) {
    this.localCache.set(key, {
      key,
      lastFetched: Date.now(),
      ttl
    })
    console.log(`💾 [CACHE] Cache entry set for: ${key}`)
  }

  // Vérifier si une entrée de cache est valide
  isCacheValid(key: string): boolean {
    const entry = this.localCache.get(key)
    if (!entry) return false

    // Vérifier la TTL si définie
    if (entry.ttl) {
      const isExpired = Date.now() - entry.lastFetched > entry.ttl
      if (isExpired) {
        this.localCache.delete(key)
        console.log(`⏰ [CACHE] Cache expired for: ${key}`)
        return false
      }
    }

    return true
  }

  // Invalider le cache pour des clés spécifiques
  async invalidateCache(keys: string[]) {
    keys.forEach(key => {
      this.localCache.delete(key)
      console.log(`🗑️ [CACHE-LOCAL] Cache invalidated for: ${key}`)
    })

    // Invalider aussi dans le cache L1/L2
    try {
      const { cache } = await import('../lib/cache/cache-manager')
      for (const key of keys) {
        await cache.invalidate(key)
      }
    } catch (error) {
      console.warn('[CACHE] Failed to invalidate cache:', error)
    }
  }

  // Invalider tout le cache
  async invalidateAllCache() {
    this.localCache.clear()
    console.log(`🧹 [CACHE-LOCAL] All local cache invalidated`)

    // Invalider aussi dans le cache L1/L2
    try {
      const { cache } = await import('../lib/cache/cache-manager')
      await cache.invalidate('*')
    } catch (error) {
      console.warn('[CACHE] Failed to invalidate all cache:', error)
    }
  }

  // Déclencher un refresh pour des callbacks spécifiques
  async triggerRefresh(keys: string[]) {
    try {
      const { cache } = await import('../lib/cache/cache-manager')
      for (const key of keys) {
        const callback = this.refreshCallbacks.get(key)
        if (callback) {
          console.log(`🔄 [CACHE] Triggering refresh for: ${key}`)
          callback()
          // Invalider aussi dans le cache L1/L2
          await cache.invalidate(key)
        }
      }
    } catch (error) {
      console.warn('[CACHE] Failed to trigger refresh:', error)
      // Fallback: trigger callbacks without cache invalidation
      for (const key of keys) {
        const callback = this.refreshCallbacks.get(key)
        if (callback) {
          console.log(`🔄 [CACHE] Triggering refresh for: ${key} (fallback)`)
          callback()
        }
      }
    }
  }

  // Déclencher un refresh global
  async triggerGlobalRefresh() {
    console.log(`🔄 [CACHE] Triggering global refresh for ${this.refreshCallbacks.size} callbacks`)
    this.refreshCallbacks.forEach((callback, key) => {
      console.log(`🔄 [CACHE] Global refresh for: ${key}`)
      callback()
    })

    // Invalider tout le cache L1/L2
    try {
      const { cache } = await import('../lib/cache/cache-manager')
      await cache.invalidate('*')
    } catch (error) {
      console.warn('[CACHE] Failed to invalidate cache during global refresh:', error)
    }
  }

  // ✅ PHASE 3: Utiliser cache L1/L2 pour les données
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const { cache } = await import('../lib/cache/cache-manager')
      return await cache.get<T>(key)
    } catch (error) {
      console.warn('[CACHE] Failed to get cached data:', error)
      return null
    }
  }

  async setCachedData(key: string, data: unknown, ttl = 300): Promise<void> {
    try {
      const { cache } = await import('../lib/cache/cache-manager')
      await cache.set(key, data, ttl)
      // Mettre à jour le cache local pour tracking
      this.localCache.set(key, {
        key,
        lastFetched: Date.now(),
        ttl: ttl * 1000
      })
    } catch (error) {
      console.warn('[CACHE] Failed to set cached data:', error)
    }
  }

  // ✅ PHASE 3: Hook avec cache automatique
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 300
  ): Promise<T> {
    try {
      const { cache } = await import('../lib/cache/cache-manager')
      return await cache.getOrSet(key, fetcher, ttl)
    } catch (error) {
      console.warn('[CACHE] Failed to use getOrSet, fallback to direct fetch:', error)
      return await fetcher()
    }
  }

  // ✅ PHASE 3: Métriques de cache
  getCacheMetrics() {
    try {
      const { cache } = require('../lib/cache/cache-manager')
      return cache.getMetrics()
    } catch (error) {
      console.warn('[CACHE] Failed to get metrics:', error)
      return {
        l1Hits: 0,
        l1Misses: 0,
        l2Hits: 0,
        l2Misses: 0,
        totalRequests: 0,
        averageResponseTime: 0
      }
    }
  }

  getCacheStatus() {
    try {
      const { cache } = require('../lib/cache/cache-manager')
      return cache.getStatus()
    } catch (error) {
      console.warn('[CACHE] Failed to get status:', error)
      return {
        l1Size: 0,
        l1MaxSize: 500,
        l2Available: false,
        metrics: this.getCacheMetrics()
      }
    }
  }

  // Gérer l'invalidation basée sur les routes
  handleRouteChange(pathname: string) {
    console.log(`🛣️ [CACHE] Route changed to: ${pathname}`)
    
    // ✅ FIX BOUCLE INFINIE: Éviter les invalidations redondantes
    if (this.lastProcessedRoute === pathname) {
      console.log(`🔒 [CACHE] Same route as last processed, skipping invalidation`)
      return
    }
    
    this.lastProcessedRoute = pathname
    
    // ✅ FIX BOUCLE INFINIE: Ajouter un délai pour éviter les appels en rafale
    if (this.routeChangeTimeout) {
      clearTimeout(this.routeChangeTimeout)
    }
    
    this.routeChangeTimeout = setTimeout(() => {
      // Vérifier les configurations d'invalidation
      this.invalidationConfigs.forEach(config => {
        const shouldInvalidate = config.routePatterns.some(pattern => {
          // Support des wildcards basiques
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(pathname)
        })

        if (shouldInvalidate) {
          console.log(`🎯 [CACHE] Route matches pattern, invalidating cache for:`, config.cacheKeys)
          
          if (config.forceRefresh) {
            this.invalidateAllCache()
            this.triggerGlobalRefresh()
          } else {
            this.invalidateCache(config.cacheKeys)
            this.triggerRefresh(config.cacheKeys)
          }
        }
      })
      
      this.routeChangeTimeout = null
    }, 100) // Délai de 100ms pour éviter les appels en rafale
  }

  // Configurer les règles d'invalidation
  addInvalidationConfig(config: CacheInvalidationConfig) {
    this.invalidationConfigs.push(config)
    console.log(`⚙️ [CACHE] Added invalidation config:`, config)
  }
}

// Hook pour la gestion automatique du cache lors de la navigation
export function useCacheManagement() {
  const pathname = usePathname()
  const cacheManager = EnhancedCacheManager.getInstance()

  useEffect(() => {
    // ✅ FIX BOUCLE INFINIE: Simplifier les configurations d'invalidation pour éviter les conflits
    // Désormais, useNavigationRefresh gère la logique de refresh, 
    // donc on n'a plus besoin de configurations automatiques pour les routes principales
    
    const defaultConfigs: CacheInvalidationConfig[] = [
      // Garder seulement les configurations spéciales, pas les routes principales
      {
        routePatterns: ['/locataire/*', '/prestataire/*', '/admin/*'],
        cacheKeys: ['user-stats', 'user-data'],
        forceRefresh: false
      }
    ]

    // Ajouter les configurations par défaut (réduites)
    defaultConfigs.forEach(config => {
      cacheManager.addInvalidationConfig(config)
    })
  }, [])

  useEffect(() => {
    // Déclencher la gestion du cache lors du changement de route
    cacheManager.handleRouteChange(pathname)
  }, [pathname])

  return cacheManager
}

// Hook pour enregistrer un composant/hook avec le système de cache
export function useDataRefresh(key: string, refreshCallback: () => void) {
  const cacheManager = EnhancedCacheManager.getInstance()

  const memoizedCallback = useCallback(refreshCallback, [refreshCallback])

  useEffect(() => {
    // Enregistrer le callback
    cacheManager.registerRefreshCallback(key, memoizedCallback)

    // Cleanup lors du démontage
    return () => {
      cacheManager.unregisterRefreshCallback(key)
    }
  }, [key, memoizedCallback])

  // Fonctions utilitaires
  const setCacheValid = useCallback((ttl?: number) => {
    cacheManager.setCacheEntry(key, ttl)
  }, [key])

  const isCacheValid = useCallback(() => {
    return cacheManager.isCacheValid(key)
  }, [key])

  const invalidateCache = useCallback(() => {
    cacheManager.invalidateCache([key])
  }, [key])

  return {
    setCacheValid,
    isCacheValid,
    invalidateCache,
    forceRefresh: memoizedCallback
  }
}

export default EnhancedCacheManager
