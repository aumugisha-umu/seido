"use client"

import { useNavigationRefresh } from "@/hooks/use-navigation-refresh"
import { useSessionFocusRefresh } from "@/hooks/use-session-focus-refresh"

/**
 * 🎯 LOCATAIRE LAYOUT CLIENT - Fonctionnalités interactives
 *
 * Composant client séparé pour les fonctionnalités qui nécessitent
 * l'interactivité côté client (hooks, événements, etc.)
 */

export function LocataireLayoutClient() {
  // ✅ Navigation refresh hook (client-side seulement)
  useNavigationRefresh()
  // ✅ Refresh session on focus/visibility + soft refresh section
  useSessionFocusRefresh()

  return null // Pas d'UI supplémentaire pour le locataire layout
}
