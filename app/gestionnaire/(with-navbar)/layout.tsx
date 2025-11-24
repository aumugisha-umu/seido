import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import DashboardHeader from "@/components/dashboard-header"

/**
 * 🧭 WITH-NAVBAR LAYOUT - Pages avec navigation globale
 *
 * Ce layout ajoute le DashboardHeader pour les pages qui nécessitent
 * la barre de navigation principale (Dashboard, listes, etc.)
 *
 * Pages concernées:
 * - /gestionnaire/dashboard
 * - /gestionnaire/biens (liste)
 * - /gestionnaire/interventions (liste)
 * - /gestionnaire/contacts (liste)
 * - /gestionnaire/notifications
 * - /gestionnaire/parametres
 * - /gestionnaire/profile
 * - /gestionnaire/mail
 */

export default async function WithNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Fetch data for DashboardHeader (cached via React.cache())
  const { user, profile, team } = await getServerAuthContext('gestionnaire')

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader
        role="gestionnaire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
        teamId={team.id}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
