import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import DashboardHeader from "@/components/dashboard-header"
import { GestionnaireLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"

/**
 * 🔐 GESTIONNAIRE LAYOUT - SERVER COMPONENT (Architecture Next.js 15)
 *
 * Pattern officiel Next.js 15 + Supabase:
 * - Middleware: Token refresh + basic gatekeeper
 * - Layout: Fetches own data for UI (getServerAuthContext cached)
 * - Pages: Fetch same data independently (React.cache() deduplicates!)
 *
 * ✅ Key insight: Layouts CAN fetch data for themselves
 * ❌ But they CANNOT pass props to {children}
 * ✅ React.cache() ensures getServerAuthContext() is called once per request
 */

export default async function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Fetch data for layout UI (cached via React.cache())
  // Pages will call getServerAuthContext() too - automatically deduped!
  const { user, profile } = await getServerAuthContext('gestionnaire')

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <DashboardHeader
        role="gestionnaire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
      />

      {/* Contenu principal - Each page manages its own padding */}
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
