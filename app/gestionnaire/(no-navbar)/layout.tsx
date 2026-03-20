import type React from "react"

/**
 * 🎯 NO-NAVBAR LAYOUT - Pages sans navigation globale
 *
 * Ce layout minimal est utilisé pour les pages qui gèrent leur propre
 * header (création, détails, modification) et ne nécessitent pas la
 * barre de navigation principale.
 *
 * Pages concernées:
 * - /gestionnaire/operations/nouvelle-intervention
 * - /gestionnaire/interventions/[id]
 * - /gestionnaire/biens/immeubles/nouveau
 * - /gestionnaire/biens/immeubles/modifier/[id]
 * - /gestionnaire/biens/immeubles/[id]
 * - /gestionnaire/biens/lots/nouveau
 * - /gestionnaire/biens/lots/modifier/[id]
 * - /gestionnaire/biens/lots/[id]
 * - /gestionnaire/contacts/nouveau
 * - /gestionnaire/contacts/modifier/[id]
 * - /gestionnaire/contacts/details/[id]
 *
 * Ces pages utilisent leurs propres composants de header:
 * - DetailPageHeader (pour les pages de détails)
 * - StepProgressHeader (pour les pages de création multi-étapes)
 */

export default function NoNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layout transparent - les pages gèrent leur propre UI
  return <>{children}</>
}
