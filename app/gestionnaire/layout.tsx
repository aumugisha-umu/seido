import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import DashboardHeader from "@/components/dashboard-header"
import { GestionnaireLayoutClient } from "./layout-client"

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
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        role="gestionnaire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
      />

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Client components pour interactivité */}
      <GestionnaireLayoutClient />
    </div>
  )
}
