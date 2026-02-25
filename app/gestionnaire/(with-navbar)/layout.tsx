import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import GestionnaireTopbar from "@/components/gestionnaire-topbar"

/**
 * 🧭 WITH-NAVBAR LAYOUT - Topbar for list/dashboard pages
 *
 * Adds a slim topbar with page title + notifications + page actions.
 * The sidebar is provided by the parent gestionnaire/layout.tsx (persistent across all pages).
 *
 * Pages concernees:
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
  const { profile, team, sameRoleTeams } = await getServerAuthContext('gestionnaire')

  return (
    <>
      <GestionnaireTopbar
        teamId={team.id}
        userId={profile.id}
        teams={sameRoleTeams}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </>
  )
}
