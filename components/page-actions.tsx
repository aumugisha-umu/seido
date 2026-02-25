"use client"

import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

const TOPBAR_ACTIONS_SLOT_ID = "topbar-actions-slot"

/**
 * Portal component that renders its children into the topbar's actions slot.
 * Pages use this to inject their action buttons (Importer, + Ajouter, etc.)
 * into the topbar, keeping page content clean.
 *
 * Usage:
 * ```tsx
 * <PageActions>
 *   <Button>Importer</Button>
 *   <Button>+ Nouveau</Button>
 * </PageActions>
 * ```
 */
export function PageActions({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.getElementById(TOPBAR_ACTIONS_SLOT_ID)
    if (el) setContainer(el)
  }, [])

  if (!container) return null
  return createPortal(children, container)
}

export { TOPBAR_ACTIONS_SLOT_ID }
