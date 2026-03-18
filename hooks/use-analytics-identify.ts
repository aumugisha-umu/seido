'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Clarity from '@microsoft/clarity'
import { useAuth } from '@/hooks/use-auth'
import { useSubscription } from '@/hooks/use-subscription'

/**
 * Hook pour identifier l'utilisateur et envoyer des custom tags a Microsoft Clarity
 * Permet de filtrer les sessions par role/subscription dans le dashboard analytics
 *
 * IMPORTANT - RGPD/Privacy:
 * - Ne JAMAIS envoyer de donnees PII (email, nom complet, telephone)
 * - Utiliser uniquement des identifiants anonymises (hash)
 * - Les custom tags permettent de segmenter sans identifier personnellement
 *
 * Custom tags envoyes:
 * - user_role: gestionnaire | prestataire | locataire | admin
 * - subscription_status: trialing | active | past_due | paused | read_only | free
 * - subscription_plan: starter | pro | enterprise | free
 *
 * @see https://learn.microsoft.com/en-us/clarity/setup-and-installation/identify-api
 * @see https://learn.microsoft.com/en-us/clarity/filters/custom-tags
 */
export function useAnalyticsIdentify() {
  const { user, profile } = useAuth()
  const { status: subscription } = useSubscription()
  const pathname = usePathname()

  useEffect(() => {
    if (!user || !profile) return

    // Identify user with hashed ID — called per page for SPA tracking
    Clarity.identify(hashString(user.id))

    // Custom tag: user role
    Clarity.setTag('user_role', profile.role || 'unknown')

    // Custom tag: subscription status (if available)
    if (subscription) {
      Clarity.setTag('subscription_status', subscription.status || 'free')
      if (subscription.plan) {
        Clarity.setTag('subscription_plan', subscription.plan)
      }
    }
  }, [user, profile, subscription, pathname])
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
