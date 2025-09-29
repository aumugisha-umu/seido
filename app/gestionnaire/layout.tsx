"use client"

import type React from "react"
import DashboardHeader from "@/components/dashboard-header"
import AuthGuard from "@/components/auth-guard"
import { useNavigationRefresh } from "@/hooks/use-navigation-refresh"
import { GlobalLoadingIndicator } from "@/components/global-loading-indicator"

export default function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ NOUVEAU: Initialiser le système de refresh automatique lors de la navigation
  useNavigationRefresh()

  return (
    <AuthGuard requiredRole="gestionnaire">
      <div className="min-h-screen bg-gray-50">
        {/* Header centralisé avec toutes les améliorations */}
        <DashboardHeader role="gestionnaire" />
        
        {/* Contenu principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
        
        {/* ✅ NOUVEAU: Indicateur de chargement global lors des navigations */}
        <GlobalLoadingIndicator />
        
      </div>
    </AuthGuard>
  )
}
