"use client"

import { useNavigationRefresh } from "@/hooks/use-navigation-refresh"
import { GlobalLoadingIndicator } from "@/components/global-loading-indicator"
import { EmergencyDebugButton } from "@/components/debug/emergency-debug-button"

/**
 * 🎯 GESTIONNAIRE LAYOUT CLIENT - Fonctionnalités interactives
 *
 * Composant client séparé pour les fonctionnalités qui nécessitent
 * l'interactivité côté client (hooks, événements, etc.)
 */

export function GestionnaireLayoutClient() {
  // ✅ Navigation refresh hook (client-side seulement)
  useNavigationRefresh()

  return (
    <>
      {/* ✅ Indicateur de chargement global lors des navigations */}
      <GlobalLoadingIndicator />

      {/* ✅ Bouton d'urgence pour le debug (toujours présent) */}
      <EmergencyDebugButton />
    </>
  )
}
