"use client"

import type React from "react"
import TenantHeader from "@/components/tenant-header"
import AuthGuard from "@/components/auth-guard"
import { useNavigationRefresh } from "@/hooks/use-navigation-refresh"

export default function LocataireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ NOUVEAU: Initialiser le système de refresh automatique lors de la navigation
  useNavigationRefresh()

  return (
    <AuthGuard requiredRole="locataire">
      <div className="min-h-screen bg-slate-50">
        {/* Header spécialisé pour les locataires */}
        <TenantHeader />
        
        {/* Contenu principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>
    </AuthGuard>
  )
}
