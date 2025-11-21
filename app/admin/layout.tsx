import type React from "react"
import { requireRole } from "@/lib/auth-dal"
import { AdminLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"

/**
 * 🔐 ADMIN LAYOUT - ROOT LAYOUT (Architecture Next.js 15 + Route Groups)
 *
 * Pattern officiel Next.js 15 + Supabase:
 * - Middleware: Token refresh + basic gatekeeper
 * - Root Layout: Auth + Global UI (FrillWidget, client hooks)
 * - Route Group Layouts: DashboardHeader conditionnel
 *   - (with-navbar): Avec DashboardHeader
 *   - (no-navbar): Sans DashboardHeader (pages gèrent leur propre header)
 */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Authentification commune à toutes les pages
  await requireRole(['admin'])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contenu principal - DashboardHeader délégué aux Route Group layouts */}
      <main className="layout-container">
        {children}
      </main>

      {/* Client components pour interactivité */}
      <AdminLayoutClient />

      {/* Widget Frill pour feedback utilisateur */}
      <FrillWidget />
    </div>
  )
}
