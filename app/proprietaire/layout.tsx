import type React from "react"
import { getServerAuthContext } from "@/lib/server-context"
import DashboardHeader from "@/components/dashboard-header"


/**
 * 🔐 PROPRIETAIRE LAYOUT - SERVER COMPONENT
 *
 * Architecture conforme aux best practices Next.js/Supabase :
 * - Authentification gérée par middleware + Server Component
 * - Protection native avec requireRole() du DAL
 */

export default async function ProprietaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ AUTHENTIFICATION SERVEUR
  const { user, profile } = await getServerAuthContext('proprietaire')

  // Préparer les données utilisateur pour éviter hydration mismatch
  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header centralisé */}
      <DashboardHeader
        role="proprietaire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
      />

      {/* Contenu principal - Padding global responsive */}
      <main className="layout-container">
        {children}
      </main>
    </div>
  )
}
