"use client"

import { useCallback } from "react"
import { teamService, statsService } from "@/lib/database-service"

/**
 * Hook pour gérer les caches de l'application
 * Utile pour nettoyer les caches après des opérations importantes
 */
export function useCacheManagement() {
  
  // Nettoyer le cache des équipes pour un utilisateur spécifique
  const clearUserTeamsCache = useCallback((userId?: string) => {
    console.log("🧹 Clearing teams cache for user:", userId || "all")
    teamService.clearTeamsCache(userId)
  }, [])

  // Nettoyer le cache des stats pour un utilisateur spécifique  
  const clearUserStatsCache = useCallback((userId?: string) => {
    console.log("🧹 Clearing stats cache for user:", userId || "all")
    statsService.clearStatsCache(userId)
  }, [])

  // Nettoyer tous les caches d'un utilisateur
  const clearAllUserCaches = useCallback((userId?: string) => {
    console.log("🧹 Clearing all caches for user:", userId || "all")
    clearUserTeamsCache(userId)
    clearUserStatsCache(userId)
  }, [clearUserTeamsCache, clearUserStatsCache])

  // Nettoyer tous les caches de l'application
  const clearAllCaches = useCallback(() => {
    console.log("🧹 Clearing all application caches")
    teamService.clearTeamsCache()
    statsService.clearStatsCache()
  }, [])

  return {
    clearUserTeamsCache,
    clearUserStatsCache,
    clearAllUserCaches,
    clearAllCaches
  }
}

/**
 * Hook pour nettoyer automatiquement les caches après certaines actions
 */
export function useAutoCache() {
  const { clearAllUserCaches } = useCacheManagement()

  // À appeler après création/modification d'équipe
  const invalidateAfterTeamChange = useCallback((userId: string) => {
    console.log("♻️ Auto-invalidating caches after team change")
    clearAllUserCaches(userId)
  }, [clearAllUserCaches])

  // À appeler après création/modification de bâtiment/lot
  const invalidateAfterDataChange = useCallback((userId: string) => {
    console.log("♻️ Auto-invalidating stats cache after data change")  
    statsService.clearStatsCache(userId)
  }, [])

  return {
    invalidateAfterTeamChange,
    invalidateAfterDataChange
  }
}
