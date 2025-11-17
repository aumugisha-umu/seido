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
    <>
      <DashboardHeader
        role="locataire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
      />
      {children}
    </>
  )
}
