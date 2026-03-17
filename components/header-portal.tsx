"use client"

import { createPortal } from "react-dom"
import { useState, useEffect, type ReactNode } from "react"

export const HEADER_PORTAL_ID = "gestionnaire-header-portal"

/**
 * Renders children into the full-width gestionnaire header via React portal.
 * Used by GestionnaireTopbar, StepProgressHeader, and DetailPageHeader
 * to merge their content into the single top header bar.
 *
 * Retries DOM lookup briefly to handle race conditions where the portal
 * consumer mounts before GestionnaireHeader paints the target element.
 */
export function HeaderPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.getElementById(HEADER_PORTAL_ID)
    if (el) {
      setTarget(el)
      return
    }

    // Retry with requestAnimationFrame in case layout hasn't painted yet
    const raf = requestAnimationFrame(() => {
      const retryEl = document.getElementById(HEADER_PORTAL_ID)
      if (retryEl) setTarget(retryEl)
    })

    return () => cancelAnimationFrame(raf)
  }, [])

  if (!target) return null
  return createPortal(children, target)
}
