import type React from "react"
import { requireRole } from "@/lib/dal"
import TenantHeader from "@/components/tenant-header"
import { LocataireLayoutClient } from "./layout-client"

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
  const user = await requireRole('locataire')

  // Préparer les données utilisateur pour éviter hydration mismatch
  const userName = user.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header spécialisé pour les locataires */}
      <TenantHeader
        userName={userName}
        userInitials={userInitials}
        userEmail={user.email || ''}
      />

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Client components pour interactivité */}
      <LocataireLayoutClient />
    </div>
  )
}
