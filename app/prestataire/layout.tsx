"use client"

import type React from "react"
import DashboardHeader from "@/components/dashboard-header"
import AuthGuard from "@/components/auth-guard"

export default function PrestataireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requiredRole="prestataire">
      <div className="min-h-screen bg-gray-50">
        {/* Header centralisé avec toutes les améliorations */}
        <DashboardHeader role="prestataire" />
        
        {/* Contenu principal */}
        <main className="p-6">{children}</main>
      </div>
    </AuthGuard>
  )
}
