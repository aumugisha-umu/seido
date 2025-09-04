"use client"

import type React from "react"
import DashboardHeader from "@/components/dashboard-header"

export default function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header centralisé avec toutes les améliorations */}
      <DashboardHeader role="gestionnaire" />
      
      {/* Contenu principal */}
      <main className="p-6">{children}</main>
    </div>
  )
}
