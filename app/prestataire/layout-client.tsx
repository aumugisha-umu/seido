"use client"

import { useNavigationRefresh } from "@/hooks/use-navigation-refresh"

/**
 * 🎯 PRESTATAIRE LAYOUT CLIENT - Fonctionnalités interactives
 *
 * Composant client séparé pour les fonctionnalités qui nécessitent
 * l'interactivité côté client (hooks, événements, etc.)
 */

export function PrestataireLayoutClient() {
  // ✅ Navigation refresh hook (client-side seulement)
  useNavigationRefresh()

  return null // Pas d'UI supplémentaire pour le prestataire layout
}
