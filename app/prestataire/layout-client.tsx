"use client"

import { useNavigationRefresh } from "@/hooks/use-navigation-refresh"
import { useSessionFocusRefresh } from "@/hooks/use-session-focus-refresh"
import { useSessionKeepalive } from "@/hooks/use-session-keepalive"

/**
 * 🎯 PRESTATAIRE LAYOUT CLIENT - Fonctionnalités interactives
 *
 * Composant client séparé pour les fonctionnalités qui nécessitent
 * l'interactivité côté client (hooks, événements, etc.)
 */

export function PrestataireLayoutClient() {
  // ✅ Navigation refresh hook (client-side seulement)
  useNavigationRefresh()
  // ✅ Refresh session on focus/visibility + soft refresh section
  useSessionFocusRefresh()
  // ✅ Maintain session alive during user activity
  useSessionKeepalive()

  return null // Pas d'UI supplémentaire pour le prestataire layout
}
