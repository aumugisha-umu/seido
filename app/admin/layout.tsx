import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import { AdminLayoutClient } from "./layout-client"

import { PWABannerWrapper } from "@/components/pwa/pwa-banner-wrapper"

/**
 * 🔐 ADMIN LAYOUT - ROOT LAYOUT (Architecture Next.js 15 + Route Groups)
 *
 * Pattern officiel Next.js 15 + Supabase:
 * - Middleware: Token refresh + basic gatekeeper
 * - Root Layout: Auth + Global UI (client hooks)
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
  await getServerAuthContext('admin')

  return (
    <PWABannerWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Contenu principal - DashboardHeader délégué aux Route Group layouts */}
        <main className="layout-container">
          {children}
        </main>

        {/* Client components pour interactivité */}
        <AdminLayoutClient />
      </div>
    </PWABannerWrapper>
  )
}
