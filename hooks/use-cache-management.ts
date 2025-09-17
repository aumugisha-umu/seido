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

// Gestionnaire de cache global
class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheEntry> = new Map()
  private invalidationConfigs: CacheInvalidationConfig[] = []
  private refreshCallbacks: Map<string, () => void> = new Map()
  // ✅ FIX BOUCLE INFINIE: Ajout des propriétés pour éviter les appels redondants
  private lastProcessedRoute: string | null = null
  private routeChangeTimeout: NodeJS.Timeout | null = null

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
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
    this.cache.set(key, {
      key,
      lastFetched: Date.now(),
      ttl
    })
    console.log(`💾 [CACHE] Cache entry set for: ${key}`)
  }

  // Vérifier si une entrée de cache est valide
  isCacheValid(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Vérifier la TTL si définie
    if (entry.ttl) {
      const isExpired = Date.now() - entry.lastFetched > entry.ttl
      if (isExpired) {
        this.cache.delete(key)
        console.log(`⏰ [CACHE] Cache expired for: ${key}`)
        return false
      }
    }

    return true
  }

  // Invalider le cache pour des clés spécifiques
  invalidateCache(keys: string[]) {
    keys.forEach(key => {
      this.cache.delete(key)
      console.log(`🗑️ [CACHE] Cache invalidated for: ${key}`)
    })
  }

  // Invalider tout le cache
  invalidateAllCache() {
    this.cache.clear()
    console.log(`🧹 [CACHE] All cache invalidated`)
  }

  // Déclencher un refresh pour des callbacks spécifiques
  triggerRefresh(keys: string[]) {
    keys.forEach(key => {
      const callback = this.refreshCallbacks.get(key)
      if (callback) {
        console.log(`🔄 [CACHE] Triggering refresh for: ${key}`)
        callback()
      }
    })
  }

  // Déclencher un refresh global
  triggerGlobalRefresh() {
    console.log(`🔄 [CACHE] Triggering global refresh for ${this.refreshCallbacks.size} callbacks`)
    this.refreshCallbacks.forEach((callback, key) => {
      console.log(`🔄 [CACHE] Global refresh for: ${key}`)
      callback()
    })
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
  const cacheManager = CacheManager.getInstance()

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
  const cacheManager = CacheManager.getInstance()

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

export default CacheManager