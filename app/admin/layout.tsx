"use client"

import type React from "react"
import DashboardHeader from "@/components/dashboard-header"
import AuthGuard from "@/components/auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header centralisé avec toutes les améliorations */}
        <DashboardHeader role="admin" />
        
        {/* Contenu principal */}
        <main className="p-6">{children}</main>
      </div>
    </AuthGuard>
  )
}
