import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import { GestionnaireLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"

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
 */

export default async function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Authentification commune à toutes les pages
  // (cached via React.cache() - partagé avec layouts enfants et pages)
  await getServerAuthContext('gestionnaire')

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Contenu principal - DashboardHeader délégué aux Route Group layouts */}
      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>

      {/* Client components pour interactivité */}
      <GestionnaireLayoutClient />

      {/* Widget Frill pour feedback utilisateur */}
      <FrillWidget />
    </div>
  )
}
