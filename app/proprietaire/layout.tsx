import type React from "react"
import { requireRole } from "@/lib/auth-dal"
import DashboardHeader from "@/components/dashboard-header"
import { FrillWidget } from "@/components/frill-widget"

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
  const { user, profile } = await requireRole(['proprietaire'])

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

      {/* Widget Frill pour feedback utilisateur */}
      <FrillWidget />
    </div>
  )
}
