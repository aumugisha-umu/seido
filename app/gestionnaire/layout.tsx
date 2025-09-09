"use client"

import type React from "react"
import DashboardHeader from "@/components/dashboard-header"
import AuthGuard from "@/components/auth-guard"

export default function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requiredRole="gestionnaire">
      <div className="min-h-screen bg-gray-50">
        {/* Header centralisé avec toutes les améliorations */}
        <DashboardHeader role="gestionnaire" />
        
        {/* Contenu principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>
    </AuthGuard>
  )
}
