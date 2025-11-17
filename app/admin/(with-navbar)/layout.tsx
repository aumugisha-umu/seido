import type React from "react"
import { requireRole } from "@/lib/auth-dal"
import DashboardHeader from "@/components/dashboard-header"

/**
 * 🧭 WITH-NAVBAR LAYOUT - Pages avec navigation globale (Admin)
 */

export default async function WithNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireRole(['admin'])

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <>
      <DashboardHeader
        role="admin"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
      />
      {children}
    </>
  )
}
