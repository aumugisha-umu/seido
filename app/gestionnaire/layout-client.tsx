"use client"

import { useNavigationRefresh } from "@/hooks/use-navigation-refresh"
import { GlobalLoadingIndicator } from "@/components/global-loading-indicator"
import { useSessionFocusRefresh } from "@/hooks/use-session-focus-refresh"
import { useSessionKeepalive } from "@/hooks/use-session-keepalive"

/**
 * 🎯 GESTIONNAIRE LAYOUT CLIENT - Fonctionnalités interactives
 *
 * Composant client séparé pour les fonctionnalités qui nécessitent
 * l'interactivité côté client (hooks, événements, etc.)
 */

export function GestionnaireLayoutClient() {
  // ✅ Navigation refresh hook (client-side seulement)
  // DISABLED: This was causing slow page loads by triggering server re-renders on every navigation
  // useNavigationRefresh()
  // ✅ Refresh session on focus/visibility + soft refresh section
  // DISABLED: This was causing slow page loads by triggering server re-renders on tab focus
  // useSessionFocusRefresh()
  // ✅ Maintain session alive during user activity
  useSessionKeepalive()

  return (
    <>
      {/* ✅ Indicateur de chargement global lors des navigations */}
      <GlobalLoadingIndicator />
    </>
  )
}
