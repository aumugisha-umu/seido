import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import { LocataireLayoutClient } from "./layout-client"

import { RealtimeWrapper } from "@/components/realtime-wrapper"
import { PWABannerWrapper } from "@/components/pwa/pwa-banner-wrapper"
import { SubscriptionBanners } from "@/components/billing/subscription-banners"
import { getCachedSubscriptionInfo } from "@/lib/subscription-cache"

/**
 * 🔐 LOCATAIRE LAYOUT - ROOT LAYOUT (Architecture Next.js 15 + Route Groups)
 *
 * Pattern officiel Next.js 15 + Supabase:
 * - Middleware: Token refresh + basic gatekeeper
 * - Root Layout: Auth + Global UI (client hooks)
 * - Route Group Layouts: DashboardHeader conditionnel
 *   - (with-navbar): Avec DashboardHeader
 *   - (no-navbar): Sans DashboardHeader (pages gèrent leur propre header)
 *
 * ✅ RealtimeWrapper fournit le contexte Realtime centralisé
 * ✅ getServerAuthContext (cache()) — child pages reuse the cached result
 */

export default async function LocataireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getServerAuthContext('locataire')

  // Fetch team subscription status (for blocked banner)
  let subscriptionInfo = null
  try {
    subscriptionInfo = await getCachedSubscriptionInfo(profile.team_id)
  } catch {
    // Silently fail — banner just won't show
  }

  return (
    <PWABannerWrapper>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Subscription blocked banner (neutral gray for locataire) */}
        {subscriptionInfo?.is_read_only && (
          <div className="flex-shrink-0 z-50">
            <SubscriptionBanners subscriptionInfo={subscriptionInfo} role="locataire" />
          </div>
        )}
        {/* Contenu principal - DashboardHeader délégué aux Route Group layouts */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* 🔄 RealtimeWrapper centralise les subscriptions Supabase Realtime */}
          <RealtimeWrapper userId={profile.id} teamId={profile.team_id}>
            {children}
          </RealtimeWrapper>
        </main>

        {/* Client components pour interactivité */}
        <LocataireLayoutClient />
      </div>
    </PWABannerWrapper>
  )
}
