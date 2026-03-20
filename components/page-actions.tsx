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
    if (el) {
      setContainer(el)
      return
    }

    // Retry: HeaderPortal needs a render cycle to inject #topbar-actions-slot
    let attempts = 0
    const maxAttempts = 10
    const interval = setInterval(() => {
      const retryEl = document.getElementById(TOPBAR_ACTIONS_SLOT_ID)
      if (retryEl || attempts >= maxAttempts) {
        clearInterval(interval)
        if (retryEl) setContainer(retryEl)
      }
      attempts++
    }, 50) // 50ms × 10 = 500ms max wait

    return () => clearInterval(interval)
  }, [])

  if (!container) return null
  return createPortal(children, container)
}

export { TOPBAR_ACTIONS_SLOT_ID }
