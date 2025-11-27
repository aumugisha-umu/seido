import type React from "react"
import { requireRole } from "@/lib/auth-dal"
import { LocataireLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"

/**
 * 🔐 LOCATAIRE LAYOUT - ROOT LAYOUT (Architecture Next.js 15 + Route Groups)
 *
 * Pattern officiel Next.js 15 + Supabase:
 * - Middleware: Token refresh + basic gatekeeper
 * - Root Layout: Auth + Global UI (FrillWidget, client hooks)
 * - Route Group Layouts: DashboardHeader conditionnel
 *   - (with-navbar): Avec DashboardHeader
 *   - (no-navbar): Sans DashboardHeader (pages gèrent leur propre header)
 */

export default async function LocataireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Authentification commune à toutes les pages
  await requireRole(['locataire'])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Contenu principal - DashboardHeader délégué aux Route Group layouts */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {children}
      </main>

      {/* Client components pour interactivité */}
      <LocataireLayoutClient />

      {/* Widget Frill pour feedback utilisateur */}
      <FrillWidget />
    </div>
  )
}
