import type React from "react"

/**
 * 🎯 NO-NAVBAR LAYOUT - Pages sans navigation globale (Locataire)
 *
 * Pages concernées:
 * - /locataire/interventions/nouvelle-demande
 * - /locataire/interventions/new
 * - /locataire/interventions/[id]
 */

export default function NoNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
