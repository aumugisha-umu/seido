import type React from "react"

/**
 * 🎯 NO-NAVBAR LAYOUT - Pages sans navigation globale (Prestataire)
 *
 * Pages concernées:
 * - /prestataire/interventions/[id]
 */

export default function NoNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
