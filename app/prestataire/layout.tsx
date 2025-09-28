import type React from "react"
import { requireRole } from "@/lib/dal"
import DashboardHeader from "@/components/dashboard-header"
import { PrestataireLayoutClient } from "./layout-client"

/**
 * 🔐 PRESTATAIRE LAYOUT - SERVER COMPONENT (Architecture 2025)
 *
 * Nouvelle architecture conforme aux best practices Next.js/Supabase :
 * - Authentification gérée par middleware + Server Component
 * - Plus d'AuthGuard client (redondant et source de conflits)
 * - Protection native avec requireRole() du DAL
 */

export default async function PrestataireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ AUTHENTIFICATION SERVEUR: Le middleware a déjà vérifié l'auth
  // requireRole() valide en plus le rôle spécifique côté serveur
  await requireRole('prestataire')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header centralisé avec toutes les améliorations */}
      <DashboardHeader role="prestataire" />

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Client components pour interactivité */}
      <PrestataireLayoutClient />
    </div>
  )
}
