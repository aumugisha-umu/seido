'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

declare global {
  interface Window {
    _uxa?: Array<[string, ...unknown[]]>
  }
}

/**
 * Hook pour identifier l'utilisateur dans Contentsquare/Clarity
 * Permet de filtrer les sessions par role/equipe dans le dashboard analytics
 *
 * IMPORTANT - RGPD/Privacy:
 * - Ne JAMAIS envoyer de donnees PII (email, nom complet, telephone)
 * - Utiliser uniquement des identifiants anonymises (hash)
 * - Les custom variables permettent de segmenter sans identifier
 *
 * @see https://support.contentsquare.com/hc/en-us/articles/37271886552209-How-to-mask-personal-data
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useAnalyticsIdentify()
 *   return <div>...</div>
 * }
 * ```
 */
export function useAnalyticsIdentify() {
  const { user, profile } = useAuth()

  useEffect(() => {
    if (typeof window !== 'undefined' && window._uxa && user && profile) {
      // Custom Variable 1: Role utilisateur (gestionnaire, locataire, prestataire, admin)
      // Permet de filtrer les heatmaps par type d'utilisateur
      window._uxa.push(['setCustomVariable', 1, 'user_role', profile.role || 'unknown'])

      // Custom Variable 2: ID utilisateur hashe (anonymise)
      // Permet de suivre un utilisateur sans connaitre son identite
      window._uxa.push(['setCustomVariable', 2, 'user_id_hash', hashString(user.id)])

      // Custom Variable 3: Team ID hashe (pour gestionnaires)
      // Permet de segmenter par agence/equipe
      if (profile.role === 'gestionnaire' && profile.team_id) {
        window._uxa.push(['setCustomVariable', 3, 'team_id_hash', hashString(profile.team_id)])
      }
    }
  }, [user, profile])
}

/**
 * Fonction de hachage simple pour anonymiser les IDs
 * Produit un hash deterministe et court (base36)
 *
 * Note: Ce n'est PAS un hash cryptographique, juste une anonymisation
 * pour eviter de stocker des UUIDs bruts dans les analytics
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
