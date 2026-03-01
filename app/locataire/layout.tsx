import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import { LocataireLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"
import { RealtimeWrapper } from "@/components/realtime-wrapper"
import { PWABannerWrapper } from "@/components/pwa/pwa-banner-wrapper"

/**
 * 🔐 LOCATAIRE LAYOUT - ROOT LAYOUT (Architecture Next.js 15 + Route Groups)
 *
 * Pattern officiel Next.js 15 + Supabase:
 * - Middleware: Token refresh + basic gatekeeper
 * - Root Layout: Auth + Global UI (FrillWidget, client hooks)
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

  return (
    <PWABannerWrapper>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Contenu principal - DashboardHeader délégué aux Route Group layouts */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* 🔄 RealtimeWrapper centralise les subscriptions Supabase Realtime */}
          <RealtimeWrapper userId={profile.id} teamId={profile.team_id}>
            {children}
          </RealtimeWrapper>
        </main>

        {/* Client components pour interactivité */}
        <LocataireLayoutClient />

        {/* Widget Frill pour feedback utilisateur */}
        <FrillWidget />
      </div>
    </PWABannerWrapper>
  )
}
