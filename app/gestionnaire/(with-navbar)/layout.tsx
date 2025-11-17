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
  const { user, profile } = await getServerAuthContext('gestionnaire')

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <>
      <DashboardHeader
        role="gestionnaire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
      />
      {children}
    </>
  )
}
