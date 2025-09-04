"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  const getCurrentRole = () => {
    const pathSegments = pathname.split("/")
    const roleIndex = pathSegments.indexOf("dashboard") + 1
    const role = pathSegments[roleIndex]

    // Valid roles: admin, gestionnaire, prestataire, locataire
    const validRoles = ["admin", "gestionnaire", "prestataire", "locataire"]
    return validRoles.includes(role) ? role : "gestionnaire"
  }

  const currentRole = getCurrentRole()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader role={currentRole} />
      {children}
    </div>
  )
}
