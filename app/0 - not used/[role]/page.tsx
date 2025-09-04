"use client"

import { useParams } from "next/navigation"
import { redirect } from "next/navigation"

// Import des composants de dashboard spécifiques
import AdminDashboard from "@/components/dashboards/admin-dashboard"
import GestionnaireDashboard from "@/components/dashboards/gestionnaire-dashboard"
import PrestataireDashboard from "@/components/dashboards/prestataire-dashboard"
import LocataireDashboard from "@/components/dashboards/locataire-dashboard"

const dashboardComponents = {
  admin: AdminDashboard,
  gestionnaire: GestionnaireDashboard,
  prestataire: PrestataireDashboard,
  locataire: LocataireDashboard,
}

export default function RoleDashboard() {
  const params = useParams()
  const role = params.role as string

  const DashboardComponent = dashboardComponents[role as keyof typeof dashboardComponents]

  if (!DashboardComponent) {
    redirect("/dashboard/gestionnaire")
  }

  return <DashboardComponent />
}
