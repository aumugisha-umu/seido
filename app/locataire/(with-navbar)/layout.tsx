import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import DashboardHeader from "@/components/dashboard-header"

/**
 * 🧭 WITH-NAVBAR LAYOUT - Pages avec navigation globale (Locataire)
 *
 * ✅ MULTI-ÉQUIPE (Jan 2026): Utilise getServerAuthContext pour accéder à sameRoleTeams
 */

export default async function WithNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, team, sameRoleTeams } = await getServerAuthContext('locataire')

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader
        role="locataire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
        teamId={team.id}
        userId={profile.id}
        avatarUrl={profile.avatar_url || undefined}
        teams={sameRoleTeams}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
