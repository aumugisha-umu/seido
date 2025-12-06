import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import { GestionnaireLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"
import { RealtimeWrapper } from "@/components/realtime-wrapper"

/**
 * 🔐 GESTIONNAIRE LAYOUT - ROOT LAYOUT (Architecture Next.js 15 + Route Groups)
 *
 * Pattern officiel Next.js 15 + Supabase:
 * - Middleware: Token refresh + basic gatekeeper
 * - Root Layout: Auth + Global UI (FrillWidget, client hooks)
 * - Route Group Layouts: DashboardHeader conditionnel
 *   - (with-navbar): Avec DashboardHeader
 *   - (no-navbar): Sans DashboardHeader (pages gèrent leur propre header)
 *
 * ✅ Key insight: Route Groups permettent des layouts différents pour différentes sections
 * ✅ URLs inchangées (parenthèses ignorées par Next.js)
 * ✅ React.cache() ensures getServerAuthContext() is called once per request
 * ✅ RealtimeWrapper fournit le contexte Realtime centralisé à toute l'application
 */

export default async function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Authentification commune à toutes les pages
  // (cached via React.cache() - partagé avec layouts enfants et pages)
  const { profile, team } = await getServerAuthContext('gestionnaire')

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {/* 🌈 Ambient Gradient Background - Dark mode only */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-0 dark:opacity-100 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Contenu principal - DashboardHeader délégué aux Route Group layouts */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto relative z-10">
        {/* 🔄 RealtimeWrapper centralise les subscriptions Supabase Realtime */}
        <RealtimeWrapper userId={profile.id} teamId={team?.id}>
          {children}
        </RealtimeWrapper>
      </main>

      {/* Client components pour interactivité */}
      <GestionnaireLayoutClient />

      {/* Widget Frill pour feedback utilisateur */}
      <FrillWidget />
    </div>
  )
}
