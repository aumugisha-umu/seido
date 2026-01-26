import type React from "react"
import { requireRole } from "@/lib/auth-dal"
import DashboardHeader from "@/components/dashboard-header"

/**
 * 🧭 WITH-NAVBAR LAYOUT - Pages avec navigation globale (Locataire)
 */

export default async function WithNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireRole(['locataire'])

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader
        role="locataire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
        userId={profile.id}
        avatarUrl={profile.avatar_url || undefined}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
