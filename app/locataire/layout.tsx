import type React from "react"
import { requireRole } from "@/lib/auth-dal"
import DashboardHeader from "@/components/dashboard-header"
import { LocataireLayoutClient } from "./layout-client"
import { FrillWidget } from "@/components/frill-widget"

/**
 * 🔐 LOCATAIRE LAYOUT - SERVER COMPONENT (Architecture 2025)
 *
 * Nouvelle architecture conforme aux best practices Next.js/Supabase :
 * - Authentification gérée par middleware + Server Component
 * - Plus d'AuthGuard client (redondant et source de conflits)
 * - Protection native avec requireRole() du DAL
 */

export default async function LocataireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ AUTHENTIFICATION SERVEUR: Le middleware a déjà vérifié l'auth
  // requireRole() valide en plus le rôle spécifique côté serveur
  const { user, profile } = await requireRole(['locataire'])

  // Préparer les données utilisateur pour éviter hydration mismatch
  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header centralisé avec toutes les améliorations */}
      <DashboardHeader
        role="locataire"
        userName={userName}
        userInitial={userInitial}
        userEmail={user.email || ''}
      />

      {/* Contenu principal - Padding global responsive */}
      <main className="flex-1 flex flex-col min-h-0 layout-container">
        {children}
      </main>

      {/* Client components pour interactivité */}
      <LocataireLayoutClient />

      {/* Widget Frill pour feedback utilisateur */}
      <FrillWidget />
    </div>
  )
}
